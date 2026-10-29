import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, UserPlus, User, Phone, Check, Sparkles, Shield } from 'lucide-react';
import { AuthShell, AuthLink, AuthError } from '../components/auth/AuthShell';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { Role } from '../lib/firebase';
import { cn } from '../lib/utils';

const roleOptions: { value: Role; label: string; desc: string; icon: string }[] = [
  { value: 'devotee', label: 'Devotee', desc: 'Book poojas & order samagri', icon: '🪔' },
  { value: 'pandit', label: 'Pandit', desc: 'Offer services & manage bookings', icon: '🕉️' },
];

export function SignupPage() {
  const { signUp, signInWithGoogle } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('devotee');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setBusy(true);
    const { error } = await signInWithGoogle(role);
    setBusy(false);
    if (error) {
      setError(error);
      toastError('Google Registration Failed', error);
      return;
    }
    success(`Welcome ${role === 'pandit' ? 'Pandit Ji' : 'Devotee'}!`, 'Account registered with Firebase Google.', {
      label: 'Open Dashboard',
      href: '/app',
    });
    sessionStorage.setItem('ask_profile_update', 'true');
    navigate('/app');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) {
      const msg = 'Please enter your full name.';
      setError(msg);
      toastError('Name Required', msg);
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      const msg = 'Please enter a valid email address.';
      setError(msg);
      toastError('Valid Email Required', msg);
      return;
    }
    if (password.length < 6) {
      const msg = 'Password must be at least 6 characters.';
      setError(msg);
      toastError('Weak Password', msg);
      return;
    }
    setBusy(true);
    const { error } = await signUp(email.trim(), password, fullName.trim(), role, phone.trim());
    setBusy(false);
    if (error) {
      const msg = error.includes('already') ? 'An account with this email already exists.' : error;
      setError(msg);
      toastError('Registration Failed', msg, {
        label: 'Sign In Instead',
        href: '/login',
      });
      return;
    }
    success('Account Created Successfully!', 'Your account is ready. Please sign in to begin your journey.', {
      label: 'Go to Sign In',
      href: '/login',
    });
    navigate('/login');
  };

  return (
    <AuthShell
      variant="user"
      title="Create User Account"
      subtitle="Register as a Devotee or Pandit to book or conduct sacred ceremonies."
      footer={
        <div className="space-y-2">
          <div>
            Already have an account? <AuthLink to="/login">Sign in</AuthLink>
          </div>
          <div className="pt-1 text-xs text-slate-500 dark:text-slate-400">
            System Administrator?{' '}
            <Link
              to="/admin-login"
              className="font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400"
            >
              Go to Admin Login →
            </Link>
          </div>
        </div>
      }
    >
      {/* Identity Pill */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-saffron-200 bg-saffron-50 px-3 py-1 text-xs font-semibold text-saffron-900 dark:border-saffron-800/80 dark:bg-saffron-950/60 dark:text-saffron-300">
          <Sparkles className="h-3.5 w-3.5 text-saffron-600 dark:text-saffron-400" />
          <span>Devotee & Pandit Registration</span>
        </div>
        <Link
          to="/admin-login"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-300 transition"
        >
          <Shield className="h-3 w-3 text-purple-600" />
          <span>Admin Portal</span>
        </Link>
      </div>
      {/* Role Selection Option: Devotee or Pandit */}
      <div className="mb-5">
        <label className="mb-2 block text-xs font-semibold text-saffron-900 dark:text-saffron-200">
          I want to register as:
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          {roleOptions.map((r) => {
            const isSelected = role === r.value;
            return (
              <button
                key={r.value}
                type="button"
                id={`signup-role-${r.value}-btn`}
                onClick={() => {
                  setRole(r.value);
                  setError(null);
                }}
                className={cn(
                  'relative flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all',
                  isSelected
                    ? r.value === 'devotee'
                      ? 'border-saffron-500 bg-saffron-50/90 shadow-sm ring-2 ring-saffron-500/20 dark:border-saffron-400 dark:bg-saffron-950/40'
                      : 'border-amber-500 bg-amber-50/90 shadow-sm ring-2 ring-amber-500/20 dark:border-amber-400 dark:bg-amber-950/40'
                    : 'border-saffron-200/80 bg-white hover:border-saffron-300 hover:bg-saffron-50/30 dark:border-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm shadow-xs transition-colors',
                    isSelected
                      ? r.value === 'devotee'
                        ? 'bg-saffron-500 text-white'
                        : 'bg-amber-500 text-white'
                      : 'bg-saffron-100 text-saffron-800 dark:bg-slate-700 dark:text-slate-200'
                  )}
                >
                  {r.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'text-xs font-bold',
                        isSelected
                          ? r.value === 'devotee'
                            ? 'text-saffron-950 dark:text-saffron-100'
                            : 'text-amber-950 dark:text-amber-100'
                          : 'text-slate-700 dark:text-slate-200'
                      )}
                    >
                      {r.label}
                    </span>
                    {isSelected && (
                      <Check
                        className={cn(
                          'h-3.5 w-3.5',
                          r.value === 'devotee' ? 'text-saffron-600 dark:text-saffron-400' : 'text-amber-600 dark:text-amber-400'
                        )}
                      />
                    )}
                  </div>
                  <p className="truncate text-[10.5px] text-slate-500 dark:text-slate-400">
                    {r.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Firebase Google Sign In */}
      <button
        type="button"
        id="signup-google-btn"
        onClick={handleGoogleSignIn}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-saffron-200/80 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-saffron-300 hover:shadow active:scale-[0.99] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
      >
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        Sign up as {role === 'pandit' ? 'Pandit' : 'Devotee'} with Google
      </button>

      {/* Clean Divider */}
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-saffron-200/80 dark:bg-slate-800" />
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-saffron-600/75 dark:text-slate-400">
          or sign up with email
        </span>
        <div className="h-px flex-1 bg-saffron-200/80 dark:bg-slate-800" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthError message={error} />

        <div>
          <label className="label" htmlFor="fullName">Full name</label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
            <input
              id="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input pl-9"
              placeholder="Your name"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="email">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input pl-9"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="phone">Phone (optional)</label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input pl-9"
              placeholder="+91 98765 43210"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="password">Password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pl-9"
              placeholder="At least 6 characters"
            />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
