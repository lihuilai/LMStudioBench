import axios from 'axios';
import { Model, PromptTemplate, TestResult, TaskProgress } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 分钟超时，给批量测试留足时间
});

export const modelApi = {
  getModels: async (): Promise<Model[]> => {
    const response = await api.get('/models');
    return response.data;
  },
  checkConnection: async (): Promise<boolean> => {
    const response = await api.get('/models/check');
    return response.data.connected;
  },
  testConnection: async (url: string): Promise<boolean> => {
    const response = await api.post('/models/test-connection', { url });
    return response.data.connected;
  },
};

export const promptApi = {
  getAllPrompts: async (): Promise<PromptTemplate[]> => {
    const response = await api.get('/prompts');
    return response.data;
  },
  getPromptById: async (id: string): Promise<PromptTemplate> => {
    const response = await api.get(`/prompts/${id}`);
    return response.data;
  },
  createPrompt: async (data: { name: string; content: string; category?: string }): Promise<PromptTemplate> => {
    const response = await api.post('/prompts', data);
    return response.data;
  },
  updatePrompt: async (id: string, data: { name?: string; content?: string; category?: string }): Promise<PromptTemplate> => {
    const response = await api.put(`/prompts/${id}`, data);
    return response.data;
  },
  deletePrompt: async (id: string): Promise<void> => {
    await api.delete(`/prompts/${id}`);
  },
};

export const testApi = {
  runTest: async (promptId: string, modelId: string): Promise<TestResult> => {
    const response = await api.post('/test/run', { promptId, modelId });
    return response.data;
  },
  // 批量测试：触发后不等待结果，结果通过 SSE 推送
  batchTest: async (promptIds: string[], modelIds: string[]): Promise<void> => {
    await api.post('/test/batch', { promptIds, modelIds }, { timeout: 10000 });
  },
  getResults: async (): Promise<TestResult[]> => {
    const response = await api.get('/test/results');
    return response.data;
  },
  getResultById: async (id: string): Promise<TestResult> => {
    const response = await api.get(`/test/results/${id}`);
    return response.data;
  },
  // SSE 订阅进度更新
  subscribeProgress: (onProgress: (progress: TaskProgress) => void): (() => void) => {
    const eventSource = new EventSource(`${API_BASE_URL}/test/progress`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
          onProgress(data as TaskProgress);
        }
      } catch (e) {
        console.error('解析进度事件失败:', e);
      }
    };

    eventSource.onerror = () => {
      console.warn('SSE 连接断开，正在重连...');
    };

    return () => {
      eventSource.close();
    };
  },
};

export const settingsApi = {
  getSettings: async (): Promise<{ lmStudioUrl: string }> => {
    const response = await api.get('/settings');
    return response.data;
  },
  updateSettings: async (settings: { lmStudioUrl: string }): Promise<void> => {
    await api.put('/settings', settings);
  },
};

export const testControlApi = {
  cancelTest: async (): Promise<void> => {
    await api.post('/test/cancel');
  },
  clearResults: async (): Promise<void> => {
    await api.delete('/test/results');
  },
};
