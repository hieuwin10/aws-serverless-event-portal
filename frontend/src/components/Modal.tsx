import React from 'react';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export const Modal: React.FC<ModalProps> = ({ title, children, onClose }) => (
  <div className="modal-backdrop fade-in">
    <div className="modal-content card-glass">
      <div className="modal-header">
        <h2>{title}</h2>
        <button className="modal-close modal-close-button" type="button" onClick={onClose} aria-label="Dong modal">
          x
        </button>
      </div>
      {children}
    </div>
  </div>
);
