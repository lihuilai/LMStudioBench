import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { lmstudioApi } from '../services/lmstudioApi';
import { codeGenerator } from '../services/codeGenerator';
import { testRunner } from '../services/testRunner';
import { TestResult, TestError, TaskProgress, TokenStats } from '../types';

class TestController {
  testResults: TestResult[] = [];
  private progressClients: Response[] = [];
  private resultsPath: string;

  constructor() {
    this.resultsPath = path.join(__dirname, '../../../results/test-results.json');
    this.loadResults();
  }

  private loadResults(): void {
    try {
      if (fs.existsSync(this.resultsPath)) {
        const data = fs.readFileSync(this.resultsPath, 'utf-8');
        this.testResults = JSON.parse(data);
      }
    } catch (err) {
      console.error('加载历史测试结果失败:', err);
    }
  }

  private saveResults(): void {
    try {
      const dir = path.dirname(this.resultsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.resultsPath, JSON.stringify(this.testResults, null, 2));
    } catch (err) {
      console.error('保存测试结果失败:', err);
    }
  }

  // SSE: 客户端订阅进度事件
  subscribeProgress(req: Request, res: Response) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write('data: {"type":"connected"}\n\n');

    this.progressClients.push(res);

    req.on('close', () => {
      this.progressClients = this.progressClients.filter(c => c !== res);
    });
  }

  // 向所有 SSE 客户端广播进度（轻量，不含完整代码）
  private broadcastProgress(progress: TaskProgress) {
    const data = JSON.stringify({ type: 'progress', ...progress });
    this.progressClients = this.progressClients.filter(client => {
      try {
        client.write(`data: ${data}\n\n`);
        return true;
      } catch {
        // 客户端已断开，移除
        return false;
      }
    });
  }

  private createProgress(
    taskId: string,
    promptName: string,
    modelName: string,
    status: TaskProgress['status'],
    progress: number,
    currentStep: string,
    tokenStats?: TokenStats,
  ): TaskProgress {
    return { taskId, promptName, modelName, status, progress, currentStep, tokenStats };
  }

  // 取消所有正在运行的测试
  cancelTest(): void {
    this.testResults.forEach(r => {
      if (r.status === 'running') {
        r.status = 'failed';
        r.errors = [{ type: 'runtime', message: '用户取消了测试' }];
        r.completedAt = new Date().toISOString();
      }
    });
    this.saveResults();

    // 广播取消状态给所有 SSE 客户端
    this.testResults
      .filter(r => r.status === 'failed' && r.errors.some(e => e.message === '用户取消了测试'))
      .forEach(r => {
        const progress: TaskProgress = {
          taskId: r.id,
          promptName: r.promptName,
          modelName: r.modelName,
          status: 'failed',
          progress: 100,
          currentStep: '已取消',
        };
        this.broadcastProgress(progress);
      });
  }

  async runTest(req: Request, res: Response) {
    const { promptId, modelId } = req.body;

    const promptController = require('./promptController').promptController;
    const modelController = require('./modelController').modelController;

    const prompt = promptController.prompts.find((p: any) => p.id === promptId);
    const models = await lmstudioApi.getModels();
    const model = models.find((m: any) => m.id === modelId);

    if (!prompt || !model) {
      const errProgress: TaskProgress = {
        taskId: Date.now().toString(),
        promptName: prompt?.name || '未知',
        modelName: model?.name || modelId,
        status: 'failed',
        progress: 100,
        currentStep: '任务失败：未找到提示词或模型',
      };
      this.broadcastProgress(errProgress);
      return res.status(404).json({ error: 'Prompt or model not found' });
    }

    const taskId = Date.now().toString();
    const progress = this.createProgress(taskId, prompt.name, model.name, 'running', 0, '正在生成代码...');
    this.broadcastProgress(progress);

    const testResult: TestResult = {
      id: taskId,
      promptId: prompt.id,
      promptName: prompt.name,
      modelId: model.id,
      modelName: model.name,
      status: 'running',
      errors: [],
      generatedCode: '',
      fixedCode: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
      fixAttempts: 0,
    };

    this.testResults.push(testResult);

    const startTime = Date.now();
      let executionTime = 0;

    try {
      // Step1: 代码生成（5%）
      progress.currentStep = '正在生成代码...';
      progress.progress = 5;
      this.broadcastProgress(progress);

      const genResult = await lmstudioApi.generateCodeWithStats(prompt.content, model.id, startTime);
      testResult.generatedCode = genResult.code;
      testResult.tokenStats = genResult.tokenStats;

      // 检查是否已取消
      if (testResult.status !== 'running') {
        progress.status = 'failed';
        progress.currentStep = '已取消';
        progress.progress = 100;
        this.broadcastProgress(progress);
        this.saveResults();
        return res.json(testResult);
      }

      progress.currentStep = '代码生成完成';
      progress.progress = 30;
      progress.tokenStats = genResult.tokenStats;
      this.broadcastProgress(progress);

      const filename = codeGenerator.generateFileName(prompt.name, model.name);
      const filePath = codeGenerator.saveHtmlFile(testResult.generatedCode, filename);

      // Step2: 运行测试（35%）
      progress.currentStep = '正在运行代码测试...';
      progress.progress = 35;
      this.broadcastProgress(progress);

      const errors = await testRunner.runTest(filePath);

      if (errors.length > 0) {
        testResult.errors = errors;
        testResult.status = 'failed';

        progress.currentStep = '检测到错误，正在自动修复...';
        progress.progress = 45;
        this.broadcastProgress(progress);

        const fixedCode = await this.attemptFix(testResult.generatedCode, errors, testResult, progress);
        if (fixedCode) {
          testResult.fixedCode = fixedCode;
          const fixedFileName = `fixed-${filename}`;
          codeGenerator.saveHtmlFile(fixedCode, fixedFileName);

          progress.currentStep = '正在验证修复结果...';
          progress.progress = 85;
          this.broadcastProgress(progress);

          const fixedErrors = await testRunner.runTest(codeGenerator.saveHtmlFile(fixedCode, fixedFileName));
          if (fixedErrors.length === 0) {
            testResult.status = 'fixed';
            testResult.errors = [];
          }
        }
      } else {
        testResult.status = 'success';
      }
    } catch (error: any) {
      testResult.errors = [{ type: 'runtime', message: error.message }];
      testResult.status = 'failed';
      progress.currentStep = `失败：${error.message}`;
      progress.progress = 100;
      progress.status = 'failed';
      this.broadcastProgress(progress);
    }

    // Step4: 完成（100%）
    testResult.completedAt = new Date().toISOString();
    
    // 计算总执行时间
    const totalExecutionTime = (Date.now() - startTime) / 1000;
    if (testResult.tokenStats) {
      testResult.tokenStats.executionTime = totalExecutionTime;
    }
    
    this.saveResults(); // 保存结果（只调用一次）

    progress.status = testResult.status;
    progress.progress = 100;
    progress.currentStep = `测试${testResult.status === 'success' ? '成功' : testResult.status === 'fixed' ? '已修复' : '失败'}`;
    this.broadcastProgress(progress); // 确保最终状态一定广播

    res.json(testResult);
  }

  private async attemptFix(
    originalCode: string,
    errors: TestError[],
    testResult: TestResult,
    progress: TaskProgress,
  ): Promise<string | null> {
    const modelId = testResult.modelId;
    const maxAttempts = 3;
    let currentCode = originalCode;

    for (let i = 0; i < maxAttempts; i++) {
      testResult.fixAttempts++;

      const errorMessages = errors.map(e => `[${e.type}] ${e.message}`);

      progress.currentStep = `第 ${i + 1} 次修复尝试...`;
      progress.progress = 45 + (i + 1) * 13;
      this.broadcastProgress(progress);

      try {
        currentCode = await lmstudioApi.fixCode(currentCode, errorMessages, modelId);
        progress.currentStep = `验证第 ${i + 1} 次修复...`;
        this.broadcastProgress(progress);

        const tempFile = `C:\\Users\\lihuilai\\Documents\\LMStudioBench\\games\\fix-${Date.now()}.html`;
        codeGenerator.saveHtmlFile(currentCode, tempFile);
        const newErrors = await testRunner.runTest(tempFile);
        if (newErrors.length === 0) {
          return currentCode;
        }
        errors = newErrors;
      } catch {
        continue;
      }
    }

    return null;
  }

  async batchTest(req: Request, res: Response) {
    const { promptIds, modelIds } = req.body;

    if (!promptIds?.length || !modelIds?.length) {
      return res.status(400).json({ error: '请提供提示词和模型ID列表' });
    }

    // 立即返回，任务在后台异步执行
    res.json({ message: '测试已启动', total: promptIds.length * modelIds.length });

    // 后台异步执行所有测试
    const promptController = require('./promptController').promptController;
    const prompts = promptController.prompts.filter((p: any) => promptIds.includes(p.id));
    const models = await lmstudioApi.getModels();
    const selectedModels = models.filter((m: any) => modelIds.includes(m.id));

    for (const prompt of prompts) {
      for (const model of selectedModels) {
        const singleReq = { body: { promptId: prompt.id, modelId: model.id } } as Request;
        const fakeRes = {
          json: () => {},
          status: () => fakeRes,
        } as any;

        this.runTest(singleReq, fakeRes).catch(err => {
          console.error(`测试 ${prompt.name}/${model.name} 失败:`, err.message);
        });
      }
    }
  }

  getResults(req: Request, res: Response) {
    res.json(this.testResults);
  }

  getResultById(req: Request, res: Response) {
    const result = this.testResults.find(r => r.id === req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }
    res.json(result);
  }

  clearResults(req: Request, res: Response) {
    this.testResults = [];
    this.saveResults();
    res.json({ message: '已清空所有测试结果' });
  }
}

export const testController = new TestController();
