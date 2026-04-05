import React from 'react';

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary' | 'success';
  zIndex?: number;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export const ConfirmModal = ({
  open,
  title,
  message,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  confirmVariant = 'danger',
  zIndex = 2000,
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmModalProps) => {
  if (!open) return null;

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex }}
      role="dialog"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" onClick={() => !busy && onCancel()}></button>
          </div>
          <div className="modal-body">
            <p className="mb-0">{message}</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={busy}>
              {cancelLabel}
            </button>
            <button type="button" className={`btn btn-${confirmVariant}`} onClick={onConfirm} disabled={busy}>
              {busy ? 'กำลังทำรายการ...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
