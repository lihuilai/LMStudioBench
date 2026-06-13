import { useState, useRef, useEffect } from 'react';
import { TestResult } from '../types';

interface CodePreviewProps {
  result: TestResult;
  onClose: () => void;
}

export const CodePreview: React.FC<CodePreviewProps> = ({ result, onClose }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'generated' | 'fixed'>('preview');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const codeToShow = activeTab === 'generated' ? result.generatedCode : result.fixedCode || '';
  const currentCode = activeTab === 'preview' 
    ? (result.fixedCode || result.generatedCode) 
    : codeToShow;

  // 用 blob URL 设置 iframe src，兼容性更好
  useEffect(() => {
    if (activeTab === 'preview' && iframeRef.current && currentCode) {
      const blob = new Blob([currentCode], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      iframeRef.current.src = url;
      return () => URL.revokeObjectURL(url);
    }
  }, [activeTab, currentCode]);

  const downloadCode = () => {
    if (!currentCode) return;
    const blob = new Blob([currentCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.promptName}-${result.modelName}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const runInNewTab = () => {
    if (!currentCode) return;
    const blob = new Blob([currentCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="modal code-modal">
      <div className="modal-content code-preview">
        <div className="modal-header">
          <h4>{result.promptName} - {result.modelName}</h4>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="code-header">
          <button
            className={`code-header-btn ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            👁️ 实时预览
          </button>
          <button
            className={`code-header-btn ${activeTab === 'generated' ? 'active' : ''}`}
            onClick={() => setActiveTab('generated')}
          >
            生成的代码
          </button>
          {result.fixedCode && (
            <button
              className={`code-header-btn ${activeTab === 'fixed' ? 'active' : ''}`}
              onClick={() => setActiveTab('fixed')}
            >
              修复后的代码
            </button>
          )}
        </div>

        <div className="code-actions">
          <button onClick={downloadCode} disabled={!currentCode}>📥 下载代码</button>
          <button onClick={runInNewTab} disabled={!currentCode}>🚀 在新标签页运行</button>
          {activeTab === 'preview' && currentCode && (
            <button onClick={() => {
              if (iframeRef.current && currentCode) {
                const blob = new Blob([currentCode], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                iframeRef.current.src = url;
                setTimeout(() => URL.revokeObjectURL(url), 5000);
              }
            }}>
              🔄 刷新预览
            </button>
          )}
        </div>

        {activeTab === 'preview' ? (
          <div className="preview-container">
            {!currentCode && (
              <div className="preview-empty">暂无代码可预览</div>
            )}
            <iframe
              ref={iframeRef}
              className="preview-iframe"
              title="游戏预览"
              sandbox="allow-scripts allow-modals"
            />
          </div>
        ) : (
          <pre className="code-display">
            <code>{codeToShow || '// 暂无代码'}</code>
          </pre>
        )}
      </div>
    </div>
  );
};
