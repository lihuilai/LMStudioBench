import { useState, useEffect } from 'react';
import { Model } from '../types';
import { modelApi } from '../services/api';

interface ModelSelectorProps {
  selectedModels: string[];
  onModelSelect: (modelId: string, modelName?: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModels, onModelSelect }) => {
  const [models, setModels] = useState<Model[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const connResult = await modelApi.checkConnection();
      setConnected(connResult);
      
      if (connResult) {
        const modelList = await modelApi.getModels();
        setModels(modelList);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="model-selector">Loading models...</div>;
  }

  if (!connected) {
    return (
      <div className="model-selector">
        <div className="connection-status disconnected">
          <span className="status-icon">🔴</span>
          <span>未连接到 LM Studio</span>
        </div>
        <p className="connection-hint">请确保 LM Studio 已启动并运行在 http://127.0.0.1:1234</p>
      </div>
    );
  }

  return (
    <div className="model-selector">
      <div className="connection-status connected">
        <span className="status-icon">🟢</span>
        <span>已连接到 LM Studio</span>
      </div>
      <h3>选择模型</h3>
      <input
        type="text"
        className="search-box"
        placeholder="搜索模型..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <div className="model-count">
        显示 {filteredModels.length} / {models.length} 个模型
      </div>
      <div className="model-list">
        {filteredModels.map((model) => (
          <label
            key={model.id}
            className={`model-item ${selectedModels.includes(model.id) ? 'selected' : ''}`}
          >
            <input
              type="checkbox"
              checked={selectedModels.includes(model.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  onModelSelect(model.id, model.name);
                }
              }}
            />
            <div className="model-info">
              <span className="model-name" title={model.id}>{model.name}</span>
              <span className="model-size">{model.size}</span>
            </div>
          </label>
        ))}
      </div>
      {filteredModels.length === 0 && searchTerm && (
        <p className="empty-message">未找到匹配的模型</p>
      )}
      {models.length === 0 && !searchTerm && (
        <p className="empty-message">暂无可用模型，请在 LM Studio 中下载模型</p>
      )}
    </div>
  );
};
