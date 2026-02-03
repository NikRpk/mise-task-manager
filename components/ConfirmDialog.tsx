'use client';

import { AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  children?: React.ReactNode;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  children,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const iconColors = {
    danger: '#f30047',
    warning: '#f6c400',
    info: '#3b82f6',
    success: '#00a61c',
  };

  const icons = {
    danger: AlertTriangle,
    warning: AlertTriangle,
    info: Info,
    success: CheckCircle2,
  };

  const Icon = icons[type];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-white/30 z-50 transition-opacity backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-surface rounded-lg shadow-xl max-w-md w-full pointer-events-auto"
          style={{ border: '1px solid var(--color-border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start gap-4 p-6 pb-4">
            <div 
              className="rounded-full p-2 flex-shrink-0"
              style={{ 
                backgroundColor: `${iconColors[type]}15`,
                color: iconColors[type] 
              }}
            >
              <Icon size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 
                className="text-lg font-semibold mb-2"
                style={{ color: 'var(--color-text)' }}
              >
                {title}
              </h3>
              <p 
                className="text-sm leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {message}
              </p>
              {children && (
                <div className="mt-4">
                  {children}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-md transition-colors"
              style={{
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-2 text-sm font-medium rounded-md transition-colors"
              style={{
                backgroundColor: type === 'danger' ? '#f30047' : 'var(--color-primary)',
                color: 'white',
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
