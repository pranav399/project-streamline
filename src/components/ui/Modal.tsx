import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
}

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export function Modal({ open, onClose, title, children, size = 'md', footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-saffron-950/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-t-2xl bg-white shadow-pop dark:bg-slate-900 sm:rounded-2xl animate-slide-in',
          sizes[size]
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-saffron-200/70 px-5 py-4 dark:border-slate-800">
            <h3 className="font-display text-lg font-semibold text-saffron-900 dark:text-white">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-saffron-400 hover:bg-saffron-100 hover:text-saffron-700 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="max-h-[min(78vh,calc(100dvh-7.5rem))] overflow-y-auto scrollbar-thin p-4 sm:p-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-saffron-200/70 bg-saffron-50/30 px-4 py-3 sm:px-5 sm:py-4 dark:border-slate-800 dark:bg-slate-900/60">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
