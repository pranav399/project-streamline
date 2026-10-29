import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Flame, ShieldCheck, CalendarHeart, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  variant?: 'user' | 'admin';
}

export function AuthShell({ title, subtitle, children, footer, variant = 'user' }: AuthShellProps) {
  const isAdmin = variant === 'admin';

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left: brand panel */}
      <div
        className={cn(
          'relative hidden flex-1 overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12',
          isAdmin
            ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950'
            : 'bg-gradient-to-br from-saffron-700 via-vermillion-700 to-saffron-950'
        )}
      >
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div
            className={cn(
              'absolute -left-24 top-10 h-72 w-72 rounded-full blur-3xl',
              isAdmin ? 'bg-indigo-400' : 'bg-marigold-400'
            )}
          />
          <div
            className={cn(
              'absolute bottom-10 right-0 h-80 w-80 rounded-full blur-3xl',
              isAdmin ? 'bg-purple-400' : 'bg-saffron-300'
            )}
          />
        </div>

        {/* Brand header */}
        <div className="relative flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-2xl ring-1 backdrop-blur',
                isAdmin
                  ? 'bg-purple-500/20 ring-purple-300/30'
                  : 'bg-white/10 ring-white/20'
              )}
            >
              {isAdmin ? <ShieldCheck className="h-6 w-6 text-purple-300" /> : <Flame className="h-6 w-6 text-saffron-300" />}
            </div>
            <div>
              <p className="font-display text-lg font-semibold tracking-wide">PoojaConnect</p>
              <p className={cn('text-xs', isAdmin ? 'text-purple-200' : 'text-saffron-100')}>
                {isAdmin ? 'System Administrator Portal' : 'Sacred ceremonies, simplified'}
              </p>
            </div>
          </div>
          {isAdmin && (
            <span className="rounded-full border border-purple-400/40 bg-purple-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-purple-200 backdrop-blur-sm">
              Admin Console
            </span>
          )}
        </div>

        {/* Center content */}
        <div className="relative space-y-6 text-white">
          {isAdmin ? (
            <>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Administrative Operations & Governance
              </div>
              <h1 className="font-display max-w-md text-3xl font-semibold leading-tight text-white">
                Platform control, pandit verification & ritual commerce operations.
              </h1>
              <p className="max-w-md text-sm text-indigo-100/90 leading-relaxed">
                Centralized dashboard for auditing pandit credentials, managing temple ritual catalogs, approving samagri inventory, and monitoring devotee bookings.
              </p>
              <ul className="space-y-3.5 text-sm">
                {[
                  { icon: ShieldCheck, text: 'Pandit KYC & Vedic ritual credential auditing' },
                  { icon: CalendarHeart, text: 'Live ceremony schedules & multi-city booking monitoring' },
                  { icon: Sparkles, text: 'Samagri catalog pricing, inventory & order fulfillment' },
                ].map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <li key={i} className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 ring-1 ring-indigo-300/30">
                        <Icon className="h-4 w-4 text-purple-300" />
                      </span>
                      <span className="text-indigo-100">{f.text}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <>
              <h1 className="font-display max-w-md text-3xl font-semibold leading-tight">
                Book trusted Pandits. Schedule sacred Poojas. Order authentic Samagri.
              </h1>
              <p className="max-w-md text-sm text-saffron-100">
                A serene platform connecting devotees with verified pandits — from Griha Pravesh to
                Satyanarayan Katha, with real-time booking and doorstep samagri delivery.
              </p>
              <ul className="space-y-3 text-sm">
                {[
                  { icon: CalendarHeart, text: 'Real-time booking with verified pandits' },
                  { icon: Sparkles, text: 'Authentic pooja samagri delivered to your door' },
                  { icon: ShieldCheck, text: 'Secure, role-based access for devotees & pandits' },
                ].map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <li key={i} className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
                        <Icon className="h-4 w-4" />
                      </span>
                      {f.text}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <p className={cn('relative text-xs', isAdmin ? 'text-indigo-300/80' : 'text-saffron-200')}>
          © {new Date().getFullYear()} PoojaConnect {isAdmin ? 'Security Console' : ''}. Made with devotion.
        </p>
      </div>

      {/* Right: form panel */}
      <div
        className={cn(
          'flex flex-1 items-center justify-center px-4 py-10 transition-colors',
          isAdmin
            ? 'bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30'
            : 'bg-gradient-to-br from-saffron-50/60 to-marigold-50/40 dark:from-slate-950 dark:to-slate-900'
        )}
      >
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-soft',
                  isAdmin
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-700'
                    : 'bg-gradient-to-br from-saffron-500 to-vermillion-600'
                )}
              >
                {isAdmin ? <ShieldCheck className="h-5 w-5" /> : <Flame className="h-5 w-5" />}
              </div>
              <p
                className={cn(
                  'font-display text-base font-semibold',
                  isAdmin ? 'text-slate-900 dark:text-white' : 'text-saffron-900 dark:text-white'
                )}
              >
                PoojaConnect {isAdmin ? 'Admin' : ''}
              </p>
            </div>
            {isAdmin && (
              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-800 dark:bg-purple-900/60 dark:text-purple-200">
                Admin Portal
              </span>
            )}
          </div>
          <h2
            className={cn(
              'font-display text-2xl font-semibold',
              isAdmin ? 'text-slate-900 dark:text-white' : 'text-saffron-900 dark:text-white'
            )}
          >
            {title}
          </h2>
          <p
            className={cn(
              'mt-1 text-sm',
              isAdmin ? 'text-slate-600 dark:text-slate-400' : 'text-saffron-600 dark:text-saffron-400'
            )}
          >
            {subtitle}
          </p>
          <div className="mt-8">{children}</div>
          <div
            className={cn(
              'mt-6 text-center text-sm',
              isAdmin ? 'text-slate-600 dark:text-slate-400' : 'text-saffron-600 dark:text-saffron-400'
            )}
          >
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="font-semibold text-saffron-700 hover:text-saffron-800 dark:text-saffron-400 dark:hover:text-saffron-300"
    >
      {children}
    </Link>
  );
}

export function AuthError({ message }: { message: string | null }) {
  const [show] = useState(true);
  if (!message || !show) return null;
  return (
    <div className="mb-4 rounded-lg border border-vermillion-200 bg-vermillion-50 px-3 py-2 text-sm text-vermillion-700 dark:border-vermillion-900/60 dark:bg-vermillion-500/10 dark:text-vermillion-400">
      {message}
    </div>
  );
}
