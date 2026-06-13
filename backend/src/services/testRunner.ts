import puppeteer, { Browser, Page } from 'puppeteer';
import { TestError } from '../types';

export class TestRunner {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        protocolTimeout: 60000, // 浏览器协议超时时间（毫秒）
      });
    }
  }

  async runTest(htmlPath: string): Promise<TestError[]> {
    const errors: TestError[] = [];
    
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push({
          type: 'console',
          message: msg.text(),
        });
      }
    });

    page.on('pageerror', (err) => {
      errors.push({
        type: 'runtime',
        message: err.message,
        stack: err.stack,
      });
    });

    page.on('requestfailed', (request) => {
      errors.push({
        type: 'network',
        message: `Failed to load resource: ${request.url()}`,
      });
    });

    try {
      await page.goto(`file://${htmlPath}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000, // 增加页面加载超时时间
      });
      
      // 等待页面渲染完成：给 JS 执行时间，最多 3 秒
      // 不适用 networkidle0 以避免动画/定时器导致永不空闲
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (err: any) {
      errors.push({
        type: 'runtime',
        message: err.message,
      });
    } finally {
      await page.close().catch(() => {});
    }

    return errors;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async validateCode(htmlCode: string): Promise<{ valid: boolean; errors: string[] }> {
    const tempPath = `C:\\Users\\lihuilai\\Documents\\LMStudioBench\\games\\temp-${Date.now()}.html`;
    const fs = require('fs');
    
    fs.writeFileSync(tempPath, htmlCode);
    
    try {
      const errors = await this.runTest(tempPath);
      return {
        valid: errors.length === 0,
        errors: errors.map(e => e.message),
      };
    } finally {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }
}

export const testRunner = new TestRunner();