import { Flame } from 'lucide-react';

export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-saffron-50 to-marigold-50 dark:from-slate-950 dark:to-slate-900">
      <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-saffron-500 to-vermillion-600 text-white shadow-pop">
        <Flame className="h-7 w-7" />
      </div>
      <div className="flex items-center gap-2 text-sm text-saffron-600 dark:text-saffron-400">
        <span className="h-2 w-2 animate-bounce rounded-full bg-saffron-500 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-saffron-500 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-saffron-500" />
        <span className="ml-1">Invoking blessings…</span>
      </div>
    </div>
  );
}
