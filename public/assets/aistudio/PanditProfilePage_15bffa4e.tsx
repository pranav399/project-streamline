import { useEffect, useState } from 'react';
import { Star, Check, Clock, Loader2, Save, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { firebaseClient, type PanditProfile, type Review } from '../lib/firebase';
import { formatINR, cn } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

export function PanditProfilePage() {
  const { profile } = useAuth();
  const { success, error: toastError } = useToast();
  const [pandit, setPandit] = useState<PanditProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [bio, setBio] = useState('');
  const [languages, setLanguages] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [city, setCity] = useState('');
  const [experience, setExperience] = useState(0);
  const [basePrice, setBasePrice] = useState(0);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      const { data } = await firebaseClient.from('pandit_profiles').select('*').eq('user_id', profile.id).maybeSingle();
      if (data) {
        const p = data as PanditProfile;
        setPandit(p);
        setBio(p.bio || '');
        setLanguages((p.languages || []).join(', '));
        setSpecialties((p.specialties || []).join(', '));
        setCity(p.city || '');
        setExperience(p.experience_years || 0);
        setBasePrice(Number(p.base_price || 0));
        setAvailable(p.is_available ?? true);
      }
      const { data: revs } = await firebaseClient
        .from('reviews')
        .select('*, devotee:profiles!reviews_devotee_id_fkey(id, full_name, avatar_url)')
        .eq('pandit_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setReviews((revs as Review[]) ?? []);
      setLoading(false);
    })();
  }, [profile]);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await firebaseClient.from('pandit_profiles').upsert({
      user_id: profile.id,
      bio: bio.trim(),
      languages: languages.split(',').map((s) => s.trim()).filter(Boolean),
      specialties: specialties.split(',').map((s) => s.trim()).filter(Boolean),
      city: city.trim(),
      experience_years: experience,
      base_price: basePrice,
      is_available: available,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { toastError('Profile Update Failed', error.message); return; }
    success(
      'Pandit Profile Updated Successfully!',
      'Your bio, languages, specialties, pricing and availability have been saved.',
      {
        label: 'View My Schedule',
        href: '/app/schedule',
      }
    );
  };

  if (loading) return <div><PageHeader title="Pandit Profile" /><SkeletonCard /></div>;

  return (
    <div>
      <PageHeader title="Pandit Profile" description="Manage your public profile and availability." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-5">
            <h3 className="mb-4 font-display text-lg font-semibold text-saffron-900 dark:text-white">Profile details</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Bio</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell devotees about yourself…" className="input" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Languages (comma-separated)</label>
                  <input value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="Hindi, Sanskrit, English" className="input" />
                </div>
                <div>
                  <label className="label">Specialties (comma-separated)</label>
                  <input value={specialties} onChange={(e) => setSpecialties(e.target.value)} placeholder="Vedic, Wedding, Griha Pravesh" className="input" />
                </div>
                <div>
                  <label className="label">City</label>
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Mumbai" className="input" />
                </div>
                <div>
                  <label className="label">Experience (years)</label>
                  <input type="number" min={0} value={experience} onChange={(e) => setExperience(Number(e.target.value))} className="input" />
                </div>
                <div>
                  <label className="label">Base price (₹)</label>
                  <input type="number" min={0} value={basePrice} onChange={(e) => setBasePrice(Number(e.target.value))} className="input" />
                </div>
                <div>
                  <label className="label">Availability</label>
                  <button
                    onClick={() => setAvailable((a) => !a)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium transition',
                      available
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : 'border-vermillion-300 bg-vermillion-50 text-vermillion-700 dark:border-vermillion-700 dark:bg-vermillion-500/10 dark:text-vermillion-300'
                    )}
                  >
                    {available ? 'Available' : 'Unavailable'}
                    <span className={cn('h-2 w-2 rounded-full', available ? 'bg-emerald-500' : 'bg-vermillion-500')} />
                  </button>
                </div>
              </div>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save changes
              </button>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-4 font-display text-lg font-semibold text-saffron-900 dark:text-white">Reviews</h3>
            {reviews.length === 0 ? (
              <p className="py-8 text-center text-sm text-saffron-400">No reviews yet. Complete poojas to receive reviews.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="border-b border-saffron-100 pb-3 last:border-0 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-0.5 text-marigold-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn('h-3.5 w-3.5', i < r.rating && 'fill-current')} />
                        ))}
                      </span>
                      <span className="text-sm font-medium text-saffron-900 dark:text-white">{r.devotee?.full_name ?? 'Devotee'}</span>
                    </div>
                    {r.comment && <p className="mt-1 text-sm text-saffron-600 dark:text-slate-400">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-warm p-5">
            <p className="text-sm text-saffron-600 dark:text-slate-400">Verification status</p>
            <div className="mt-2 flex items-center gap-2">
              {pandit?.is_verified ? (
                <>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15"><Check className="h-4 w-4" /></span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">Verified Pandit</span>
                </>
              ) : (
                <>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/15"><Clock className="h-4 w-4" /></span>
                  <span className="font-semibold text-amber-700 dark:text-amber-300">Pending verification</span>
                </>
              )}
            </div>
            <p className="mt-3 text-xs text-saffron-500 dark:text-slate-400">
              {pandit?.is_verified
                ? 'You are verified and visible to devotees.'
                : 'Admin will verify your profile. You will be visible once approved.'}
            </p>
          </div>

          <div className="card-warm p-5">
            <p className="text-sm text-saffron-600 dark:text-slate-400">Total earnings</p>
            <p className="mt-1 text-3xl font-bold text-saffron-900 dark:text-white">{formatINR(pandit?.total_earnings ?? 0)}</p>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-saffron-600 dark:text-slate-400"><Sparkles className="h-4 w-4" /> Completed</span>
              <span className="font-semibold text-saffron-900 dark:text-white">{pandit?.completed_bookings ?? 0}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-saffron-600 dark:text-slate-400"><Star className="h-4 w-4" /> Rating</span>
              <span className="font-semibold text-saffron-900 dark:text-white">{pandit?.rating ? pandit.rating.toFixed(1) : '—'} ({pandit?.review_count ?? 0})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
