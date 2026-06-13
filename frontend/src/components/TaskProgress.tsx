import { TaskProgress as TaskProgressType } from '../types';

interface TaskProgressPanelProps {
  tasks: TaskProgressType[];
}

export const TaskProgressPanel: React.FC<TaskProgressPanelProps> = ({ tasks }) => {
  if (tasks.length === 0) return null;

  return (
    <div className="task-progress-panel">
      <h4>
        任务进度
        {tasks.some(t => t.status === 'running') && (
          <span className="running-badge">（{tasks.filter(t => t.status === 'running').length} 运行中）</span>
        )}
        <span className="total-badge">（总计 {tasks.length}）</span>
      </h4>
      <div className="task-list">
        {tasks.map((task) => {
          const isDone = task.progress === 100 || task.status === 'success' || task.status === 'failed' || task.status === 'fixed';
          const statusIcon = task.status === 'success' ? '✅' : task.status === 'fixed' ? '🔧' : task.status === 'failed' ? '❌' : '⏳';
          return (
            <div
              key={task.taskId}
              className={`task-item ${isDone ? 'done' : ''} ${task.status === 'failed' ? 'failed' : ''}`}
            >
              <div className="task-header">
                <span className="task-name">{task.promptName} - {task.modelName}</span>
                <span className={`task-step ${task.status === 'failed' ? 'error' : ''}`}>{statusIcon} {task.currentStep}</span>
              </div>

              {/* 进度条 */}
              <div className="progress-bar">
                <div
                  className={`progress-fill ${task.status === 'failed' ? 'fill-error' : ''}`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>

              <div className="task-details">
                <span className="task-progress-text">{task.progress}%</span>

                {/* Token 统计信息 */}
                {task.tokenStats && (
                  <div className="token-stats">
                    <span className="token-item" title="提示词 Token">
                      ↑ {task.tokenStats.promptTokens}
                    </span>
                    <span className="token-item" title="生成 Token">
                      ↓ {task.tokenStats.completionTokens}
                    </span>
                    <span className="token-item" title="总 Token">
                      ∑ {task.tokenStats.totalTokens}
                    </span>
                    {task.tokenStats.tokensPerSecond && (
                      <span className="token-item" title="生成速度">
                        ⚡ {task.tokenStats.tokensPerSecond} t/s
                      </span>
                    )}
                    {task.tokenStats.contextLength && task.tokenStats.contextLimit && (
                      <span className="token-item" title="上下文长度/限制">
                        📐 {task.tokenStats.contextLength}/{task.tokenStats.contextLimit}
                      </span>
                    )}
                    {task.tokenStats.executionTime !== undefined && (
                      <span className="token-item" title="执行时间">
                        ⏱️ {(task.tokenStats.executionTime / 60).toFixed(1)} 分钟
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
