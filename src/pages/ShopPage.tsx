import { useEffect, useMemo, useState } from 'react';
import { Search, ShoppingCart, Loader2, Sparkles, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { firebaseClient, type Product } from '../lib/firebase';
import { formatINR, cn } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

export function ShopPage() {
  const { profile } = useAuth();
  const { success, error: toastError } = useToast();
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const state = JSON.parse(localStorage.getItem('poojaconnect_fb_cache_v1') || '{}');
      return (state.products || []) as Product[];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const { data, error } = await firebaseClient
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (!active) return;

        if (error) {
          console.error('products load error', error);
          toastError('Could not load products', error.message || 'Please try again in a moment.');
        } else if (data) {
          setProducts((data as Product[]) ?? []);
        }
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('products load exception', err);
        toastError('Could not load products', message);
        setProducts([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [toastError]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map((p) => p.category)))], [products]);
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return products.filter((p) =>
      (category === 'All' || p.category === category) &&
      (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
    );
  }, [products, query, category]);

  const addToCart = async (productId: string) => {
    if (!profile) return;
    setAdding(productId);
    const { data: existing } = await firebaseClient
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', profile.id)
      .eq('product_id', productId)
      .maybeSingle();

    if (existing) {
      const { error } = await firebaseClient.from('cart_items').update({ quantity: existing.quantity + 1 }).eq('id', existing.id);
      if (error) toastError('Cart Update Failed', error.message);
    } else {
      const { error } = await firebaseClient.from('cart_items').insert({ user_id: profile.id, product_id: productId, quantity: 1 });
      if (error) toastError('Could Not Add to Cart', error.message);
    }
    const product = products.find((p) => p.id === productId);
    setAdding(null);
    success(
      'Added to Cart!',
      `${product?.name || 'Sacred samagri'} has been added to your shopping cart.`,
      {
        label: 'View Cart & Checkout',
        href: '/app/cart',
      }
    );
  };

  return (
    <div>
      <PageHeader title="Pooja Samagri Shop" description="Authentic materials for your ceremonies, delivered to your door." />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search samagri…" className="input pl-9" />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition',
                category === c
                  ? 'bg-saffron-600 text-white shadow-soft'
                  : 'border border-saffron-200 bg-white text-saffron-700 hover:bg-saffron-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <ShoppingCart className="h-10 w-10 text-saffron-300" />
          <p className="font-semibold text-saffron-900 dark:text-white">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <div key={p.id} className="card group overflow-hidden transition hover:shadow-pop">
              <div className="relative aspect-square overflow-hidden bg-saffron-100 dark:bg-slate-800">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-saffron-400"><Sparkles className="h-8 w-8" /></div>
                )}
                <span className="absolute left-2 top-2 chip bg-white/90 text-saffron-700 shadow-soft backdrop-blur">{p.category}</span>
              </div>
              <div className="p-3">
                <h3 className="line-clamp-1 text-sm font-semibold text-saffron-900 dark:text-white">{p.name}</h3>
                <p className="mt-0.5 line-clamp-2 text-xs text-saffron-500 dark:text-slate-400">{p.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-base font-bold text-saffron-700 dark:text-saffron-300">{formatINR(p.price)}</span>
                  <button
                    onClick={() => addToCart(p.id)}
                    disabled={p.stock <= 0 || adding === p.id}
                    className="btn-gold px-2.5 py-1.5 text-xs"
                  >
                    {adding === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    {p.stock > 0 ? 'Add' : 'Out'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
