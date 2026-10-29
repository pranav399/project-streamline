import { useEffect, useState } from 'react';
import { Plus, Loader2, Pencil, Trash2, Flame, Save, X } from 'lucide-react';
import { firebaseClient, type Service } from '../lib/firebase';
import { formatINR, cn } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ImageAutoFitPreview } from '../components/ui/ImageAutoFitPreview';
import { useToast } from '../context/ToastContext';

export function AdminServicesPage() {
  const { success, error: toastError, info } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Service | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', category: '', description: '', price: 0, duration_mins: 60, samagri_list: '', image_url: '', is_active: true,
  });

  const load = async () => {
    setLoading(true);
    const { data } = await firebaseClient.from('services').select('*').order('name');
    setServices((data as Service[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', category: '', description: '', price: 0, duration_mins: 60, samagri_list: '', image_url: '', is_active: true });
    setShowModal(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({
      name: s.name, category: s.category, description: s.description, price: Number(s.price),
      duration_mins: s.duration_mins, samagri_list: (s.samagri_list || []).join(', '), image_url: s.image_url || '', is_active: s.is_active,
    });
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || 'General',
      description: form.description.trim(),
      price: form.price,
      duration_mins: form.duration_mins,
      samagri_list: form.samagri_list.split(',').map((s) => s.trim()).filter(Boolean),
      image_url: form.image_url.trim(),
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };
    let error;
    if (editing) {
      ({ error } = await firebaseClient.from('services').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await firebaseClient.from('services').insert(payload));
    }
    setSaving(false);
    if (error) { toastError('Save Failed', error.message); return; }
    setShowModal(false);
    success(
      editing ? 'Service Updated Successfully!' : 'Service Created Successfully!',
      `${payload.name} has been saved to the sacred ceremony catalog.`,
      {
        label: 'View Public Catalog',
        href: '/app/services',
      }
    );
    load();
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await firebaseClient.from('services').delete().eq('id', deleteId);
    setDeleteId(null);
    if (error) { toastError('Delete Failed', error.message); return; }
    info('Service Deleted', 'The service has been removed from the catalog.');
    load();
  };

  return (
    <div>
      <PageHeader
        title="Service Catalog"
        description="Manage pooja services, pricing, and samagri lists."
        actions={<button onClick={openNew} className="btn-primary"><Plus className="h-4 w-4" /> Add Service</button>}
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : services.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <Flame className="h-10 w-10 text-saffron-300" />
          <p className="font-semibold text-saffron-900 dark:text-white">No services in catalog</p>
          <p className="text-sm text-saffron-500">Click "Add Service" to create your first pooja ceremony offering.</p>
          <button onClick={openNew} className="btn-primary mt-2"><Plus className="h-4 w-4" /> Add Service</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div key={s.id} className="card group overflow-hidden transition-all duration-300 hover:shadow-pop">
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-saffron-100 dark:bg-slate-800">
                {s.image_url ? (
                  <img
                    src={s.image_url}
                    alt={s.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-saffron-400"><Flame className="h-8 w-8" /></div>
                )}
                <span className="absolute left-2.5 top-2.5 chip bg-white/95 text-saffron-700 shadow-soft backdrop-blur-xs font-semibold">{s.category}</span>
                {!s.is_active && <span className="absolute right-2.5 top-2.5"><Badge variant="gray">Inactive</Badge></span>}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-saffron-900 dark:text-white">{s.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-saffron-500 dark:text-slate-400">{s.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-bold text-saffron-700 dark:text-saffron-300">{formatINR(s.price)}</span>
                  <span className="text-xs text-saffron-400">{s.duration_mins} min</span>
                </div>
                <div className="mt-3 flex gap-2 border-t border-saffron-100 pt-3 dark:border-slate-800">
                  <button onClick={() => openEdit(s)} className="btn-secondary flex-1 text-xs">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button onClick={() => setDeleteId(s.id)} className="btn-danger px-3 py-2 text-xs">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Service' : 'Add Service'}
        size="lg"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary"><X className="h-4 w-4" /> Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Category</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="input" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Price (₹)</label>
              <input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="input" />
            </div>
            <div>
              <label className="label">Duration (minutes)</label>
              <input type="number" min={1} value={form.duration_mins} onChange={(e) => setForm({ ...form, duration_mins: Number(e.target.value) })} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Samagri list (comma-separated)</label>
            <input value={form.samagri_list} onChange={(e) => setForm({ ...form, samagri_list: e.target.value })} placeholder="Kalash, Coconut, Ghee" className="input" />
          </div>
          <ImageAutoFitPreview
            value={form.image_url}
            onChange={(val) => setForm({ ...form, image_url: val })}
            category={form.category}
          />
          <label className={cn('flex items-center gap-2 text-sm font-medium text-saffron-700 dark:text-slate-300')}>
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-saffron-300 text-saffron-600 focus:ring-saffron-500" />
            Active (visible to devotees)
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete service?"
        message="This will permanently remove the service from the catalog. Existing bookings are not affected."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={remove}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
