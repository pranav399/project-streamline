import { useEffect, useState } from 'react';
import { Store, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { firebaseClient, type Order } from '../lib/firebase';
import { formatINR, formatDate } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';

export function OrdersPage() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      const { data } = await firebaseClient
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      setOrders((data as Order[]) ?? []);
      setLoading(false);
    })();
  }, [profile]);

  return (
    <div>
      <PageHeader title="My Orders" description="Track your samagri orders and delivery status." />

      {loading ? (
        <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
      ) : orders.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <Store className="h-10 w-10 text-saffron-300" />
          <p className="font-semibold text-saffron-900 dark:text-white">No orders yet</p>
          <p className="text-sm text-saffron-500">Your samagri orders will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="card p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-saffron-600" />
                    <h3 className="font-semibold text-saffron-900 dark:text-white">Order #{o.id.slice(0, 8)}</h3>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="mt-1 text-xs text-saffron-500 dark:text-slate-400">
                    Placed on {formatDate(o.created_at)} · {o.items?.length ?? 0} items
                  </p>
                </div>
                <span className="text-lg font-bold text-saffron-700 dark:text-saffron-300">{formatINR(o.total)}</span>
              </div>
              {o.shipping_address && (
                <p className="mt-3 rounded-lg bg-saffron-50/60 px-3 py-2 text-xs text-saffron-600 dark:bg-slate-800/50 dark:text-slate-400">
                  📍 {o.shipping_address}
                </p>
              )}
              {o.items && o.items.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-saffron-100 pt-3 dark:border-slate-800">
                  {o.items.map((it) => (
                    <div key={it.id} className="flex justify-between text-sm">
                      <span className="text-saffron-700 dark:text-slate-300">{it.name} × {it.quantity}</span>
                      <span className="text-saffron-600 dark:text-slate-400">{formatINR(it.line_total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
