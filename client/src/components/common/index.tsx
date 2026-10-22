import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 transition ${
      onClick ? 'cursor-pointer hover:border-[#7C3AED]/40 hover:shadow-md' : ''
    } ${className}`}
  >
    {children}
  </div>
);

export const Button: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
  onClick?: () => void;
}> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  title,
  onClick,
}) => {
  const base =
    'inline-flex items-center justify-center font-heading font-semibold rounded-lg transition select-none disabled:opacity-50 disabled:cursor-not-allowed';

  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-xs gap-2',
    lg: 'px-5 py-2.5 text-sm gap-2.5',
  };

  const variants = {
    primary: 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-sm shadow-[#7C3AED]/25',
    secondary: 'bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#1E293B]',
    outline: 'border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#1E293B]',
    danger: 'bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-sm shadow-[#DC2626]/20',
    gold: 'bg-gradient-to-r from-[#B8860B] to-[#D4AF37] hover:opacity-95 text-white shadow-sm shadow-[#B8860B]/25',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'gold' | 'neutral';
  size?: 'sm' | 'md';
}> = ({ children, variant = 'primary', size = 'sm' }) => {
  const variants = {
    primary: 'bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20',
    success: 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20',
    warning: 'bg-[#D97706]/10 text-[#D97706] border-[#D97706]/20',
    danger: 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20',
    gold: 'bg-[#B8860B]/10 text-[#B8860B] border-[#B8860B]/20',
    neutral: 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full border ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </span>
  );
};

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}> = ({ isOpen, onClose, title, description, children, maxWidth = 'max-w-lg' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] w-full ${maxWidth} overflow-hidden animate-in zoom-in-95 duration-150`}
      >
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div>
            <h3 className="text-base font-bold text-[#1E293B] font-heading">{title}</h3>
            {description && <p className="text-xs text-[#64748B] mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1E293B] hover:bg-[#E2E8F0] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}> = ({ icon: Icon, title, description, actionText, onAction }) => (
  <div className="py-12 px-6 text-center flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-[#CBD5E1]">
    <div className="w-12 h-12 rounded-xl bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center mb-3">
      <Icon className="w-6 h-6" />
    </div>
    <h4 className="text-sm font-bold text-[#1E293B] font-heading">{title}</h4>
    <p className="text-xs text-[#64748B] max-w-sm mt-1 mb-4">{description}</p>
    {actionText && onAction && (
      <Button variant="primary" size="sm" onClick={onAction}>
        {actionText}
      </Button>
    )}
  </div>
);

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Deletion',
  description = 'Are you sure you want to delete this item? This action cannot be undone.',
  itemName,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 p-6">
        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              variant === 'danger'
                ? 'bg-[#DC2626]/10 text-[#DC2626] ring-4 ring-[#DC2626]/5'
                : 'bg-[#D97706]/10 text-[#D97706] ring-4 ring-[#D97706]/5'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-[#1E293B] font-heading">{title}</h3>
            <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">{description}</p>

            {itemName && (
              <div className="mt-3 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-[#1E293B] truncate flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${variant === 'danger' ? 'bg-[#DC2626]' : 'bg-[#D97706]'}`} />
                <span className="truncate">{itemName}</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
                {cancelText}
              </Button>
              <Button
                variant={variant === 'danger' ? 'danger' : 'primary'}
                size="sm"
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? 'Processing...' : confirmText}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
