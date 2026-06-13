# LM Studio API 自动化测试系统 - 实现计划

## 一、需求分析

### 核心功能需求

| 序号 | 功能模块 | 功能描述 | 优先级 |
|:---:|:---|:---|:---:|
| 1 | LM Studio API 连接 | 连接本地LM Studio服务器，发送提示词请求 | 高 |
| 2 | 批量提示词管理 | 支持导入、管理多个提示词模板 | 高 |
| 3 | 多模型测试 | 支持选择不同模型进行测试 | 高 |
| 4 | HTML游戏生成 | 根据提示词生成HTML游戏代码 | 高 |
| 5 | 自动化测试 | 自动运行生成的HTML文件检查是否报错 | 高 |
| 6 | 错误自动修复 | 检测到报错时自动尝试修复 | 中 |
| 7 | 测试结果报告 | 展示测试结果和日志 | 高 |

### 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                    前端界面 (React)                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐    │
│  │ 提示词管理  │ │ 模型选择    │ │ 测试结果面板        │    │
│  └──────┬──────┘ └──────┬──────┘ └──────────┬──────────┘    │
└─────────┼────────────────┼──────────────────┼───────────────┘
          │                │                  │
          ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    后端服务 (Node.js)                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐    │
│  │ API连接模块 │ │ 代码生成模块│ │ 测试执行模块        │    │
│  │ (LM Studio)│ │ (生成HTML)  │ │ (运行检查/修复)     │    │
│  └─────────────┘ └─────────────┘ └─────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
          │                │                  │
          ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    本地LM Studio Server                      │
└─────────────────────────────────────────────────────────────┘
```

## 二、项目结构

```
LMStudioBench/
├── frontend/                    # 前端React应用
│   ├── src/
│   │   ├── components/          # 组件目录
│   │   │   ├── PromptManager.tsx    # 提示词管理组件
│   │   │   ├── ModelSelector.tsx    # 模型选择组件
│   │   │   ├── TestResults.tsx      # 测试结果组件
│   │   │   └── GamePreview.tsx      # 游戏预览组件
│   │   ├── services/            # API服务
│   │   │   └── api.ts              # 后端API调用
│   │   ├── types/               # 类型定义
│   │   │   └── index.ts            # 共享类型
│   │   ├── App.tsx              # 主应用
│   │   └── main.tsx             # 入口文件
│   ├── package.json
│   └── vite.config.ts
├── backend/                     # 后端Node.js服务
│   ├── src/
│   │   ├── controllers/         # 控制器
│   │   │   ├── promptController.ts  # 提示词管理
│   │   │   ├── modelController.ts   # 模型管理
│   │   │   └── testController.ts    # 测试执行
│   │   ├── services/            # 服务层
│   │   │   ├── lmstudioApi.ts       # LM Studio API连接
│   │   │   ├── codeGenerator.ts     # 代码生成
│   │   │   └── testRunner.ts        # 测试运行器
│   │   ├── routes/              # 路由
│   │   │   └── api.ts               # API路由
│   │   ├── types/               # 类型定义
│   │   │   └── index.ts            # 共享类型
│   │   └── server.ts            # 服务器入口
│   ├── package.json
│   └── tsconfig.json
├── games/                       # 生成的游戏文件存放目录
├── prompts/                     # 提示词模板目录
│   └── templates.json           # 提示词模板文件
└── README.md
```

## 三、核心模块设计

### 3.1 LM Studio API 服务

**功能说明**：连接LM Studio本地服务器，发送提示词并获取响应

**接口设计**：
| 方法 | 路径 | 功能 |
|:---:|:---|:---|
| GET | /api/models | 获取可用模型列表 |
| POST | /api/generate | 发送提示词生成代码 |

**核心代码逻辑**：
```typescript
// 连接LM Studio API
async function connectLMStudio(baseUrl: string)
// 获取模型列表
async function getModels(): Promise<Model[]>
// 发送提示词请求
async function generateCode(prompt: string, model: string): Promise<string>
```

### 3.2 提示词管理模块

**功能说明**：管理批量提示词模板，支持导入/导出

**数据结构**：
```typescript
interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  createdAt: Date;
}
```

**接口设计**：
| 方法 | 路径 | 功能 |
|:---:|:---|:---|
| GET | /api/prompts | 获取所有提示词 |
| POST | /api/prompts | 添加新提示词 |
| PUT | /api/prompts/:id | 更新提示词 |
| DELETE | /api/prompts/:id | 删除提示词 |

### 3.3 测试执行模块

**功能说明**：自动运行生成的HTML文件，检查错误并尝试修复

**核心流程**：
1. 生成HTML文件到games目录
2. 使用Puppeteer启动浏览器打开HTML
3. 捕获控制台错误和网络请求错误
4. 如果检测到错误，分析错误信息
5. 发送修复请求到LM Studio
6. 重新生成代码并验证

**接口设计**：
| 方法 | 路径 | 功能 |
|:---:|:---|:---|
| POST | /api/test/run | 执行单个测试 |
| POST | /api/test/batch | 批量执行测试 |
| GET | /api/test/results | 获取测试结果 |

**错误修复流程**：
```
生成HTML → 运行测试 → 检测错误 → 分析错误 → 生成修复提示词 → 重新生成 → 验证修复
```

## 四、部署与运行

### 4.1 环境要求

| 依赖 | 版本 | 说明 |
|:---|:---|:---|
| Node.js | >= 20.x | 运行时环境 |
| LM Studio | >= 0.2.x | 本地LLM服务器 |
| Puppeteer | >= 22.x | 自动化测试 |

### 4.2 启动步骤

1. **启动LM Studio**
   ```bash
   lmstudio start --api-port 1234
   ```

2. **启动后端服务**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. **启动前端应用**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 五、安全考虑

1. **本地访问限制**：API仅允许本地访问，防止外部调用
2. **输入验证**：对用户输入的提示词进行安全过滤
3. **文件权限**：限制生成文件的目录和权限
4. **资源清理**：定期清理过期的测试文件

## 六、风险评估

| 风险点 | 风险等级 | 应对措施 |
|:---|:---:|:---|
| LM Studio服务不可用 | 高 | 添加连接重试机制和错误提示 |
| 生成代码包含恶意内容 | 中 | 代码内容安全检查，沙箱隔离 |
| 测试过程超时 | 中 | 设置合理的超时时间和取消机制 |
| 错误修复失败 | 低 | 记录失败原因，人工介入处理 |

## 七、下一步计划

1. 创建项目目录结构
2. 实现后端API服务
3. 实现前端界面
4. 集成测试功能
5. 优化错误修复逻辑