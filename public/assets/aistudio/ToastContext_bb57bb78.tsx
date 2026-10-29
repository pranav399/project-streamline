import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X, ExternalLink, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastLink {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  link?: ToastLink;
  duration?: number;
}

export interface ToastCtx {
  toast: (t: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string, link?: ToastLink) => void;
  error: (title: string, description?: string, link?: ToastLink) => void;
  info: (title: string, description?: string, link?: ToastLink) => void;
  warning: (title: string, description?: string, link?: ToastLink) => void;
}

const Ctx = createContext<ToastCtx | undefined>(undefined);

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const styles: Record<ToastType, { wrapper: string; icon: string; title: string; link: string; badge: string }> = {
  success: {
    wrapper: 'border-emerald-300/80 bg-white/95 dark:border-emerald-700/60 dark:bg-slate-900/95 shadow-emerald-500/10',
    icon: 'text-emerald-600 dark:text-emerald-400',
    title: 'text-emerald-950 dark:text-emerald-200',
    link: 'text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  },
  error: {
    wrapper: 'border-rose-300/80 bg-white/95 dark:border-rose-700/60 dark:bg-slate-900/95 shadow-rose-500/10',
    icon: 'text-rose-600 dark:text-rose-400',
    title: 'text-rose-950 dark:text-rose-200',
    link: 'text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  },
  info: {
    wrapper: 'border-saffron-300/80 bg-white/95 dark:border-saffron-700/60 dark:bg-slate-900/95 shadow-saffron-500/10',
    icon: 'text-saffron-600 dark:text-saffron-400',
    title: 'text-saffron-950 dark:text-saffron-200',
    link: 'text-saffron-700 hover:text-saffron-800 bg-saffron-50 hover:bg-saffron-100 border-saffron-200 dark:bg-saffron-950/40 dark:text-saffron-300 dark:border-saffron-800',
    badge: 'bg-saffron-100 text-saffron-800 dark:bg-saffron-950 dark:text-saffron-300',
  },
  warning: {
    wrapper: 'border-amber-300/80 bg-white/95 dark:border-amber-700/60 dark:bg-slate-900/95 shadow-amber-500/10',
    icon: 'text-amber-600 dark:text-amber-400',
    title: 'text-amber-950 dark:text-amber-200',
    link: 'text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
};

/** Global dispatcher helper to trigger toasts from anywhere in the app */
export function dispatchGlobalToast(t: Omit<Toast, 'id'>) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pooja:toast', { detail: t }));
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).slice(2);
      const duration = t.duration || (t.type === 'error' ? 6500 : t.link ? 5500 : 4200);
      setToasts((prev) => [...prev, { ...t, id, duration }]);
      setTimeout(() => remove(id), duration);
    },
    [remove]
  );

  useEffect(() => {
    const handleGlobal = (e: Event) => {
      const custom = e as CustomEvent<Omit<Toast, 'id'>>;
      if (custom.detail) {
        toast(custom.detail);
      }
    };
    window.addEventListener('pooja:toast', handleGlobal);
    return () => window.removeEventListener('pooja:toast', handleGlobal);
  }, [toast]);

  const api: ToastCtx = {
    toast,
    success: (title, description, link) => toast({ type: 'success', title, description, link }),
    error: (title, description, link) => toast({ type: 'error', title, description, link }),
    info: (title, description, link) => toast({ type: 'info', title, description, link }),
    warning: (title, description, link) => toast({ type: 'warning', title, description, link }),
  };

  const handleLinkClick = (link?: ToastLink, toastId?: string) => {
    if (!link) return;
    if (toastId) remove(toastId);
    if (link.onClick) {
      link.onClick();
    } else if (link.href) {
      if (link.href.startsWith('http')) {
        window.open(link.href, '_blank', 'noopener,noreferrer');
      } else {
        window.location.hash = '';
        window.location.assign(link.href);
      }
    }
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      {/* Prominent floating toast notification container */}
      <div
        className="pointer-events-none fixed top-4 right-4 sm:top-5 sm:right-5 z-[9999] flex w-full max-w-[390px] sm:max-w-md flex-col gap-2.5 px-3 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const Icon = icons[t.type];
          const style = styles[t.type];
          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto relative overflow-hidden rounded-2xl border p-4 shadow-xl backdrop-blur-md transition-all duration-300 animate-slide-in',
                style.wrapper
              )}
              role="alert"
            >
              <div className="flex items-start gap-3">
                <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 shadow-xs', style.icon)}>
                  <Icon className="h-5 w-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={cn('text-sm font-bold tracking-tight', style.title)}>
                      {t.title}
                    </p>
                    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', style.badge)}>
                      {t.type}
                    </span>
                  </div>

                  {t.description && (
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300 break-words">
                      {t.description}
                    </p>
                  )}

                  {/* Interactive popup link action if provided */}
                  {t.link && (
                    <div className="mt-2.5 flex items-center">
                      <button
                        type="button"
                        onClick={() => handleLinkClick(t.link, t.id)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-xs transition hover:scale-[1.02] active:scale-[0.98]',
                          style.link
                        )}
                      >
                        <span>{t.link.label}</span>
                        {t.link.href?.startsWith('http') ? (
                          <ExternalLink className="h-3 w-3" />
                        ) : (
                          <ArrowRight className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Subtle sacred accent bottom bar */}
              <div
                className={cn(
                  'absolute bottom-0 left-0 right-0 h-0.5 opacity-60',
                  t.type === 'success' && 'bg-emerald-500',
                  t.type === 'error' && 'bg-rose-500',
                  t.type === 'info' && 'bg-saffron-500',
                  t.type === 'warning' && 'bg-amber-500'
                )}
              />
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
