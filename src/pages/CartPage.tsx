import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Loader2, ShoppingBag, ArrowRight, Minus, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { firebaseClient, type CartItem } from '../lib/firebase';
import { formatINR } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

export function CartPage() {
  const { profile } = useAuth();
  const { success, error: toastError, info } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [address, setAddress] = useState('');

  const load = async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await firebaseClient
      .from('cart_items')
      .select('*, product:products(*)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    setItems((data as CartItem[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [profile]);

  const updateQty = async (id: string, delta: number) => {
    setBusy(id);
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      await firebaseClient.from('cart_items').delete().eq('id', id);
    } else {
      await firebaseClient.from('cart_items').update({ quantity: newQty }).eq('id', id);
    }
    setBusy(null);
    load();
  };

  const remove = async (id: string) => {
    setBusy(id);
    await firebaseClient.from('cart_items').delete().eq('id', id);
    setBusy(null);
    info('Item Removed', 'The samagri item was removed from your cart.');
    load();
  };

  const checkout = async () => {
    if (!profile || items.length === 0) return;
    if (!address.trim()) { toastError('Address Required', 'Please enter a valid shipping address for your samagri delivery.'); return; }
    setCheckingOut(true);
    const total = items.reduce((sum, i) => sum + (i.product?.price ?? 0) * i.quantity, 0);
    const { data: order, error } = await firebaseClient.from('orders').insert({
      user_id: profile.id,
      total,
      status: 'placed',
      shipping_address: address.trim(),
    }).select().single();

    if (error) { toastError('Checkout Failed', error.message); setCheckingOut(false); return; }

    if (order) {
      const orderItems = items.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        name: i.product?.name ?? '',
        quantity: i.quantity,
        unit_price: i.product?.price ?? 0,
        line_total: (i.product?.price ?? 0) * i.quantity,
      }));
      await firebaseClient.from('order_items').insert(orderItems);
    }

    await firebaseClient.from('cart_items').delete().eq('user_id', profile.id);
    for (const i of items) {
      if (i.product) {
        await firebaseClient.from('products').update({ stock: Math.max(0, i.product.stock - i.quantity) }).eq('id', i.product_id);
      }
    }
    setCheckingOut(false);
    success(
      'Order Placed Successfully!',
      `Your sacred samagri order of ${formatINR(total)} has been confirmed and scheduled for delivery.`,
      {
        label: 'Track Orders',
        href: '/app/orders',
      }
    );
    navigate('/app/orders');
  };

  const total = items.reduce((sum, i) => sum + (i.product?.price ?? 0) * i.quantity, 0);

  return (
    <div>
      <PageHeader title="Shopping Cart" description="Review your items and checkout." />

      {loading ? (
        <SkeletonCard />
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <ShoppingBag className="h-10 w-10 text-saffron-300" />
          <p className="font-semibold text-saffron-900 dark:text-white">Your cart is empty</p>
          <button onClick={() => navigate('/app/shop')} className="btn-gold">Browse Shop</button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {items.map((i) => (
              <div key={i.id} className="card flex items-center gap-3 p-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-saffron-100 dark:bg-slate-800">
                  {i.product?.image_url && <img src={i.product.image_url} alt={i.product.name} className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-saffron-900 dark:text-white">{i.product?.name}</p>
                  <p className="text-sm text-saffron-600 dark:text-saffron-400">{formatINR(i.product?.price ?? 0)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(i.id, -1)} disabled={busy === i.id} className="rounded-lg p-1.5 text-saffron-600 hover:bg-saffron-100 dark:hover:bg-slate-800">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold text-saffron-900 dark:text-white">{i.quantity}</span>
                  <button onClick={() => updateQty(i.id, 1)} disabled={busy === i.id} className="rounded-lg p-1.5 text-saffron-600 hover:bg-saffron-100 dark:hover:bg-slate-800">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="w-20 text-right text-sm font-bold text-saffron-700 dark:text-saffron-300">{formatINR((i.product?.price ?? 0) * i.quantity)}</span>
                <button onClick={() => remove(i.id)} disabled={busy === i.id} className="rounded-lg p-2 text-vermillion-500 hover:bg-vermillion-50 dark:hover:bg-vermillion-500/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="card h-fit p-5">
            <h3 className="mb-4 font-display text-lg font-semibold text-saffron-900 dark:text-white">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-saffron-600 dark:text-slate-400">
                <span>Items ({items.length})</span>
                <span>{formatINR(total)}</span>
              </div>
              <div className="flex justify-between text-saffron-600 dark:text-slate-400">
                <span>Delivery</span>
                <span className="text-emerald-600">Free</span>
              </div>
              <div className="lotus-divider my-3" />
              <div className="flex justify-between text-base font-bold text-saffron-900 dark:text-white">
                <span>Total</span>
                <span>{formatINR(total)}</span>
              </div>
            </div>
            <div className="mt-4">
              <label className="label">Shipping address</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} placeholder="Full delivery address" className="input" />
            </div>
            <button onClick={checkout} disabled={checkingOut} className="btn-gold mt-4 w-full">
              {checkingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
              {checkingOut ? 'Placing order…' : 'Place Order'}
              {!checkingOut && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
