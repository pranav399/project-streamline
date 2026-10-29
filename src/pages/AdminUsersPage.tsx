import { useEffect, useState } from 'react';
import { Search, Loader2, Sparkles, Shield, User, Award, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { firebaseClient, type Profile } from '../lib/firebase';
import { formatDate, initials, cn } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

export function AdminUsersPage() {
  const { success, error: toastError, info } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await firebaseClient.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers((data as Profile[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const handleSync = () => load();
    window.addEventListener('poojaconnect_firebase_sync', handleSync);
    return () => window.removeEventListener('poojaconnect_firebase_sync', handleSync);
  }, []);

  const filtered = users.filter((u) => {
    const matchRole = roleFilter === 'All' || u.role === roleFilter;
    const q = query.toLowerCase();
    const matchQ = !q || (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
    return matchRole && matchQ;
  });

  const setRole = async (id: string, newRole: Profile['role']) => {
    setBusy(id);
    const target = users.find((u) => u.id === id);
    if (!target) {
      setBusy(null);
      return;
    }

    if (target.role === newRole) {
      setBusy(null);
      return;
    }

    const previousRole = target.role;

    // 1. Update the profile role
    const { error } = await firebaseClient.from('profiles').update({ role: newRole }).eq('id', id);
    if (error) {
      setBusy(null);
      toastError('Role Update Failed', error.message);
      return;
    }

    // 2. Synchronize with pandit_profiles
    if (newRole === 'pandit') {
      // User is promoted to Pandit: Create or activate pending pandit_profile so it appears in "Verify Pandits"
      const { data: existingList } = await firebaseClient
        .from('pandit_profiles')
        .select('*')
        .eq('user_id', id);

      const existing = (existingList as any[])?.[0];
      if (!existing) {
        await firebaseClient.from('pandit_profiles').insert({
          id: 'pp_' + id,
          user_id: id,
          bio: `${target.full_name || 'Pandit'} is a verified Vedic ritual specialist.`,
          languages: ['Hindi', 'Sanskrit'],
          specialties: ['Pooja Rituals', 'Vedic Chanting'],
          experience_years: 5,
          city: 'Varanasi',
          base_price: 1500,
          rating: 4.8,
          review_count: 0,
          is_verified: false, // Starts as PENDING so admin approves them in Verify Pandits
          is_available: true,
          total_earnings: 0,
          completed_bookings: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        await firebaseClient.from('pandit_profiles').update({ is_verified: false }).eq('user_id', id);
      }

      success(
        'Assigned Pandit Role! 🪔',
        `${target.full_name || target.email} is now listed in "Verify Pandits" pending admin approval.`,
        {
          label: 'Verify Pandits',
          href: '/app/admin-pandits',
        }
      );
    } else {
      // If user was previously a pandit and now changed to devotee or admin:
      // Remove or deactivate their pandit_profile so they leave the verify pandit list cleanly
      if (previousRole === 'pandit') {
        await firebaseClient.from('pandit_profiles').delete().eq('user_id', id);
        info(
          'Role Updated',
          `${target.full_name || target.email} is now a ${newRole}. Pandit profile was removed.`
        );
      } else {
        success(
          'Role Updated Successfully',
          `${target.full_name || target.email} is now assigned "${newRole}".`
        );
      }
    }

    setBusy(null);
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="View and manage all registered users and assign system roles."
        actions={
          <Link
            to="/app/admin-pandits"
            className="flex items-center gap-1.5 rounded-xl border border-saffron-200 bg-white px-3 py-1.5 text-xs font-semibold text-saffron-800 shadow-2xs hover:bg-saffron-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <Award className="h-3.5 w-3.5 text-saffron-600" />
            <span>Verify Pandits</span>
            <ExternalLink className="h-3 w-3 text-saffron-400" />
          </Link>
        }
      />

      {/* Helpful banner explaining the role sync */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
        <Sparkles className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <p>
          <strong className="font-bold">Role Workflow:</strong> Changing any user to{' '}
          <span className="font-bold text-saffron-700 dark:text-saffron-300">Pandit</span> automatically creates their profile and places them into{' '}
          <Link to="/app/admin-pandits" className="underline font-bold hover:text-saffron-600">
            Verify Pandits
          </Link>{' '}
          as <em>Pending Approval</em>. Changing a pandit to <em>Devotee</em> or <em>Admin</em> removes their pandit profile.
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="input pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['All', 'devotee', 'pandit', 'admin'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition',
                roleFilter === r
                  ? 'bg-saffron-600 text-white shadow-soft'
                  : 'border border-saffron-200 bg-white text-saffron-700 hover:bg-saffron-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SkeletonCard />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead className="border-b border-saffron-100 dark:border-slate-800">
                <tr>
                  <th className="table-th">User</th>
                  <th className="table-th">Current Role</th>
                  <th className="table-th">Joined</th>
                  <th className="table-th text-right">Change Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-saffron-100 dark:divide-slate-800">
                {Array.from(new Map(filtered.map((u) => [u.id, u])).values()).map((u, idx) => {
                  const isUserBusy = busy === u.id;
                  return (
                    <tr key={`user-row-${u.id}-${idx}`} className="hover:bg-saffron-50/50 dark:hover:bg-slate-800/50 transition">
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-saffron-200 bg-gradient-to-br from-saffron-500 to-vermillion-600 text-xs font-bold text-white shadow-2xs">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt={u.full_name || 'User'} className="h-full w-full object-cover" />
                            ) : (
                              initials(u.full_name, u.email)
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-saffron-900 dark:text-white truncate">
                              {u.full_name || 'User'}
                            </p>
                            <p className="text-xs text-saffron-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-td">
                        <Badge
                          variant={u.role === 'admin' ? 'saffron' : u.role === 'pandit' ? 'amber' : 'gray'}
                          className="capitalize"
                        >
                          {u.role}
                        </Badge>
                      </td>
                      <td className="table-td text-xs text-saffron-600 dark:text-slate-400">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="table-td">
                        <div className="flex items-center justify-end gap-1.5">
                          {isUserBusy ? (
                            <span className="flex items-center gap-1 text-xs text-saffron-600 px-3 py-1">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Updating…</span>
                            </span>
                          ) : (
                            (['devotee', 'pandit', 'admin'] as const).map((r) => {
                              const isActive = u.role === r;
                              return (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => setRole(u.id, r)}
                                  disabled={isUserBusy || isActive}
                                  className={cn(
                                    'rounded-lg px-2.5 py-1 text-xs font-bold capitalize transition shadow-2xs',
                                    isActive
                                      ? r === 'pandit'
                                        ? 'bg-amber-500 text-white shadow-soft cursor-default'
                                        : r === 'admin'
                                        ? 'bg-saffron-600 text-white shadow-soft cursor-default'
                                        : 'bg-slate-600 text-white shadow-soft cursor-default dark:bg-slate-700'
                                      : 'border border-saffron-200 bg-white text-saffron-700 hover:bg-saffron-50 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 dark:hover:bg-slate-800'
                                  )}
                                >
                                  {r}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="py-12 text-center text-sm text-saffron-400">No users found.</p>
          )}
        </div>
      )}
    </div>
  );
}
