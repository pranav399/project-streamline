import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, LogIn, KeyRound, ShieldCheck, ArrowRight, RefreshCw, CheckCircle2, Check, UserCheck, Sparkles, Shield } from 'lucide-react';
import { AuthShell, AuthLink, AuthError } from '../components/auth/AuthShell';
import { Modal } from '../components/ui/Modal';
import { useAuth, type GoogleAuthUser } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/utils';
import type { Role } from '../lib/firebase';

type AuthTab = 'password' | 'otp';

export function LoginPage() {
  const { signIn, signInWithGoogle, completeGoogleSignUp, sendOTP, verifyOTP } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [authTab, setAuthTab] = useState<AuthTab>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  // OTP state
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);
  const [deliveryInfo, setDeliveryInfo] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Post-Google Account Selection Modal State
  const [pendingGoogleUser, setPendingGoogleUser] = useState<GoogleAuthUser | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'devotee' | 'pandit'>('devotee');
  const [completingGoogle, setCompletingGoogle] = useState(false);

  // Handle Google Login
  const handleGoogleSignIn = async () => {
    setError(null);
    setBusy(true);
    const res = await signInWithGoogle();
    setBusy(false);

    if (res.error) {
      setError(res.error);
      toastError('Google Sign-In Failed', res.error);
      return;
    }

    // If new user signing in with Google -> prompt to create Devotee or Pandit account
    if (res.isNewUser && res.googleUser) {
      setPendingGoogleUser(res.googleUser);
      setSelectedRole('devotee');
      setShowRoleModal(true);
      return;
    }

    // Existing user
    success('Welcome back to PoojaConnect!', 'Signed in successfully with your Google Account.', {
      label: 'Open Dashboard',
      href: '/app',
    });
    sessionStorage.setItem('ask_profile_update', 'true');
    navigate('/app');
  };

  // Confirm account creation after Google Auth
  const handleConfirmRoleAndCreateAccount = async () => {
    if (!pendingGoogleUser) return;
    setCompletingGoogle(true);
    const { error: signUpErr } = await completeGoogleSignUp(pendingGoogleUser, selectedRole);
    setCompletingGoogle(false);

    if (signUpErr) {
      toastError('Account Creation Failed', signUpErr);
      return;
    }

    setShowRoleModal(false);
    success(
      `Welcome ${selectedRole === 'pandit' ? 'Pandit Ji' : 'Devotee'}! 🙏`,
      `Your ${selectedRole === 'pandit' ? 'Pandit' : 'Devotee'} account has been created successfully.`,
      {
        label: 'Open Dashboard',
        href: '/app',
      }
    );
    sessionStorage.setItem('ask_profile_update', 'true');
    navigate('/app');
  };

  // Handle Standard Password Login
  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      const msg = 'Please enter both your email address and password.';
      setError(msg);
      toastError('Missing Credentials', msg);
      return;
    }
    setBusy(true);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) {
      const errFormatted = error.includes('Invalid login') ? 'Invalid email or password.' : error;
      setError(errFormatted);
      toastError('Login Failed', errFormatted, {
        label: 'Need Help? Try Demo Access',
        href: '/demo-access',
      });
      return;
    }
    success('Welcome back to PoojaConnect!', 'You have successfully signed in.', {
      label: 'Go to Dashboard',
      href: '/app',
    });
    navigate('/app');
  };

  // Handle Send OTP
  const handleSendOTP = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (!email || !email.includes('@')) {
      const msg = 'Please enter a valid email address.';
      setError(msg);
      toastError('Invalid Email', msg);
      return;
    }

    setBusy(true);
    const res = await sendOTP(email.trim());
    setBusy(false);

    if (!res.success) {
      setError(res.message);
      toastError('OTP Delivery Failed', res.message);
      return;
    }

    setOtpStep('verify');
    setDeliveryInfo(res.deliveryMethod || 'Email');
    if (res.simulatedOtp) {
      setSimulatedCode(res.simulatedOtp);
    }
    success('OTP Sent Successfully!', res.message);
  };

  // Handle Verify OTP
  const handleVerifyOTP = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!otp || otp.trim().length < 6) {
      const msg = 'Please enter the full 6-digit OTP code.';
      setError(msg);
      toastError('Incomplete OTP', msg);
      return;
    }

    setBusy(true);
    const res = await verifyOTP(email.trim(), otp.trim());
    setBusy(false);

    if (!res.success) {
      setError(res.message);
      toastError('Verification Failed', res.message);
      return;
    }

    success('Authentication Successful!', 'Welcome to PoojaConnect! Your OTP was verified.', {
      label: 'Open App',
      href: '/app',
    });
    navigate('/app');
  };

  return (
    <AuthShell
      variant="user"
      title="Devotee & Pandit Sign In"
      subtitle="Sign in to your account to book rituals, consult pandits, and order samagri."
      footer={
        <div className="space-y-2">
          <div>
            New to PoojaConnect? <AuthLink to="/signup">Create an account</AuthLink>
          </div>
          <div className="pt-1 text-xs text-slate-500 dark:text-slate-400">
            Platform staff or verifier?{' '}
            <Link
              to="/admin-login"
              className="font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400"
            >
              Go to Administrator Login →
            </Link>
          </div>
        </div>
      }
    >
      {/* Visual Identity Pill & Switcher Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-saffron-200 bg-saffron-50 px-3 py-1 text-xs font-semibold text-saffron-900 dark:border-saffron-800/80 dark:bg-saffron-950/60 dark:text-saffron-300">
          <Sparkles className="h-3.5 w-3.5 text-saffron-600 dark:text-saffron-400" />
          <span>Devotee & Pandit Portal</span>
        </div>
        <Link
          to="/admin-login"
          className="inline-flex items-center gap-1 rounded-lg border border-purple-200/90 bg-purple-50/70 px-2.5 py-1 text-xs font-semibold text-purple-700 transition hover:bg-purple-100 dark:border-purple-800/80 dark:bg-purple-950/50 dark:text-purple-300"
        >
          <Shield className="h-3 w-3 text-purple-600 dark:text-purple-400" />
          <span>Admin Login →</span>
        </Link>
      </div>

      {/* Firebase Google Sign In */}
      <button
        type="button"
        id="google-signin-btn"
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
        Continue with Google
      </button>

      {/* Clean Divider */}
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-saffron-200/80 dark:bg-slate-800" />
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-saffron-600/75 dark:text-slate-400">
          or continue with
        </span>
        <div className="h-px flex-1 bg-saffron-200/80 dark:bg-slate-800" />
      </div>

      {/* Tab Switcher */}
      <div className="mb-5 flex rounded-lg bg-saffron-100/60 p-1 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => {
            setAuthTab('password');
            setError(null);
          }}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition ${
            authTab === 'password'
              ? 'bg-white text-saffron-900 shadow-sm dark:bg-slate-900 dark:text-white'
              : 'text-saffron-700 hover:text-saffron-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Lock className="h-3.5 w-3.5 text-saffron-500" />
          Password Login
        </button>
        <button
          type="button"
          onClick={() => {
            setAuthTab('otp');
            setError(null);
          }}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition ${
            authTab === 'otp'
              ? 'bg-white text-saffron-900 shadow-sm dark:bg-slate-900 dark:text-white'
              : 'text-saffron-700 hover:text-saffron-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <KeyRound className="h-3.5 w-3.5 text-saffron-500" />
          Email OTP Code
        </button>
      </div>

      <AuthError message={error} />

      {authTab === 'password' ? (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email address</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pl-9"
                placeholder="you@example.com"
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-9"
                placeholder="••••••••"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      ) : (
        /* OTP Login Tab */
        <div>
          {otpStep === 'request' ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="rounded-lg border border-saffron-200 bg-saffron-50/50 p-3.5 dark:border-saffron-900/30 dark:bg-saffron-950/20">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-saffron-600 dark:text-saffron-400" />
                  <div className="text-xs text-saffron-900 dark:text-saffron-200">
                    <p className="font-semibold">Instant Passwordless Verification</p>
                    <p className="mt-0.5 text-saffron-700 dark:text-saffron-300">
                      We will generate a 6-digit verification OTP and send it directly to your email address.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="label" htmlFor="otp-email">Your Email Address</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
                  <input
                    id="otp-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-9"
                    placeholder="devotee@example.com"
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {busy ? 'Generating OTP…' : 'Send Verification OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="rounded-lg border border-saffron-200 bg-saffron-50/80 p-3.5 dark:border-saffron-900/40 dark:bg-saffron-950/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-saffron-800 dark:text-saffron-200">
                    Code sent to <strong className="font-semibold">{email}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtpStep('request')}
                    className="text-saffron-600 underline hover:text-saffron-800 dark:text-saffron-400"
                  >
                    Change email
                  </button>
                </div>
                {deliveryInfo && (
                  <p className="mt-1 text-[11px] text-saffron-600 dark:text-saffron-400">
                    Dispatched via: <span className="font-medium">{deliveryInfo}</span>
                  </p>
                )}
              </div>

              {simulatedCode && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-amber-600" />
                      Instant Test OTP Generated:
                    </span>
                    <span className="rounded bg-amber-200/80 px-2 py-0.5 font-mono text-sm font-bold tracking-widest dark:bg-amber-800 dark:text-white">
                      {simulatedCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtp(simulatedCode)}
                    className="mt-2 w-full rounded border border-amber-300 bg-white py-1 text-center font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/60 dark:text-amber-100"
                  >
                    Click to Auto-fill Code ({simulatedCode})
                  </button>
                </div>
              )}

              <div>
                <label className="label" htmlFor="otp-input">Enter 6-Digit OTP Code</label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
                  <input
                    id="otp-input"
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="input pl-9 font-mono text-lg tracking-widest"
                    placeholder="123456"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSendOTP()}
                  disabled={busy}
                  className="flex items-center gap-1.5 text-xs text-saffron-600 hover:text-saffron-800 dark:text-saffron-400"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Resend OTP Code
                </button>
                <span className="text-[11px] text-slate-400">Valid for 10 minutes</span>
              </div>

              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {busy ? 'Verifying OTP…' : 'Verify OTP & Sign In'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Dedicated Administrator Portal Switcher */}
      <div className="pt-5">
        <div className="relative flex items-center justify-center border-t border-saffron-200/80 dark:border-slate-800">
          <span className="bg-white px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:bg-slate-900">
            Administrative Management
          </span>
        </div>
        
        <div className="mt-3 rounded-xl border border-purple-200/90 bg-gradient-to-br from-purple-50/70 to-indigo-50/50 p-3.5 dark:border-purple-900/40 dark:bg-purple-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white shadow-xs">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-purple-950 dark:text-purple-200">System Administrator Portal</p>
                <p className="text-[11px] text-purple-700/90 dark:text-purple-300">
                  Manage pandit verifications, pooja listings, and financial audit reports.
                </p>
              </div>
            </div>
            <Link
              to="/admin-login"
              id="admin-login-redirect-btn"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-purple-700 active:scale-95 shrink-0"
            >
              <span>Go to Admin Login</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Account Type Selection Modal for Google Sign In */}
      <Modal
        open={showRoleModal}
        onClose={() => {
          if (!completingGoogle) setShowRoleModal(false);
        }}
        title="Choose Your Account Type"
        size="md"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowRoleModal(false)}
              disabled={completingGoogle}
              className="rounded-xl border border-saffron-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-saffron-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              id="confirm-create-account-btn"
              onClick={handleConfirmRoleAndCreateAccount}
              disabled={completingGoogle}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-saffron-600 to-vermillion-600 px-5 py-2.5 text-xs font-bold text-white shadow-soft transition hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              {completingGoogle ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create {selectedRole === 'pandit' ? 'Pandit' : 'Devotee'} Account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-saffron-200/80 bg-saffron-50/70 p-3.5 dark:border-saffron-900/60 dark:bg-saffron-950/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-saffron-500 text-white font-bold text-sm shadow-xs">
                {pendingGoogleUser?.displayName?.[0] || 'G'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-saffron-950 dark:text-white">
                  {pendingGoogleUser?.displayName || 'Google Account'}
                </p>
                <p className="truncate text-[11px] text-saffron-700 dark:text-slate-400">
                  {pendingGoogleUser?.email}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-saffron-900 dark:text-saffron-300 font-medium leading-relaxed">
              Google sign in successful! Please select whether you want to create a <strong>Devotee</strong> account or a <strong>Pandit</strong> account:
            </p>
          </div>

          <div className="space-y-3">
            {/* Devotee Card */}
            <button
              type="button"
              id="select-devotee-account-card"
              onClick={() => setSelectedRole('devotee')}
              className={cn(
                'flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition-all',
                selectedRole === 'devotee'
                  ? 'border-saffron-500 bg-saffron-50/90 shadow-md ring-2 ring-saffron-500/30 dark:border-saffron-400 dark:bg-saffron-950/40'
                  : 'border-saffron-200/70 bg-white hover:border-saffron-300 hover:bg-saffron-50/30 dark:border-slate-800 dark:bg-slate-850'
              )}
            >
              <div className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl shadow-xs transition-colors',
                selectedRole === 'devotee' ? 'bg-saffron-500 text-white' : 'bg-saffron-100 dark:bg-slate-750'
              )}>
                🪔
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-display text-sm font-bold text-saffron-950 dark:text-white">
                    Devotee Account
                  </p>
                  {selectedRole === 'devotee' && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-saffron-500 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                  Book sacred poojas, order pure samagri kits, and receive divine blessings
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2 text-[10px] text-saffron-800 dark:text-saffron-300">
                  <span className="rounded-md bg-saffron-100/90 px-2 py-0.5 font-semibold dark:bg-saffron-900/40">Home & Online Poojas</span>
                  <span className="rounded-md bg-saffron-100/90 px-2 py-0.5 font-semibold dark:bg-saffron-900/40">Samagri Shop</span>
                  <span className="rounded-md bg-saffron-100/90 px-2 py-0.5 font-semibold dark:bg-saffron-900/40">Sankalp Patra</span>
                </div>
              </div>
            </button>

            {/* Pandit Card */}
            <button
              type="button"
              id="select-pandit-account-card"
              onClick={() => setSelectedRole('pandit')}
              className={cn(
                'flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition-all',
                selectedRole === 'pandit'
                  ? 'border-amber-500 bg-amber-50/90 shadow-md ring-2 ring-amber-500/30 dark:border-amber-400 dark:bg-amber-950/40'
                  : 'border-saffron-200/70 bg-white hover:border-amber-300 hover:bg-amber-50/30 dark:border-slate-800 dark:bg-slate-850'
              )}
            >
              <div className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl shadow-xs transition-colors',
                selectedRole === 'pandit' ? 'bg-amber-500 text-white' : 'bg-amber-100 dark:bg-slate-750'
              )}>
                🕉️
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-display text-sm font-bold text-saffron-950 dark:text-white">
                    Pandit / Acharya Account
                  </p>
                  {selectedRole === 'pandit' && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                  Conduct Vedic ceremonies, accept bookings, and withdraw Dakshina earnings
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2 text-[10px] text-amber-800 dark:text-amber-300">
                  <span className="rounded-md bg-amber-100/90 px-2 py-0.5 font-semibold dark:bg-amber-900/40">Ritual Calendar</span>
                  <span className="rounded-md bg-amber-100/90 px-2 py-0.5 font-semibold dark:bg-amber-900/40">Dakshina Wallet</span>
                  <span className="rounded-md bg-amber-100/90 px-2 py-0.5 font-semibold dark:bg-amber-900/40">Bank & UPI Withdrawals</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </Modal>
    </AuthShell>
  );
}
