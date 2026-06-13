# UI 改进计划

## 需求分析

1. **底部操作区移到顶部** - 将已选模型和提示词、操作按钮从 footer 移到 header 下方
2. **实时预览生成代码** - 在 CodePreview 中增加 iframe 实时预览功能
3. **模型搜索功能** - 在 ModelSelector 中添加搜索框
4. **提示词搜索功能** - 在 PromptManager 中添加搜索框

## 修改文件

### 1. `frontend/src/App.tsx`
- 将 footer 中的已选项和操作按钮移到 main-content 上方
- 新增顶部操作栏（ActionBar）组件或内联实现
- footer 只保留版权信息或删除

### 2. `frontend/src/App.css` 或 `frontend/src/index.css`
- 新增顶部操作栏样式
- 修改布局，移除 footer 固定定位
- 调整 main-content 的间距

### 3. `frontend/src/components/ModelSelector.tsx`
- 添加搜索框 state 和输入框
- 根据搜索词过滤 models 列表
- 添加搜索框样式

### 4. `frontend/src/components/PromptManager.tsx`
- 添加搜索框 state 和输入框
- 根据搜索词过滤 prompts 列表（搜索名称和分类）
- 添加搜索框样式

### 5. `frontend/src/components/CodePreview.tsx`
- 新增 iframe 实时预览功能
- 添加「预览」和「代码」切换 tab
- iframe 中渲染 generatedCode 或 fixedCode
- 调整布局，代码和预览并排或上下切换

## 实现步骤

1. 修改 `App.tsx` - 移动操作栏到顶部
2. 修改 `index.css` - 更新布局样式
3. 修改 `ModelSelector.tsx` - 添加搜索
4. 修改 `PromptManager.tsx` - 添加搜索
5. 修改 `CodePreview.tsx` - 添加实时预览
6. 测试所有功能

## 风险评估

- 低风险：纯 UI 改动，不影响后端 API
- 注意：实时预览需要确保 HTML 代码安全（仅本地运行）
