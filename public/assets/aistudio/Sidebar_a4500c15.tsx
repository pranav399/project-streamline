import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarHeart,
  ShoppingBag,
  Package,
  Users,
  ShieldCheck,
  ChevronLeft,
  Flame,
  LogOut,
  User,
  Store,
  Landmark,
  Award,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { Role } from '../../lib/firebase';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}

const nav: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, roles: ['devotee', 'pandit', 'admin'] },
  { to: '/app/temple-heritage', label: 'Temple Heritage', icon: Landmark, roles: ['devotee', 'pandit', 'admin'] },
  { to: '/app/sankalp-patra', label: 'Sankalp Patra', icon: Award, roles: ['devotee', 'pandit'] },

  // Devotee pages
  { to: '/app/services', label: 'Book a Pooja', icon: CalendarHeart, roles: ['devotee'] },
  { to: '/app/pandits', label: 'Find Pandits', icon: ShieldCheck, roles: ['devotee'] },
  { to: '/app/bookings', label: 'My Bookings', icon: CalendarHeart, roles: ['devotee'] },
  { to: '/app/shop', label: 'Samagri Shop', icon: ShoppingBag, roles: ['devotee'] },
  { to: '/app/cart', label: 'Cart', icon: Package, roles: ['devotee'] },
  { to: '/app/orders', label: 'My Orders', icon: Store, roles: ['devotee'] },

  // Pandit pages
  { to: '/app/schedule', label: 'My Schedule', icon: CalendarHeart, roles: ['pandit'] },
  { to: '/app/earnings', label: 'Earnings & Profile', icon: ShoppingBag, roles: ['pandit'] },

  // Admin pages
  { to: '/app/admin-users', label: 'Users', icon: Users, roles: ['admin'] },
  { to: '/app/admin-pandits', label: 'Verify Pandits', icon: ShieldCheck, roles: ['admin'] },
  { to: '/app/admin-services', label: 'Services', icon: CalendarHeart, roles: ['admin'] },
  { to: '/app/admin-orders', label: 'Transactions', icon: Store, roles: ['admin'] },

  // Account profile for all authenticated roles
  { to: '/app/profile', label: 'My Profile', icon: User, roles: ['devotee', 'pandit', 'admin'] },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  unreadNotifs: number;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose, unreadNotifs }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const { info } = useToast();
  const navigate = useNavigate();
  const role: Role = profile?.role ?? 'devotee';

  const handleSignOut = async () => {
    const wasAdmin = role === 'admin';
    await signOut();
    info('Logged Out Successfully', 'You have been safely signed out. Har Har Mahadev!', {
      label: 'Sign In Again',
      href: wasAdmin ? '/admin-login' : '/login',
    });
    navigate(wasAdmin ? '/admin-login' : '/login');
  };

  const items = nav.filter((n) => n.roles.includes(role));

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-saffron-950/40 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-saffron-200/70 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0',
          collapsed ? 'w-[76px]' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-saffron-200/70 px-4 dark:border-slate-800">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-saffron-500 to-vermillion-600 text-white shadow-soft">
            <Flame className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold text-saffron-900 dark:text-white">
                PoojaConnect
              </p>
              <p className="truncate text-xs text-saffron-500 dark:text-slate-400">
                {role === 'devotee' ? 'Devotee' : role === 'pandit' ? 'Pandit' : 'Admin'} Portal
              </p>
            </div>
          )}
          <button
            onClick={onToggle}
            className="ml-auto hidden rounded-lg p-1.5 text-saffron-400 hover:bg-saffron-100 hover:text-saffron-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 lg:block"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-thin p-3">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={`${item.to}-${idx}`}
                to={item.to}
                end={item.to === '/app'}
                onClick={onMobileClose}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-saffron-50 text-saffron-700 dark:bg-saffron-500/10 dark:text-saffron-300'
                      : 'text-saffron-700/80 hover:bg-saffron-50 hover:text-saffron-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
                    collapsed && 'justify-center'
                  )
                }
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && item.to === '/app' && unreadNotifs > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-vermillion-500 px-1 text-xs font-semibold text-white">
                    {unreadNotifs}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {role === 'devotee' && (
          <div className="px-3 pb-2">
            <button
              onClick={() => {
                onMobileClose();
                window.dispatchEvent(new CustomEvent('open-devotee-chatbot'));
              }}
              className={cn(
                'group flex w-full items-center gap-2.5 rounded-xl bg-gradient-to-r from-saffron-500/10 to-amber-500/20 border border-saffron-300/60 px-3 py-2 text-xs font-semibold text-saffron-800 transition hover:bg-saffron-500/20 hover:border-saffron-400 dark:border-saffron-800/60 dark:text-saffron-300 dark:hover:bg-saffron-900/40',
                collapsed && 'justify-center p-2'
              )}
              title="Ask Pooja Mitra Bot"
            >
              <Flame className="h-4 w-4 text-saffron-600 animate-pulse shrink-0" />
              {!collapsed && <span>Pooja Mitra Bot</span>}
            </button>
          </div>
        )}

        <div className="border-t border-saffron-200/70 p-3 dark:border-slate-800">
          <button
            onClick={handleSignOut}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-saffron-700 transition hover:bg-vermillion-50 hover:text-vermillion-700 dark:text-slate-300 dark:hover:bg-vermillion-500/10 dark:hover:text-vermillion-400',
              collapsed && 'justify-center'
            )}
            title={collapsed ? 'Sign out' : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
