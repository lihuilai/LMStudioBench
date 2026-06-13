import { useState, useEffect } from 'react';
import { settingsApi, modelApi } from '../services/api';

interface Settings {
  lmStudioUrl: string;
}

const DEFAULT_SETTINGS: Settings = {
  lmStudioUrl: 'http://127.0.0.1:1234',
};

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (settings: Settings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose, onSaved }) => {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      // 从后端加载设置
      settingsApi.getSettings().then(settings => {
        setUrl(settings.lmStudioUrl || DEFAULT_SETTINGS.lmStudioUrl);
      }).catch(() => {
        setUrl(DEFAULT_SETTINGS.lmStudioUrl);
      });
      setTestResult(null);
    }
  }, [open]);

  if (!open) return null;

  const handleSave = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      alert('请输入 LM Studio 地址');
      return;
    }
    setSaving(true);
    try {
      await settingsApi.updateSettings({ lmStudioUrl: trimmed });
      const settings: Settings = { lmStudioUrl: trimmed };
      onSaved(settings);
      onClose();
    } catch (err: any) {
      alert('保存失败：' + (err.message || '未知错误'));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      alert('请输入 LM Studio 地址');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const connected = await modelApi.testConnection(trimmed);
      if (connected) {
        setTestResult('success');
      } else {
        setTestResult('error');
      }
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="modal settings-modal">
      <div className="modal-content settings-content">
        <div className="modal-header">
          <h4>⚙️ 设置</h4>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="settings-body">
          <div className="setting-item">
            <label>
              <span className="setting-label">LM Studio API 地址</span>
              <span className="setting-desc">LM Studio 本地或远程 API 地址，默认 http://localhost:1234</span>
            </label>
            <div className="setting-input-row">
              <input
                type="text"
                value={url}
                onChange={e => { setUrl(e.target.value); setTestResult(null); }}
                placeholder="http://127.0.0.1:1234"
                className="setting-input"
              />
              <button
                className="test-btn"
                onClick={handleTest}
                disabled={testing}
              >
                {testing ? '测试中...' : '测试连接'}
              </button>
            </div>
            {testResult === 'success' && (
              <div className="setting-status success">✅ 连接成功！LM Studio 可访问。</div>
            )}
            {testResult === 'error' && (
              <div className="setting-status error">❌ 连接失败，请检查地址和 LM Studio 是否运行。</div>
            )}
          </div>

          <div className="setting-item">
            <label>
              <span className="setting-label">提示</span>
              <span className="setting-desc">
                1. 确保 LM Studio 已安装并运行<br/>
                2. 在 LM Studio 中加载模型后，API 地址通常为 <code>http://127.0.0.1:1234</code><br/>
                3. 远程服务器请填写服务器 IP，如 <code>http://192.168.1.100:1234</code>
              </span>
            </label>
          </div>
        </div>

        <div className="settings-footer">
          <button className="cancel-btn" onClick={onClose}>取消</button>
          <button className="save-btn" onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存设置'}</button>
        </div>
      </div>
    </div>
  );
};
