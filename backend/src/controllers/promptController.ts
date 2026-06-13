import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { PromptTemplate } from '../types';

export class PromptController {
  private promptsPath: string;
  private prompts: PromptTemplate[] = [];

  constructor() {
    this.promptsPath = path.join(__dirname, '../../../prompts/templates.json');
    this.loadPrompts();
  }

  private loadPrompts(): void {
    try {
      if (fs.existsSync(this.promptsPath)) {
        const data = fs.readFileSync(this.promptsPath, 'utf-8');
        this.prompts = JSON.parse(data);
      } else {
        this.prompts = this.getDefaultPrompts();
        this.savePrompts();
      }
    } catch {
      this.prompts = this.getDefaultPrompts();
    }
  }

  private savePrompts(): void {
    const dir = path.dirname(this.promptsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.promptsPath, JSON.stringify(this.prompts, null, 2));
  }

  private getDefaultPrompts(): PromptTemplate[] {
    return [
      {
        id: '1',
        name: '贪吃蛇游戏',
        content: '请创建一个经典的贪吃蛇游戏，使用HTML、CSS和JavaScript实现。游戏需要包含：\n1. 游戏画布\n2. 蛇的移动控制（方向键）\n3. 食物生成\n4. 得分系统\n5. 游戏结束检测',
        category: '经典游戏',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        name: '俄罗斯方块',
        content: '请创建一个俄罗斯方块游戏，使用HTML、CSS和JavaScript实现。游戏需要包含：\n1. 游戏区域\n2. 7种不同形状的方块\n3. 方块旋转和移动\n4. 行消除和得分\n5. 游戏等级系统',
        category: '经典游戏',
        createdAt: new Date().toISOString(),
      },
      {
        id: '3',
        name: '打砖块游戏',
        content: '请创建一个打砖块游戏，使用HTML、CSS和JavaScript实现。游戏需要包含：\n1. 游戏画布\n2. 可控制的挡板\n3. 反弹的球\n4. 砖块布局\n5. 得分和关卡系统',
        category: '经典游戏',
        createdAt: new Date().toISOString(),
      },
      {
        id: '4',
        name: '记忆翻牌游戏',
        content: '请创建一个记忆翻牌游戏，使用HTML、CSS和JavaScript实现。游戏需要包含：\n1. 卡片网格布局\n2. 卡片翻转动画\n3. 配对检测\n4. 计时功能\n5. 得分系统',
        category: '益智游戏',
        createdAt: new Date().toISOString(),
      },
      {
        id: '5',
        name: '2048游戏',
        content: '请创建一个2048游戏，使用HTML、CSS和JavaScript实现。游戏需要包含：\n1. 4x4网格\n2. 键盘控制（方向键）\n3. 数字合并逻辑\n4. 得分系统\n5. 游戏胜利/失败检测',
        category: '益智游戏',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  async getAllPrompts(req: Request, res: Response) {
    res.json(this.prompts);
  }

  async getPromptById(req: Request, res: Response) {
    const { id } = req.params;
    const prompt = this.prompts.find(p => p.id === id);
    if (prompt) {
      res.json(prompt);
    } else {
      res.status(404).json({ error: 'Prompt not found' });
    }
  }

  async createPrompt(req: Request, res: Response) {
    const { name, content, category } = req.body;
    const newPrompt: PromptTemplate = {
      id: Date.now().toString(),
      name,
      content,
      category: category || '未分类',
      createdAt: new Date().toISOString(),
    };
    this.prompts.push(newPrompt);
    this.savePrompts();
    res.status(201).json(newPrompt);
  }

  async updatePrompt(req: Request, res: Response) {
    const { id } = req.params;
    const { name, content, category } = req.body;
    const index = this.prompts.findIndex(p => p.id === id);
    if (index !== -1) {
      this.prompts[index] = {
        ...this.prompts[index],
        name,
        content,
        category: category || this.prompts[index].category,
      };
      this.savePrompts();
      res.json(this.prompts[index]);
    } else {
      res.status(404).json({ error: 'Prompt not found' });
    }
  }

  async deletePrompt(req: Request, res: Response) {
    const { id } = req.params;
    const index = this.prompts.findIndex(p => p.id === id);
    if (index !== -1) {
      this.prompts.splice(index, 1);
      this.savePrompts();
      res.json({ message: 'Prompt deleted' });
    } else {
      res.status(404).json({ error: 'Prompt not found' });
    }
  }
}

export const promptController = new PromptController();