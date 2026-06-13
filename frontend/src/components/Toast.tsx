import { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

// 全局 toast 状态
let toastId = 0;
const listeners = new Set<(toasts: Toast[]) => void>();
let globalToasts: Toast[] = [];

function notify() {
  listeners.forEach(fn => fn([...globalToasts]));
}

export function showToast(message: string, type: ToastType = 'info', duration = 3000) {
  const id = ++toastId;
  const toast: Toast = { id, message, type };
  globalToasts = [...globalToasts, toast];
  notify();
  setTimeout(() => {
    globalToasts = globalToasts.filter(t => t.id !== id);
    notify();
  }, duration);
}

interface ToastContainerProps {
  // 无 props，全局单例
}

export const ToastContainer: React.FC<ToastContainerProps> = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (newToasts: Toast[]) => setToasts([...newToasts]);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  const typeStyles: Record<ToastType, { bg: string; icon: string }> = {
    success: { bg: '#d4edda', icon: '✅' },
    error:   { bg: '#f8d7da', icon: '❌' },
    info:    { bg: '#d1ecf1', icon: 'ℹ️' },
    warning: { bg: '#fff3cd', icon: '⚠️' },
  };

  return (
    <div className="toast-container">
      {toasts.map(t => {
        const style = typeStyles[t.type] || typeStyles.info;
        return (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            style={{ background: style.bg }}
          >
            <span className="toast-icon">{style.icon}</span>
            <span className="toast-message">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
};
