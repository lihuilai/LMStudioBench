import { useState, useEffect } from 'react';

interface ConfirmOptions {
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmModalState extends ConfirmOptions {
  open: boolean;
  resolve: (value: boolean) => void;
}

let confirmState: ConfirmModalState | null = null;
const listeners = new Set<(state: ConfirmModalState | null) => void>();

function notify() {
  listeners.forEach(fn => fn(confirmState));
}

export function showConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    confirmState = {
      ...options,
      open: true,
      resolve,
    };
    notify();
  });
}

export const ConfirmModal: React.FC = () => {
  const [state, setState] = useState<ConfirmModalState | null>(null);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const handler = (s: ConfirmModalState | null) => {
      if (s && s.open) {
        setState(s);
        setVisible(true);
        setClosing(false);
      }
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  const close = (result: boolean) => {
    setClosing(true);
    setTimeout(() => {
      if (state) {
        state.resolve(result);
      }
      setVisible(false);
      setClosing(false);
      confirmState = null;
    }, 200);
  };

  if (!visible || !state) return null;

  return (
    <div className={`modal confirm-modal ${closing ? 'closing' : ''}`} onClick={() => close(false)}>
      <div className="modal-content confirm-content" onClick={e => e.stopPropagation()}>
        <div className="confirm-header">
          {state.title && <h4>{state.title}</h4>}
          <button className="close-btn" onClick={() => close(false)}>×</button>
        </div>
        <div className="confirm-body">
          <p>{state.message}</p>
        </div>
        <div className="confirm-footer">
          <button className="cancel-btn" onClick={() => close(false)}>
            {state.cancelText || '取消'}
          </button>
          <button className="confirm-ok-btn" onClick={() => close(true)}>
            {state.confirmText || '确定'}
          </button>
        </div>
      </div>
    </div>
  );
};
