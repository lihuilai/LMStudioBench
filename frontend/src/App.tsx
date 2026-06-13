import { useState, useEffect, useRef, useCallback } from 'react';
import { ModelSelector } from './components/ModelSelector';
import { PromptManager } from './components/PromptManager';
import { TestResults } from './components/TestResults';
import { CodePreview } from './components/CodePreview';
import { TaskProgressPanel } from './components/TaskProgress';
import { SettingsModal } from './components/SettingsModal';
import { ToastContainer, showToast } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { TestResult, TaskProgress } from './types';
import { testApi, settingsApi, testControlApi } from './services/api';

interface SelectedNames {
  prompt: Record<string, string>;
  model: Record<string, string>;
}

// localStorage 键名
const STORAGE_KEYS = {
  TEST_RESULTS: 'lmbench_testResults',
  TASK_PROGRESSES: 'lmbench_taskProgresses',
  IS_TESTING: 'lmbench_isTesting',
};

function App() {
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedNames, setSelectedNames] = useState<SelectedNames>({ prompt: {}, model: {} });
  const [testResults, setTestResults] = useState<TestResult[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TEST_RESULTS);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isTesting, setIsTesting] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.IS_TESTING) === 'true';
    } catch { return false; }
  });
  const [previewResult, setPreviewResult] = useState<TestResult | null>(null);
  const [taskProgresses, setTaskProgresses] = useState<TaskProgress[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TASK_PROGRESSES);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lmStudioUrl, setLmStudioUrl] = useState('http://127.0.0.1:1234');
  const [skeletonLoading, setSkeletonLoading] = useState(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // 加载设置
  useEffect(() => {
    settingsApi.getSettings().then(settings => {
      setLmStudioUrl(settings.lmStudioUrl || 'http://127.0.0.1:1234');
    }).catch(() => {});
    // 设置一个兜底：5秒后无论如何隐藏骨架屏
    setTimeout(() => setSkeletonLoading(false), 5000);
  }, []);

  const handleSettingsSaved = (settings: { lmStudioUrl: string }) => {
    setLmStudioUrl(settings.lmStudioUrl);
  };

  // 持久化到 localStorage
  const persistResults = useCallback((results: TestResult[]) => {
    localStorage.setItem(STORAGE_KEYS.TEST_RESULTS, JSON.stringify(results));
  }, []);
  const persistProgresses = useCallback((progresses: TaskProgress[]) => {
    localStorage.setItem(STORAGE_KEYS.TASK_PROGRESSES, JSON.stringify(progresses));
  }, []);

  // 当 testResults 变化时持久化
  useEffect(() => { persistResults(testResults); }, [testResults, persistResults]);
  // 当 taskProgresses 变化时持久化
  useEffect(() => { persistProgresses(taskProgresses); }, [taskProgresses, persistProgresses]);
  // 当 isTesting 变化时持久化
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.IS_TESTING, JSON.stringify(isTesting));
  }, [isTesting]);

  // 订阅 SSE + 刷新时拉取最新结果
  useEffect(() => {
    // 设定骨架屏在 2 秒后自动隐藏（不管数据是否加载完成）
    const hideSkeletonTimer = setTimeout(() => setSkeletonLoading(false), 2000);

    // 异步加载设置（不阻塞骨架屏隐藏，因为已有兜底定时器）
    settingsApi.getSettings().then(settings => {
      setLmStudioUrl(settings.lmStudioUrl || 'http://127.0.0.1:1234');
    }).catch(() => {});

    const onProgress = (progress: TaskProgress) => {
      setTaskProgresses(prev => {
        // 如果任务已完成（success/failed/fixed），从进度列表中移除
        if (
          progress.status === 'success' ||
          progress.status === 'failed' ||
          progress.status === 'fixed'
        ) {
          return prev.filter(t => t.taskId !== progress.taskId);
        }
        
        const existing = prev.findIndex(t => t.taskId === progress.taskId);
        const updated = existing >= 0
          ? prev.map((t, i) => i === existing ? progress : t)
          : [...prev, progress];
        return updated;
      });

      // 单个任务完成时，从后端拉取完整结果（不改变 isTesting，由轮询判断）
      if (
        progress.status === 'success' ||
        progress.status === 'failed' ||
        progress.status === 'fixed'
      ) {
        testApi.getResultById(progress.taskId).then((result) => {
          if (result) {
            setTestResults(prev => {
              if (prev.some(r => r.id === result.id)) return prev;
              return [...prev, result];
            });
          }
        }).catch(() => {});
      }
    };

    // 订阅 SSE
    unsubscribeRef.current = testApi.subscribeProgress(onProgress);

    // 页面刷新后从后端拉取最新结果（补充刷新期间错过的）
    testApi.getResults().then((serverResults) => {
      if (serverResults?.length) {
        setTestResults(prev => {
          const merged = [...prev];
          let changed = false;
          for (const sr of serverResults) {
            if (!merged.some(r => r.id === sr.id)) {
              merged.push(sr);
              changed = true;
            }
          }
          return changed ? merged : prev;
        });
      }
    }).catch(() => {});

    return () => {
      clearTimeout(hideSkeletonTimer);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // 轮询兜底：每 3 秒检查一次任务和结果，确保界面不卡住
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!isTesting) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }
    pollingRef.current = setInterval(async () => {
      try {
        const results = await testApi.getResults();
        if (results?.length) {
          setTestResults(prev => {
            const merged = [...prev];
            let changed = false;
            for (const sr of results) {
              const idx = merged.findIndex(r => r.id === sr.id);
              if (idx === -1) {
                merged.push(sr);
                changed = true;
              } else if (merged[idx].status === 'running' && sr.status !== 'running') {
                // 更新已完成的结果
                merged[idx] = sr;
                changed = true;
              }
            }
            return changed ? merged : prev;
          });

          // 检查后端结果中是否还有 running 的任务
          const hasRunningTasks = results.some(r => r.status === 'running');
          if (!hasRunningTasks) {
            setIsTesting(false);
          }
        } else {
          // 如果没有结果且任务进度为空，说明测试已完成
          setTaskProgresses(prev => {
            if (prev.length === 0) {
              Promise.resolve().then(() => setIsTesting(false));
            }
            return prev;
          });
        }

        // 检查是否所有任务都已完成（通过 taskProgresses 状态）
        setTaskProgresses(prev => {
          if (prev.length === 0) return prev;
          const allDone = prev.every(t =>
            t.status === 'success' || t.status === 'failed' || t.status === 'fixed'
          );
          if (allDone) {
            // 用微任务确保状态更新
            Promise.resolve().then(() => setIsTesting(false));
          }
          return prev;
        });
      } catch { /* ignore */ }
    }, 3000);
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isTesting]);

  const handlePromptSelect = (promptId: string, promptName?: string) => {
    if (!selectedPrompts.includes(promptId)) {
      setSelectedPrompts([...selectedPrompts, promptId]);
      if (promptName) {
        setSelectedNames(prev => ({
          ...prev,
          prompt: { ...prev.prompt, [promptId]: promptName },
        }));
      }
    }
  };

  const handleModelSelect = (modelId: string, modelName?: string) => {
    if (!selectedModels.includes(modelId)) {
      setSelectedModels([...selectedModels, modelId]);
      if (modelName) {
        setSelectedNames(prev => ({
          ...prev,
          model: { ...prev.model, [modelId]: modelName },
        }));
      }
    }
  };

  const handleRemovePrompt = (promptId: string) => {
    setSelectedPrompts(selectedPrompts.filter(id => id !== promptId));
  };

  const handleRemoveModel = (modelId: string) => {
    setSelectedModels(selectedModels.filter(id => id !== modelId));
  };

  const handleClearSelection = () => {
    setSelectedPrompts([]);
    setSelectedModels([]);
  };

  const handleRunTest = async () => {
    if (selectedPrompts.length === 0 || selectedModels.length === 0) {
      alert('请至少选择一个提示词和一个模型');
      return;
    }

    setIsTesting(true);
    // 不清空旧进度，追加新任务进度

    try {
      await testApi.batchTest(selectedPrompts, selectedModels);
    } catch (error) {
      console.error('测试失败:', error);
      alert('测试过程中发生错误');
      setIsTesting(false);
    }
  };

  const handleClearResults = async () => {
    setTestResults([]);
    setTaskProgresses([]);
    setIsTesting(false);
    localStorage.removeItem(STORAGE_KEYS.TEST_RESULTS);
    localStorage.removeItem(STORAGE_KEYS.TASK_PROGRESSES);
    localStorage.removeItem(STORAGE_KEYS.IS_TESTING);
    // 清空后端数据
    try {
      await testControlApi.clearResults();
    } catch (err) {
      console.error('清空后端结果失败:', err);
    }
  };

  const handleViewCode = (result: TestResult) => {
    setPreviewResult(result);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>LM Studio 游戏生成测试平台</h1>
          <p>自动测试不同模型和提示词生成HTML游戏</p>
        </div>
        <div className="header-right">
          <span className="header-url" title={lmStudioUrl}>
            🔗 {lmStudioUrl.replace('http://', '').replace('https://', '')}
          </span>
          <button className="settings-btn" onClick={() => setSettingsOpen(true)}>
            ⚙️ 设置
          </button>
        </div>
      </header>

      {/* 顶部操作栏 */}
      <div className="top-action-bar">
        <span className="selected-label">已选择:</span>
        <div className="selected-tags">
          {selectedPrompts.map(id => (
            <span key={id} className="selected-tag prompt">
              {selectedNames.prompt[id] || `提示词 ${id}`}
              <button onClick={() => handleRemovePrompt(id)}>×</button>
            </span>
          ))}
          {selectedModels.map(id => (
            <span key={id} className="selected-tag model">
              {(selectedNames.model[id] || id).substring(0, 24)}
              <button onClick={() => handleRemoveModel(id)}>×</button>
            </span>
          ))}
        </div>
        <div className="top-actions">
          <button className="clear-btn" onClick={handleClearSelection}>
            清空选择
          </button>
          <button 
            className="run-btn" 
            onClick={handleRunTest}
            disabled={isTesting}
          >
            {isTesting ? '测试中...' : '开始测试'}
          </button>
          {isTesting && (
            <button 
              className="stop-btn" 
              onClick={async () => {
                try {
                  await testControlApi.cancelTest();
                  setIsTesting(false);
                  showToast('已停止测试', 'warning');
                } catch (err: any) {
                  showToast('停止失败：' + (err.message || '未知错误'), 'error');
                }
              }}
            >
              停止
            </button>
          )}
          <button 
            className="clear-results-btn" 
            onClick={handleClearResults}
            disabled={testResults.length === 0}
          >
            清空结果
          </button>
        </div>
      </div>

      {/* 任务进度面板 */}
      <TaskProgressPanel tasks={taskProgresses} />

      <main className="main-content">
        <div className="left-panel">
          <ModelSelector
            selectedModels={selectedModels}
            onModelSelect={(id, name) => handleModelSelect(id, name)}
          />
        </div>

        <div className="center-panel">
          <PromptManager
            selectedPrompts={selectedPrompts}
            onPromptSelect={(id, name) => handlePromptSelect(id, name)}
          />
        </div>

        <div className="right-panel">
          <TestResults
            results={testResults}
            onViewCode={handleViewCode}
          />
        </div>
      </main>

      {previewResult && (
        <CodePreview
          result={previewResult}
          onClose={() => setPreviewResult(null)}
        />
      )}

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={handleSettingsSaved}
      />

      {/* 骨架屏：数据加载前显示遮挡 */}
      {skeletonLoading && (
        <div className="skeleton-overlay">
          <div className="skeleton-card">
            <div className="skeleton-line w60" />
            <div className="skeleton-line w80" />
            <div className="skeleton-line w40" />
          </div>
          <div className="skeleton-loading-text">正在加载数据...</div>
        </div>
      )}

      <ToastContainer />
      <ConfirmModal />
    </div>
  );
}

export default App;
