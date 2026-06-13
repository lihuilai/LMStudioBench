export interface Model {
  id: string;
  name: string;
  description: string;
  size: string;
  version: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  createdAt: string;
}

export interface TokenStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  tokensPerSecond?: number;
  contextLength?: number;
  contextLimit?: number;
  executionTime?: number; // 执行时间（秒）
}

export interface TestError {
  type: 'console' | 'network' | 'runtime';
  message: string;
  line?: number;
  column?: number;
  stack?: string;
}

export interface TestResult {
  id: string;
  promptId: string;
  promptName: string;
  modelId: string;
  modelName: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'fixed';
  errors: TestError[];
  generatedCode: string;
  fixedCode: string | null;
  createdAt: string;
  completedAt: string | null;
  fixAttempts: number;
  tokenStats?: TokenStats;
}

export interface TaskProgress {
  taskId: string;
  promptName: string;
  modelName: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'fixed';
  progress: number;
  currentStep: string;
  tokenStats?: TokenStats;
  result?: TestResult;
}
