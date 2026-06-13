import axios, { AxiosInstance } from 'axios';
import { Model, TokenStats } from '../types';

interface GenerateResult {
  code: string;
  tokenStats: TokenStats;
}

class LMStudioApi {
  private client: AxiosInstance;

  constructor(baseUrl: string = 'http://127.0.0.1:1234') {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 3600000, // 1 小时超时，LM Studio 生成可能较慢
    });
  }

  // 动态设置 baseUrl
  setBaseUrl(url: string): void {
    this.client.defaults.baseURL = url;
  }

  getBaseUrl(): string {
    return this.client.defaults.baseURL || 'http://localhost:1234';
  }

  async getModels(): Promise<Model[]> {
    try {
      const response = await this.client.get('/v1/models');
      const data = response.data.data || [];
      return data.map((model: any) => ({
        id: model.id,
        name: model.id,
        description: model.id,
        size: '',
        version: '',
      }));
    } catch (error) {
      console.error('Failed to fetch models:', error);
      return [];
    }
  }

  async generateCode(prompt: string, model: string): Promise<string> {
    const result = await this.generateCodeWithStats(prompt, model);
    return result.code;
  }

  async generateCodeWithStats(prompt: string, model: string, startTime?: number): Promise<GenerateResult> {
    const t0 = startTime || Date.now();

    const response = await this.client.post('/v1/chat/completions', {
      model: model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的HTML游戏开发者。请根据用户的需求生成完整的HTML游戏代码，确保代码可以直接运行。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 8000,
    });

    const elapsed = (Date.now() - t0) / 1000;
    const content = response.data.choices[0]?.message?.content || '';
    const match = content.match(/```html\s*([\s\S]*?)\s*```/);
    const code = match ? match[1].trim() : content.trim();

    // 解析 token 统计
    const usage = response.data.usage || {};
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || 0;
    const tokensPerSecond = elapsed > 0 ? Math.round(completionTokens / elapsed) : 0;

    // 尝试获取 context 信息（部分 LM Studio 版本支持）
    const contextLength = usage.context_length || usage.total_tokens || totalTokens;
    const contextLimit = usage.context_limit || 8192;

    const tokenStats: TokenStats = {
      promptTokens,
      completionTokens,
      totalTokens,
      tokensPerSecond,
      contextLength,
      contextLimit,
      executionTime: elapsed, // 执行时间（秒）
    };

    return { code, tokenStats };
  }

  async fixCode(originalCode: string, errors: string[], model: string): Promise<string> {
    const errorDescription = errors.join('\n');
    const fixPrompt = `以下是一段HTML游戏代码和运行时错误，请修复这些错误：

代码：
\`\`\`html
${originalCode}
\`\`\`

错误：
${errorDescription}

请提供修复后的完整HTML代码，确保代码可以直接运行。`;

    try {
      const response = await this.client.post('/v1/chat/completions', {
        model: model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的代码修复专家。请分析错误并提供完整的修复代码。只返回修复后的HTML代码，不要添加额外解释。',
          },
          {
            role: 'user',
            content: fixPrompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 8000,
      });

      const content = response.data.choices[0]?.message?.content || '';
      // 提取 HTML 代码块
      const match = content.match(/```html\s*([\s\S]*?)\s*```/);
      return match ? match[1].trim() : content.trim();
    } catch (error: any) {
      console.error('Failed to fix code:', error.response?.data || error.message);
      throw new Error(`代码修复失败: ${error.response?.data?.error || error.message}`);
    }
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.client.get('/v1/models');
      return true;
    } catch {
      return false;
    }
  }
}

export const lmstudioApi = new LMStudioApi();
