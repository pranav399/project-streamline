import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { firebaseClient, type Profile } from '../lib/firebase';
import { formatDate, initials, cn } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

export function AdminUsersPage() {
  const { success, error: toastError } = useToast();
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

  useEffect(() => { load(); }, []);

  const filtered = users.filter((u) => {
    const matchRole = roleFilter === 'All' || u.role === roleFilter;
    const q = query.toLowerCase();
    const matchQ = !q || (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
    return matchRole && matchQ;
  });

  const setRole = async (id: string, role: Profile['role']) => {
    setBusy(id);
    const target = users.find((u) => u.id === id);
    const { error } = await firebaseClient.from('profiles').update({ role }).eq('id', id);
    setBusy(null);
    if (error) { toastError('Role Update Failed', error.message); return; }
    success(
      'User Role Updated Successfully!',
      `${target?.full_name || target?.email || 'User'} is now assigned the "${role}" role.`
    );
    load();
  };

  return (
    <div>
      <PageHeader title="User Management" description="View and manage all registered users." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users…" className="input pl-9" />
        </div>
        <div className="flex gap-2">
          {['All', 'devotee', 'pandit', 'admin'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition',
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
                  <th className="table-th">Role</th>
                  <th className="table-th">Joined</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-saffron-100 dark:divide-slate-800">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-saffron-50/50 dark:hover:bg-slate-800/50">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-saffron-500 to-vermillion-600 text-xs font-bold text-white">
                          {initials(u.full_name, u.email)}
                        </span>
                        <div>
                          <p className="font-medium text-saffron-900 dark:text-white">{u.full_name || 'User'}</p>
                          <p className="text-xs text-saffron-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-td">
                      <Badge variant={u.role === 'admin' ? 'saffron' : u.role === 'pandit' ? 'blue' : 'gray'}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="table-td text-saffron-500">{formatDate(u.created_at)}</td>
                    <td className="table-td">
                      <div className="flex justify-end gap-1">
                        {(['devotee', 'pandit', 'admin'] as const).map((r) => (
                          <button
                            key={r}
                            onClick={() => setRole(u.id, r)}
                            disabled={busy === u.id || u.role === r}
                            className={cn(
                              'rounded-lg px-2 py-1 text-xs font-medium capitalize transition disabled:opacity-40',
                              u.role === r
                                ? 'bg-saffron-100 text-saffron-700 dark:bg-saffron-500/15 dark:text-saffron-300'
                                : 'text-saffron-600 hover:bg-saffron-50 dark:hover:bg-slate-800'
                            )}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
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
