import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Mail,
  Loader2,
  LogIn,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Users,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { AuthShell, AuthError } from '../components/auth/AuthShell';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/utils';

export function AdminLoginPage() {
  const { signIn } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Submit Admin Login Form
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      const msg = 'Please provide your administrator email address.';
      setError(msg);
      toastError('Email Required', msg);
      return;
    }
    if (!password) {
      const msg = 'Please provide your administrator security password.';
      setError(msg);
      toastError('Password Required', msg);
      return;
    }

    setBusy(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setBusy(false);

    if (signInError) {
      const errMsg =
        signInError.includes('Invalid login') || signInError.includes('invalid-credential')
          ? 'Invalid administrator credentials. Please check your email and password.'
          : signInError;
      setError(errMsg);
      toastError('Login Failed', errMsg, {
        label: 'Try Demo Admin',
        onClick: handleQuickAdminLogin,
      });
      return;
    }

    success('Administrator Authenticated!', 'Welcome to the PoojaConnect Administration Console.', {
      label: 'Open Dashboard',
      href: '/app',
    });
    navigate('/app');
  };

  // Instant Demo Admin One-Click Login
  const handleQuickAdminLogin = async () => {
    setError(null);
    setEmail('admin@example.com');
    setPassword('admin@123');
    setBusy(true);

    const { error: signInError } = await signIn('admin@example.com', 'admin@123');
    setBusy(false);

    if (signInError) {
      setError(signInError);
      toastError('Admin Login Failed', signInError);
      return;
    }

    success('Welcome Admin!', 'Authorized into PoojaConnect Management Portal.', {
      label: 'Open Dashboard',
      href: '/app',
    });
    navigate('/app');
  };

  return (
    <AuthShell
      variant="admin"
      title="Administrator Sign In"
      subtitle="Enter your verified administrative credentials to access platform controls."
      footer={
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Looking for Devotee or Pandit login?</span>
            <Link
              to="/login"
              className="font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
            >
              User Login Page →
            </Link>
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500">
            PoojaConnect Administrative Security Engine • Confidential & Audited
          </div>
        </div>
      }
    >
      {/* Visual Identity Pill Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-800 dark:border-purple-800/80 dark:bg-purple-950/60 dark:text-purple-300">
          <ShieldCheck className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          <span>Restricted Admin Portal</span>
        </div>
        <Link
          to="/login"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-300 transition"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>Switch to User Login</span>
        </Link>
      </div>

      {/* Security Warning Callout */}
      <div className="mb-5 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <p className="font-semibold">Authorized Personnel Only</p>
            <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 mt-0.5">
              This page is exclusively for platform administrators to manage pandit verification, temple listings, and financial audits.
            </p>
          </div>
        </div>
      </div>

      <AuthError message={error} />

      {/* Admin Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label text-slate-700 dark:text-slate-300 font-medium" htmlFor="admin-email">
            Admin Email Address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input pl-9 border-slate-300 focus:border-purple-500 focus:ring-purple-500/20 dark:border-slate-700"
              placeholder="admin@example.com"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label text-slate-700 dark:text-slate-300 font-medium" htmlFor="admin-password">
              Admin Password
            </label>
            <span className="text-[11px] text-slate-400">Default: admin@123</span>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pl-9 pr-10 border-slate-300 focus:border-purple-500 focus:ring-purple-500/20 dark:border-slate-700"
              placeholder="••••••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          id="admin-login-submit-btn"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-purple-700 active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {busy ? 'Verifying Admin Access…' : 'Sign In to Admin Portal'}
        </button>
      </form>

      {/* One-Click Fast Admin Demo Box */}
      <div className="mt-6 rounded-xl border border-purple-200/90 bg-gradient-to-br from-purple-50/80 to-indigo-50/50 p-4 dark:border-purple-900/50 dark:bg-purple-950/20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 text-white shadow-xs">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-purple-950 dark:text-purple-200">
                1-Click Administrator Access
              </p>
              <p className="text-[11px] text-purple-700 dark:text-purple-300">
                admin@example.com <span className="text-purple-400">•</span> admin@123
              </p>
            </div>
          </div>
          <button
            type="button"
            id="admin-quick-fill-btn"
            onClick={handleQuickAdminLogin}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-purple-800 active:scale-95 disabled:opacity-60 shrink-0"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogIn className="h-3 w-3" />}
            <span>Auto-fill & Log In</span>
          </button>
        </div>
      </div>

      {/* Switcher card to Devotee & Pandit login */}
      <div className="mt-6 border-t border-slate-200/80 pt-4 dark:border-slate-800">
        <div className="rounded-xl border border-saffron-200/80 bg-saffron-50/60 p-3.5 dark:border-saffron-900/40 dark:bg-saffron-950/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🪔</span>
              <div>
                <p className="text-xs font-semibold text-saffron-950 dark:text-saffron-200">
                  Devotee & Pandit Login
                </p>
                <p className="text-[11px] text-saffron-700 dark:text-saffron-300">
                  Book rituals, check pandit schedule, or buy samagri
                </p>
              </div>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-1 rounded-lg border border-saffron-300 bg-white px-3 py-1.5 text-xs font-semibold text-saffron-800 shadow-xs transition hover:bg-saffron-50 dark:border-saffron-700 dark:bg-slate-800 dark:text-saffron-200 shrink-0"
            >
              <span>User Login</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
