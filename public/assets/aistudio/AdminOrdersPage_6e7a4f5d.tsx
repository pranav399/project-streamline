import { useEffect, useState } from 'react';
import { TrendingUp, ShoppingBag, CalendarHeart, Users } from 'lucide-react';
import { firebaseClient, type Order, type Booking, type Profile, type PanditProfile } from '../lib/firebase';
import { formatINR, formatDate, cn } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

export function AdminOrdersPage() {
  const { success, error: toastError } = useToast();
  const [orders, setOrders] = useState<(Order & { profile?: Profile })[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [pandits, setPandits] = useState<PanditProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'orders' | 'bookings'>('orders');
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [o, b, u, p] = await Promise.all([
      firebaseClient.from('orders').select('*, profile:profiles!orders_user_id_fkey(*)').order('created_at', { ascending: false }),
      firebaseClient.from('bookings').select('*, service:services(*), devotee:profiles!bookings_devotee_id_fkey(id, full_name, email)').order('created_at', { ascending: false }),
      firebaseClient.from('profiles').select('*'),
      firebaseClient.from('pandit_profiles').select('*'),
    ]);
    setOrders((o.data as (Order & { profile?: Profile })[]) ?? []);
    setBookings((b.data as Booking[]) ?? []);
    setUsers((u.data as Profile[]) ?? []);
    setPandits((p.data as PanditProfile[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateOrderStatus = async (id: string, status: Order['status']) => {
    setBusy(id);
    const { error } = await firebaseClient.from('orders').update({ status }).eq('id', id);
    setBusy(null);
    if (error) {
      toastError('Update Failed', error.message);
      return;
    }
    success('Order Status Updated!', `Order status changed to "${status}".`);
    load();
  };

  const updateBookingStatus = async (id: string, status: Booking['status']) => {
    setBusy(id);
    const { error } = await firebaseClient.from('bookings').update({ status }).eq('id', id);
    setBusy(null);
    if (error) {
      toastError('Update Failed', error.message);
      return;
    }
    success('Booking Status Updated!', `Booking status changed to "${status}".`);
    load();
  };

  const totalRevenue =
    orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0) +
    bookings.filter((b) => b.status === 'completed').reduce((s, b) => s + Number(b.amount), 0);

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users },
    { label: 'Verified Pandits', value: pandits.filter((p) => p.is_verified).length, icon: TrendingUp },
    { label: 'Total Bookings', value: bookings.length, icon: CalendarHeart },
    { label: 'Total Revenue', value: formatINR(totalRevenue), icon: ShoppingBag },
  ];

  return (
    <div>
      <PageHeader title="Admin Overview" description="Monitor transactions, bookings, and platform health." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card-warm p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 text-saffron-600 shadow-soft dark:bg-slate-800 dark:text-saffron-400">
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-3 text-2xl font-bold text-saffron-900 dark:text-white">{s.value}</p>
              <p className="text-sm text-saffron-600 dark:text-slate-400">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab('orders')}
          className={cn('rounded-full px-3.5 py-1.5 text-xs font-medium transition', tab === 'orders' ? 'bg-saffron-600 text-white shadow-soft' : 'border border-saffron-200 bg-white text-saffron-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300')}
        >
          Samagri Orders
        </button>
        <button
          onClick={() => setTab('bookings')}
          className={cn('rounded-full px-3.5 py-1.5 text-xs font-medium transition', tab === 'bookings' ? 'bg-saffron-600 text-white shadow-soft' : 'border border-saffron-200 bg-white text-saffron-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300')}
        >
          Pooja Bookings
        </button>
      </div>

      {loading ? (
        <SkeletonCard />
      ) : tab === 'orders' ? (
        <div className="card overflow-hidden">
          {orders.length === 0 ? (
            <p className="py-12 text-center text-sm text-saffron-400">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full">
                <thead className="border-b border-saffron-100 dark:border-slate-800">
                  <tr>
                    <th className="table-th">Order</th>
                    <th className="table-th">Customer</th>
                    <th className="table-th">Date</th>
                    <th className="table-th">Total</th>
                    <th className="table-th">Status</th>
                    <th className="table-th text-right">Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-saffron-100 dark:divide-slate-800">
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="table-td font-mono text-xs">#{o.id.slice(0, 8)}</td>
                      <td className="table-td">{o.profile?.full_name ?? '—'}</td>
                      <td className="table-td text-saffron-500">{formatDate(o.created_at)}</td>
                      <td className="table-td font-semibold">{formatINR(o.total)}</td>
                      <td className="table-td"><StatusBadge status={o.status} /></td>
                      <td className="table-td">
                        <div className="flex justify-end gap-1">
                          {(['placed', 'shipped', 'delivered', 'cancelled'] as const).map((st) => (
                            <button
                              key={st}
                              onClick={() => updateOrderStatus(o.id, st)}
                              disabled={busy === o.id || o.status === st}
                              className={cn('rounded px-2 py-1 text-xs capitalize transition disabled:opacity-40', o.status === st ? 'bg-saffron-100 text-saffron-700 dark:bg-saffron-500/15 dark:text-saffron-300' : 'text-saffron-600 hover:bg-saffron-50 dark:hover:bg-slate-800')}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {bookings.length === 0 ? (
            <p className="py-12 text-center text-sm text-saffron-400">No bookings yet.</p>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full">
                <thead className="border-b border-saffron-100 dark:border-slate-800">
                  <tr>
                    <th className="table-th">Service</th>
                    <th className="table-th">Devotee</th>
                    <th className="table-th">Scheduled</th>
                    <th className="table-th">Amount</th>
                    <th className="table-th">Status</th>
                    <th className="table-th text-right">Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-saffron-100 dark:divide-slate-800">
                  {bookings.map((b) => (
                    <tr key={b.id}>
                      <td className="table-td">{b.service?.name ?? '—'}</td>
                      <td className="table-td">{b.devotee?.full_name ?? '—'}</td>
                      <td className="table-td text-saffron-500">{formatDate(b.scheduled_at)}</td>
                      <td className="table-td font-semibold">{formatINR(b.amount)}</td>
                      <td className="table-td"><StatusBadge status={b.status} /></td>
                      <td className="table-td">
                        <div className="flex justify-end gap-1">
                          {(['pending', 'confirmed', 'completed', 'cancelled'] as const).map((st) => (
                            <button
                              key={st}
                              onClick={() => updateBookingStatus(b.id, st)}
                              disabled={busy === b.id || b.status === st}
                              className={cn('rounded px-2 py-1 text-xs capitalize transition disabled:opacity-40', b.status === st ? 'bg-saffron-100 text-saffron-700 dark:bg-saffron-500/15 dark:text-saffron-300' : 'text-saffron-600 hover:bg-saffron-50 dark:hover:bg-slate-800')}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
