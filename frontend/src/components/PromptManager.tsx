import { useState, useEffect } from 'react';
import { PromptTemplate } from '../types';
import { promptApi } from '../services/api';
import { showToast } from './Toast';
import { showConfirm } from './ConfirmModal';

interface PromptManagerProps {
  selectedPrompts: string[];
  onPromptSelect: (promptId: string, promptName?: string) => void;
}

export const PromptManager: React.FC<PromptManagerProps> = ({ selectedPrompts, onPromptSelect }) => {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ name: '', content: '', category: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('全部');

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    const data = await promptApi.getAllPrompts();
    setPrompts(data);
  };

  const handleSaveEdit = async () => {
    if (editingPrompt) {
      const name = editingPrompt.name.trim();
      const content = editingPrompt.content.trim();
      if (!name) {
        alert('请输入提示词名称');
        return;
      }
      if (!content) {
        alert('请输入提示词内容');
        return;
      }
      try {
        await promptApi.updatePrompt(editingPrompt.id, { name, content, category: editingPrompt.category.trim() || '未分类' });
        setEditingPrompt(null);
        await fetchPrompts();
        showToast('提示词编辑成功！', 'success');
      } catch (err: any) {
        showToast('编辑失败：' + (err.message || '未知错误'), 'error');
      }
    }
  };

  const handleAddPrompt = async () => {
    const name = newPrompt.name.trim();
    const content = newPrompt.content.trim();
    if (!name) {
      showToast('请输入提示词名称', 'warning');
      return;
    }
    if (!content) {
      showToast('请输入提示词内容', 'warning');
      return;
    }
    try {
      await promptApi.createPrompt({ name, content, category: newPrompt.category.trim() || '未分类' });
      setNewPrompt({ name: '', content: '', category: '' });
      setShowAddModal(false);
      await fetchPrompts();
      showToast('提示词添加成功！', 'success');
    } catch (err: any) {
      showToast('添加失败：' + (err.message || '未知错误'), 'error');
    }
  };

  const handleDeletePrompt = async (id: string) => {
    const confirmed = await showConfirm({ message: '确定要删除这个提示词吗？', title: '删除确认' });
    if (confirmed) {
      try {
        await promptApi.deletePrompt(id);
        await fetchPrompts();
        showToast('提示词已删除', 'success');
      } catch (err: any) {
        showToast('删除失败：' + (err.message || '未知错误'), 'error');
      }
    }
  };

  const categories = ['全部', ...new Set(prompts.map((p) => p.category))];
  
  const filteredPrompts = prompts.filter(prompt => {
    const matchesSearch = prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prompt.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prompt.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === '全部' || prompt.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="prompt-manager">
      <div className="header">
        <h3>提示词管理</h3>
        <button className="add-btn" onClick={() => setShowAddModal(true)}>
          + 添加提示词
        </button>
      </div>

      <input
        type="text"
        className="search-box"
        placeholder="搜索提示词（名称、内容、分类）..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="category-tabs">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="prompt-count">
        显示 {filteredPrompts.length} / {prompts.length} 个提示词
      </div>

      <div className="prompt-list">
        {filteredPrompts.map((prompt) => (
          <div
            key={prompt.id}
            className={`prompt-item ${selectedPrompts.includes(prompt.id) ? 'selected' : ''}`}
          >
            {editingPrompt?.id === prompt.id ? (
              <div className="prompt-editor">
                <input
                  type="text"
                  value={editingPrompt.name}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
                  className="edit-name"
                  placeholder="名称"
                />
                <textarea
                  value={editingPrompt.content}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, content: e.target.value })}
                  className="edit-content"
                  placeholder="提示词内容"
                />
                <input
                  type="text"
                  value={editingPrompt.category}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, category: e.target.value })}
                  className="edit-category"
                  placeholder="分类"
                />
                <div className="edit-actions">
                  <button onClick={handleSaveEdit}>保存</button>
                  <button onClick={() => setEditingPrompt(null)}>取消</button>
                </div>
              </div>
            ) : (
              <>
                <label className="prompt-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedPrompts.includes(prompt.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onPromptSelect(prompt.id, prompt.name);
                      }
                    }}
                  />
                </label>
                <div className="prompt-content">
                  <div className="prompt-header">
                    <span className="prompt-name">{prompt.name}</span>
                    <span className="prompt-category">{prompt.category}</span>
                  </div>
                  <p className="prompt-preview">{prompt.content.substring(0, 100)}...</p>
                </div>
                <div className="prompt-actions">
                  <button onClick={() => setEditingPrompt(prompt)}>编辑</button>
                  <button onClick={() => handleDeletePrompt(prompt.id)}>删除</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {filteredPrompts.length === 0 && searchTerm && (
        <p className="empty-message">未找到匹配的提示词</p>
      )}

      {showAddModal && (
        <div className="modal">
          <div className="modal-content">
            <h4>添加新提示词</h4>
            <input
              type="text"
              placeholder="名称"
              value={newPrompt.name}
              onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="分类"
              value={newPrompt.category}
              onChange={(e) => setNewPrompt({ ...newPrompt, category: e.target.value })}
            />
            <textarea
              placeholder="提示词内容"
              value={newPrompt.content}
              onChange={(e) => setNewPrompt({ ...newPrompt, content: e.target.value })}
            />
            <div className="modal-actions">
              <button onClick={handleAddPrompt}>添加</button>
              <button onClick={() => setShowAddModal(false)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
