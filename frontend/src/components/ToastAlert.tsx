import React from 'react';

interface ToastAlertProps {
  type?: 'success' | 'error' | 'info';
  message: string;
  onClose?: () => void;
}

export const ToastAlert: React.FC<ToastAlertProps> = ({ type = 'info', message, onClose }) => (
  <div className={`toast-alert toast-${type}`} role="status">
    <span>{message}</span>
    {onClose && (
      <button type="button" onClick={onClose} aria-label="Dong thong bao">
        x
      </button>
    )}
  </div>
);
