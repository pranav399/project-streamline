import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, Moon, Sun, Bell, Flame, Check, User, LogOut, ChevronDown, Sparkles } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { firebaseClient, type AppNotification } from '../../lib/firebase';
import { cn, initials, relativeTime } from '../../lib/utils';

interface TopbarProps {
  onMobileMenu: () => void;
  unreadNotifs: number;
  setUnreadNotifs: (n: number) => void;
}

export function Topbar({ onMobileMenu, unreadNotifs, setUnreadNotifs }: TopbarProps) {
  const { theme, toggle } = useTheme();
  const { profile, signOut } = useAuth();
  const { info } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await firebaseClient
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(15);
      if (data) {
        setNotifs(data as AppNotification[]);
        setUnreadNotifs(data.filter((n) => !n.is_read).length);
      }
    })();
  }, [profile, setUnreadNotifs]);

  useEffect(() => {
    if (!profile) return;
    const channel = firebaseClient
      .channel('topbar-notifs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        (payload) => {
          setNotifs((prev) => [payload.new as AppNotification, ...prev].slice(0, 15));
          setUnreadNotifs(unreadNotifs + 1);
        }
      )
      .subscribe();
    return () => { firebaseClient.removeChannel(channel); };
  }, [profile, unreadNotifs, setUnreadNotifs]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markAllRead = async () => {
    if (!profile) return;
    await firebaseClient.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadNotifs(0);
  };

  const handleSignOut = async () => {
    const wasAdmin = profile?.role === 'admin';
    await signOut();
    setUserMenuOpen(false);
    info('Logged Out Successfully', 'You have been safely signed out. Har Har Mahadev!', {
      label: 'Sign In Again',
      href: wasAdmin ? '/admin-login' : '/login',
    });
    navigate(wasAdmin ? '/admin-login' : '/login');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-saffron-200/70 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
      <button
        onClick={onMobileMenu}
        className="rounded-lg p-2 text-saffron-700 hover:bg-saffron-100 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2 lg:hidden">
        <Flame className="h-5 w-5 text-saffron-600" />
        <span className="font-display text-sm font-bold text-saffron-900 dark:text-white">PoojaConnect</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={toggle}
          className="rounded-lg p-2 text-saffron-700 hover:bg-saffron-100 dark:text-slate-200 dark:hover:bg-slate-800"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="relative rounded-lg p-2 text-saffron-700 hover:bg-saffron-100 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadNotifs > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-vermillion-500 px-1 text-[10px] font-bold text-white">
                {unreadNotifs}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-saffron-200 bg-white shadow-pop dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-saffron-200/70 px-4 py-3 dark:border-slate-800">
                <p className="text-sm font-semibold text-saffron-900 dark:text-white">Notifications</p>
                {unreadNotifs > 0 && (
                  <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-medium text-saffron-600 hover:text-saffron-800 dark:text-saffron-400">
                    <Check className="h-3.5 w-3.5" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {notifs.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-saffron-400">No notifications yet</p>
                ) : (
                  notifs.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        'border-b border-saffron-100 px-4 py-3 dark:border-slate-800',
                        !n.is_read && 'bg-saffron-50/60 dark:bg-saffron-500/5'
                      )}
                    >
                      <p className="text-sm font-medium text-saffron-900 dark:text-white">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-saffron-600 dark:text-slate-400">{n.body}</p>}
                      <p className="mt-1 text-xs text-saffron-400">{relativeTime(n.created_at)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {profile && (
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-saffron-100/70 dark:hover:bg-slate-800 focus:outline-hidden"
              aria-expanded={userMenuOpen}
              aria-label="User account menu"
            >
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-saffron-500 to-vermillion-600 text-xs font-bold text-white shadow-sm ring-2 ring-saffron-200 dark:ring-saffron-900">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || 'User'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials(profile.full_name, profile.email)
                )}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-bold text-saffron-950 dark:text-white leading-tight">{profile.full_name || 'User'}</p>
                <p className="text-[10px] capitalize font-medium text-saffron-600 dark:text-saffron-400">{profile.role}</p>
              </div>
              <ChevronDown className={cn('h-3.5 w-3.5 text-saffron-500 transition-transform duration-200 hidden sm:block', userMenuOpen && 'rotate-180')} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-saffron-200 bg-white/95 p-1.5 shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 animate-slide-in">
                <div className="border-b border-saffron-100 px-3 py-2.5 dark:border-slate-800">
                  <p className="text-xs font-bold text-saffron-950 dark:text-white truncate">{profile.full_name || 'Sacred User'}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{profile.email}</p>
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-saffron-50 px-2 py-0.5 text-[10px] font-bold text-saffron-700 dark:bg-saffron-950/60 dark:text-saffron-300">
                    <Sparkles className="h-3 w-3" />
                    <span className="capitalize">{profile.role} Portal</span>
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    to="/app/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-saffron-50 hover:text-saffron-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <User className="h-4 w-4 text-saffron-600" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    to="/demo-access"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-saffron-50 hover:text-saffron-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span>Switch Role / Demo</span>
                  </Link>
                </div>

                <div className="border-t border-saffron-100 pt-1 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
