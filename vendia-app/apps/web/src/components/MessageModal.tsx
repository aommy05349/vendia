import React from 'react';

type MessageModalProps = {
  open: boolean;
  type: 'success' | 'danger';
  title: string;
  message: string;
  okLabel?: string;
  zIndex?: number;
  onClose: () => void;
};

export const MessageModal = ({ open, type, title, message, okLabel = 'ตกลง', zIndex = 2000, onClose }: MessageModalProps) => {
  if (!open) return null;

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex }}
      role="dialog"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0">
          <div className="modal-body text-center p-4">
            <div className={`${type === 'success' ? 'text-success' : 'text-danger'} mb-3`} style={{ fontSize: '3rem' }}>
              <i className={`bi ${type === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}></i>
            </div>
            <h5 className="mb-2">{title}</h5>
            <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
              {message}
            </p>
          </div>
          <div className="modal-footer border-0 justify-content-center">
            <button type="button" className={`btn ${type === 'success' ? 'btn-success' : 'btn-danger'}`} onClick={onClose}>
              {okLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
