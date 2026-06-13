import { Request, Response } from 'express';
import { lmstudioApi } from '../services/lmstudioApi';

export class ModelController {
  async getModels(req: Request, res: Response) {
    try {
      const models = await lmstudioApi.getModels();
      res.json(models);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch models' });
    }
  }

  async checkConnection(req: Request, res: Response) {
    try {
      const connected = await lmstudioApi.isConnected();
      res.json({ connected });
    } catch (error) {
      res.json({ connected: false });
    }
  }

  // 测试指定 URL 的连接（由设置页调用，绕过浏览器 CORS）
  async testConnection(req: Request, res: Response) {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ connected: false, error: '缺少 URL' });
    }
    try {
      const oldUrl = (lmstudioApi as any).client.defaults.baseURL;
      lmstudioApi.setBaseUrl(url.trim());
      const connected = await lmstudioApi.isConnected();
      // 恢复旧 URL
      lmstudioApi.setBaseUrl(oldUrl);
      res.json({ connected });
    } catch {
      res.json({ connected: false });
    }
  }
}

export const modelController = new ModelController();