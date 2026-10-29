import { useEffect, useState } from 'react';
import { Plus, Loader2, Pencil, Trash2, Store, Save, X, Sparkles, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { firebaseClient, type Product } from '../lib/firebase';
import { formatINR, cn } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../context/ToastContext';

// Curated sacred image presets for easy 1-click photo updates
const SACRED_IMAGE_PRESETS = [
  {
    label: 'Pooja Kit Thali',
    url: 'https://images.unsplash.com/photo-1609137144813-7d9921338f24?auto=format&fit=crop&w=800&q=80',
    category: 'Pooja Kits',
  },
  {
    label: 'Brass Peacock Diya',
    url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=800&q=80',
    category: 'Brassware',
  },
  {
    label: 'Sandalwood Dhoop',
    url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
    category: 'Incense & Fragrance',
  },
  {
    label: 'Ganga Holy Water',
    url: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=800&q=80',
    category: 'Sacred Items',
  },
  {
    label: 'Rudraksha Beads',
    url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
    category: 'Malas & Yantras',
  },
  {
    label: 'Hawan Wood & Kund',
    url: 'https://images.unsplash.com/photo-1629853381666-e8e3906ea194?auto=format&fit=crop&w=800&q=80',
    category: 'Hawan Samagri',
  },
];

export function AdminProductsPage() {
  const { success, error: toastError, info } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [form, setForm] = useState({
    name: '',
    category: 'Pooja Kits',
    description: '',
    price: 0,
    stock: 50,
    image_url: '',
    is_active: true,
  });

  const load = async () => {
    setLoading(true);
    const { data } = await firebaseClient.from('products').select('*').order('name');
    setProducts((data as Product[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({
      name: '',
      category: 'Pooja Kits',
      description: '',
      price: 499,
      stock: 50,
      image_url: SACRED_IMAGE_PRESETS[0].url,
      is_active: true,
    });
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category || 'Pooja Kits',
      description: p.description || '',
      price: Number(p.price) || 0,
      stock: Number(p.stock) || 0,
      image_url: p.image_url || '',
      is_active: Boolean(p.is_active),
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toastError('Validation Error', 'Product name is required.');
      return;
    }
    if (form.price < 0) {
      toastError('Validation Error', 'Price cannot be negative.');
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || 'General',
      description: form.description.trim(),
      price: Number(form.price),
      stock: Number(form.stock) || 0,
      image_url: form.image_url.trim(),
      is_active: form.is_active,
    };

    if (editing) {
      const { error } = await firebaseClient.from('products').update(payload).eq('id', editing.id);
      if (error) {
        toastError('Failed to update product', error.message);
      } else {
        success('Product Updated!', `"${form.name}" has been updated in the Devotee Samagri Shop.`);
        setShowModal(false);
        load();
      }
    } else {
      const { error } = await firebaseClient.from('products').insert(payload);
      if (error) {
        toastError('Failed to create product', error.message);
      } else {
        success('Product Added!', `"${form.name}" has been added to the Devotee Samagri Shop.`);
        setShowModal(false);
        load();
      }
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    const { error } = await firebaseClient.from('products').delete().eq('id', id);
    if (error) {
      toastError('Delete failed', error.message);
    } else {
      info('Product Removed', 'The samagri item was deleted from the shop catalog.');
      load();
    }
    setDeleteId(null);
  };

  const toggleActive = async (p: Product) => {
    const nextState = !p.is_active;
    await firebaseClient.from('products').update({ is_active: nextState }).eq('id', p.id);
    setProducts((prev) => prev.map((item) => (item.id === p.id ? { ...item, is_active: nextState } : item)));
    info(
      nextState ? 'Product Activated' : 'Product Deactivated',
      `"${p.name}" is now ${nextState ? 'visible' : 'hidden'} in the Devotee Shop.`
    );
  };

  const categories = ['All', 'Pooja Kits', 'Brassware', 'Incense & Fragrance', 'Sacred Items', 'Malas & Yantras', 'Hawan Samagri'];

  const filtered = products.filter((p) => {
    const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
    const matchQ =
      !query ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.description.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Samagri Shop Management"
        description="Add, edit, or update pooja samagri kits, brassware, and sacred items available in the devotee store."
        actions={
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-saffron-600 to-vermillion-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-soft transition hover:shadow-pop"
          >
            <Plus className="h-4 w-4" />
            <span>Add Samagri Item</span>
          </button>
        }
      />

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-saffron-200/80 dark:border-slate-800 shadow-soft">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search samagri by name or description..."
            className="w-full rounded-xl border border-saffron-200 bg-saffron-50/40 px-3.5 py-2 text-xs sm:text-sm text-saffron-950 placeholder-saffron-400 focus:border-saffron-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-semibold transition',
                categoryFilter === cat
                  ? 'bg-saffron-600 text-white shadow-soft'
                  : 'bg-saffron-100/60 text-saffron-800 hover:bg-saffron-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <Store className="h-10 w-10 text-saffron-300" />
          <p className="font-semibold text-saffron-900 dark:text-white">No products match your criteria</p>
          <p className="text-xs text-saffron-500">Add a new samagri kit or adjust your filter query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => (
            <div
              key={p.id}
              className={cn(
                'group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white shadow-soft transition hover:shadow-pop dark:bg-slate-900',
                p.is_active ? 'border-saffron-200/80 dark:border-slate-800' : 'border-slate-200 opacity-75 dark:border-slate-800/60'
              )}
            >
              {/* Product Image Header with AutoFit */}
              <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-saffron-400">
                    <Store className="h-10 w-10" />
                  </div>
                )}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                    {p.category}
                  </span>
                  <Badge variant={p.is_active ? 'green' : 'gray'}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="absolute bottom-2 right-2 rounded-lg bg-black/70 px-2 py-0.5 text-[11px] font-bold text-amber-300 backdrop-blur-xs">
                  Stock: {p.stock} units
                </div>
              </div>

              {/* Product Details */}
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <h3 className="font-display text-sm font-bold text-saffron-950 dark:text-white line-clamp-1">
                    {p.name}
                  </h3>
                  <p className="mt-1 text-xs text-saffron-800/80 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-saffron-100 pt-3 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-saffron-600 dark:text-slate-400 block font-medium">Price</span>
                    <span className="font-display text-base font-bold text-saffron-950 dark:text-white">
                      {formatINR(p.price)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleActive(p)}
                      title={p.is_active ? 'Deactivate product' : 'Activate product'}
                      className={cn(
                        'rounded-lg px-2 py-1 text-[11px] font-semibold transition',
                        p.is_active
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                      )}
                    >
                      {p.is_active ? 'Hide' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="rounded-lg p-1.5 text-saffron-700 hover:bg-saffron-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                      title="Edit Product"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(p.id)}
                      className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="Delete Product"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Update Samagri Product' : 'Add New Samagri Product'}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-saffron-900 dark:text-white block mb-1">
              Product Title *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Complete Premium Pooja Samagri Kit"
              className="w-full rounded-xl border border-saffron-200 bg-white px-3.5 py-2 text-xs text-saffron-950 focus:border-saffron-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-saffron-900 dark:text-white block mb-1">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-xl border border-saffron-200 bg-white px-3.5 py-2 text-xs text-saffron-950 focus:border-saffron-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {categories.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-saffron-900 dark:text-white block mb-1">
                  Price (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  className="w-full rounded-xl border border-saffron-200 bg-white px-3 py-2 text-xs text-saffron-950 focus:border-saffron-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-saffron-900 dark:text-white block mb-1">
                  Stock Units
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                  className="w-full rounded-xl border border-saffron-200 bg-white px-3 py-2 text-xs text-saffron-950 focus:border-saffron-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-saffron-900 dark:text-white block mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Detailed description of what items are included in this pooja pack..."
              className="w-full rounded-xl border border-saffron-200 bg-white px-3.5 py-2 text-xs text-saffron-950 focus:border-saffron-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Image URL with live preview and preset picker */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-saffron-900 dark:text-white">
                Product Image URL
              </label>
              <span className="text-[10px] text-saffron-600 dark:text-slate-400">
                Pick a sacred preset below or paste custom URL
              </span>
            </div>
            <input
              type="text"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              className="w-full rounded-xl border border-saffron-200 bg-white px-3.5 py-2 text-xs text-saffron-950 focus:border-saffron-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />

            {/* Sacred 1-Click Preset Gallery */}
            <div className="mt-2.5">
              <p className="text-[10.5px] font-semibold text-saffron-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span>1-Click Sacred Image Presets:</span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SACRED_IMAGE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setForm({ ...form, image_url: preset.url, category: preset.category })}
                    className={cn(
                      'flex items-center gap-2 p-1.5 rounded-lg border text-left transition text-[11px]',
                      form.image_url === preset.url
                        ? 'border-saffron-500 bg-saffron-50 text-saffron-900 font-bold dark:bg-saffron-950/60 dark:text-saffron-200'
                        : 'border-saffron-100 bg-white text-saffron-700 hover:bg-saffron-50/50 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-300'
                    )}
                  >
                    <img src={preset.url} alt={preset.label} className="h-6 w-6 rounded object-cover" />
                    <span className="truncate">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Image Preview */}
            {form.image_url && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-saffron-100 bg-saffron-50/50 p-2 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="h-16 w-16 overflow-hidden rounded-lg bg-white shrink-0 shadow-2xs">
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-saffron-900 dark:text-white">Image Preview Active</p>
                  <p className="text-[10px] text-saffron-600 dark:text-slate-400 truncate max-w-xs">{form.image_url}</p>
                </div>
              </div>
            )}
          </div>

          {/* Visibility toggle */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="activeToggle"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-saffron-300 text-saffron-600 focus:ring-saffron-500"
            />
            <label htmlFor="activeToggle" className="text-xs font-semibold text-saffron-900 dark:text-white cursor-pointer">
              Product is active and published to devotee shop
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-saffron-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="rounded-xl px-4 py-2 text-xs font-medium text-saffron-700 hover:bg-saffron-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-saffron-600 to-vermillion-600 px-5 py-2 text-xs font-bold text-white shadow-soft hover:shadow-pop disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{editing ? 'Save Changes' : 'Create Product'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete Samagri Product"
        message="Are you sure you want to remove this item from the Devotee Samagri Shop? This cannot be undone."
        confirmLabel="Yes, Delete Product"
        variant="danger"
        onConfirm={() => {
          if (deleteId) remove(deleteId);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
