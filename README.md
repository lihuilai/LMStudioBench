# LM Studio 游戏生成测试平台

使用 **mise** 管理项目开发环境，自动配置 Node.js、npm 镜像等依赖。

## 🚀 快速开始

### 1. 安装 mise（如果还没有）

```bash
# Windows (PowerShell)
irm https://mise.run | iex
```

### 2. 安装项目依赖

```bash
# 进入项目目录
cd c:\Users\lihuilai\Documents\LMStudioBench

# 安装 Node.js 和 Bun（由 mise.toml 配置）
mise install

# 安装 npm 依赖
mise run install
```

### 3. 启动开发服务器

打开两个终端分别运行：

**终端1 - 后端：**
```bash
mise run dev-backend
```

**终端2 - 前端：**
```bash
mise run dev-frontend
```

访问 `http://localhost:5173` 查看前端界面。

## ⚙️ mise 配置说明

### 镜像配置

项目已配置国内镜像加速：

| 工具 | 镜像地址 | 配置方式 |
|:---|:---|:---|
| Node.js 下载 | `https://npmmirror.com/mirrors/node/` | `settings.node.mirror_url` |
| npm 包 | `https://registry.npmmirror.com/` | `env.npm_config_registry` |

### 常用命令

```bash
# 查看当前工具版本
mise current

# 检查项目环境
mise run doctor

# 安装依赖
mise run install

# 构建项目
mise run build

# 清理
mise run clean        # 清理 node_modules 和构建产物
mise run clean-cache  # 清理 npm 缓存
```

### 切换镜像

如果需要更换镜像源，编辑 `mise.toml`：

```toml
[env]
# 切换回官方镜像
npm_config_registry = "https://registry.npmjs.org/"

# 或使用其他镜像
npm_config_registry = "https://mirrors.tencent.com/npm/"   # 腾讯云
npm_config_registry = "https://repo.huaweicloud.com/repository/npm/"  # 华为云
```

## 📋 项目结构

```
LMStudioBench/
├── mise.toml          # mise 配置（工具版本、镜像、任务）
├── backend/            # 后端服务（Express + TypeScript）
├── frontend/           # 前端应用（React + Vite）
├── games/             # 生成的游戏文件
└── prompts/           # 提示词模板
```

## 🔧 手动激活 mise（可选）

如果想在终端直接使用 `node`、`npm` 等命令，需要将 mise 添加到 shell：

```powershell
# PowerShell
echo 'mise activate pwsh | Out-String | Invoke-Expression' >> $PROFILE
```

之后重新打开终端即可直接使用 `node --version` 等命令。
