import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { lmstudioApi } from '../services/lmstudioApi';

interface Settings {
  lmStudioUrl: string;
}

const DEFAULT_SETTINGS: Settings = { lmStudioUrl: 'http://127.0.0.1:1234' };
const SETTINGS_PATH = path.join(__dirname, '../../../settings.json');

export class SettingsController {
  // 加载设置
  private loadSettings(): Settings {
    try {
      if (fs.existsSync(SETTINGS_PATH)) {
        const data = fs.readFileSync(SETTINGS_PATH, 'utf-8');
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch { /* ignore */ }
    return { ...DEFAULT_SETTINGS };
  }

  // 保存设置
  private saveSettings(settings: Settings): void {
    try {
      const dir = path.dirname(SETTINGS_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    } catch (err) {
      console.error('保存设置失败:', err);
    }
  }

  // GET /api/settings
  async getSettings(req: Request, res: Response) {
    const settings = this.loadSettings();
    res.json(settings);
  }

  // PUT /api/settings
  async updateSettings(req: Request, res: Response) {
    const { lmStudioUrl } = req.body;
    if (!lmStudioUrl || typeof lmStudioUrl !== 'string') {
      return res.status(400).json({ error: 'lmStudioUrl 不能为空' });
    }

    const settings: Settings = { lmStudioUrl: lmStudioUrl.trim() };
    this.saveSettings(settings);

    // 更新 LM Studio API 的 baseUrl
    lmstudioApi.setBaseUrl(settings.lmStudioUrl);

    res.json({ message: '设置已保存', settings });
  }

  // 初始化设置（启动时调用）
  initialize(): void {
    const settings = this.loadSettings();
    lmstudioApi.setBaseUrl(settings.lmStudioUrl);
    console.log(`LM Studio API 地址: ${settings.lmStudioUrl}`);
  }
}

export const settingsController = new SettingsController();
