import { useState } from 'react';
import { TestResult } from '../types';

interface TestResultsProps {
  results: TestResult[];
  onViewCode: (result: TestResult) => void;
}

export const TestResults: React.FC<TestResultsProps> = ({ results, onViewCode }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'fixed': return 'bg-yellow-500';
      case 'running': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '成功';
      case 'failed': return '失败';
      case 'fixed': return '已修复';
      case 'running': return '运行中';
      default: return '待处理';
    }
  };

  const copyErrors = async (result: TestResult) => {
    const errorText = result.errors.map(e => `[${e.type}] ${e.message}`).join('\n');
    await navigator.clipboard.writeText(errorText);
    setCopiedId(result.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (results.length === 0) {
    return (
      <div className="test-results">
        <h3>测试结果</h3>
        <p className="empty-message">暂无测试结果，请选择提示词和模型后点击开始测试</p>
      </div>
    );
  }

  const stats = {
    success: results.filter(r => r.status === 'success').length,
    failed: results.filter(r => r.status === 'failed').length,
    fixed: results.filter(r => r.status === 'fixed').length,
    running: results.filter(r => r.status === 'running').length,
  };

  return (
    <div className="test-results">
      <div className="header">
        <h3>测试结果</h3>
        <div className="stats">
          <span className="stat-item success">成功: {stats.success}</span>
          <span className="stat-item failed">失败: {stats.failed}</span>
          <span className="stat-item fixed">已修复: {stats.fixed}</span>
        </div>
      </div>

      <div className="results-list">
        {results.map((result) => (
          <div key={result.id} className="result-card">
            <div className="result-header">
              <div className="result-info">
                <span className="prompt-name">{result.promptName}</span>
                <span className="model-name">{result.modelName}</span>
              </div>
              <div className={`status-badge ${getStatusColor(result.status)}`}>
                {getStatusText(result.status)}
              </div>
            </div>

            {result.fixAttempts > 0 && (
              <div className="fix-attempts">
                修复尝试: {result.fixAttempts} 次
              </div>
            )}

            {result.tokenStats && (
              <div className="token-stats-mini">
                <span title="提示词Token">↑ {result.tokenStats.promptTokens}</span>
                <span title="生成Token">↓ {result.tokenStats.completionTokens}</span>
                <span title="总Token">∑ {result.tokenStats.totalTokens}</span>
                {result.tokenStats.tokensPerSecond && (
                  <span title="生成速度">⚡ {result.tokenStats.tokensPerSecond} t/s</span>
                )}
                {result.tokenStats.contextLength && result.tokenStats.contextLimit && (
                  <span title="上下文长度/限制">📐 {result.tokenStats.contextLength}/{result.tokenStats.contextLimit}</span>
                )}
                {result.tokenStats.executionTime !== undefined && (
                  <span title="执行时间">⏱️ {(result.tokenStats.executionTime / 60).toFixed(1)} 分钟</span>
                )}
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="errors-section">
                <div className="errors-header">
                  <h4>错误信息</h4>
                  <button
                    className="copy-errors-btn"
                    onClick={() => copyErrors(result)}
                  >
                    {copiedId === result.id ? '已复制' : '复制错误'}
                  </button>
                </div>
                <div className="errors-list">
                  {result.errors.map((error, index) => (
                    <div key={index} className="error-item">
                      <span className="error-type">{error.type}</span>
                      <span className="error-message">{error.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="result-actions">
              <button onClick={() => onViewCode(result)}>查看代码</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
