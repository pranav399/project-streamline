import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type Variant = 'saffron' | 'green' | 'red' | 'amber' | 'blue' | 'gray';

const variants: Record<Variant, string> = {
  saffron: 'bg-saffron-100 text-saffron-700 dark:bg-saffron-500/15 dark:text-saffron-300',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  red: 'bg-vermillion-100 text-vermillion-700 dark:bg-vermillion-500/15 dark:text-vermillion-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  blue: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  gray: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export function Badge({ variant = 'saffron', children, className }: { variant?: Variant; children: ReactNode; className?: string }) {
  return <span className={cn('chip', variants[variant], className)}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, Variant> = {
    pending: 'amber',
    confirmed: 'green',
    completed: 'blue',
    rejected: 'red',
    cancelled: 'gray',
    placed: 'amber',
    shipped: 'blue',
    delivered: 'green',
  };
  const v = map[status] ?? 'gray';
  return <Badge variant={v}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}
