import { useEffect, useState } from 'react';
import { ShieldCheck, Loader2, Check, X, Star, MapPin } from 'lucide-react';
import { firebaseClient, type PanditProfile, type Profile } from '../lib/firebase';
import { formatINR, initials, cn } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

type PanditRow = PanditProfile & { profile: Profile };

export function AdminPanditsPage() {
  const { success, error: toastError } = useToast();
  const [pandits, setPandits] = useState<PanditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await firebaseClient
      .from('pandit_profiles')
      .select('*, profile:profiles!pandit_profiles_user_id_fkey(*)')
      .order('created_at', { ascending: false });
    setPandits((data as PanditRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const verify = async (userId: string, verified: boolean) => {
    setBusy(userId);
    const { error } = await firebaseClient.from('pandit_profiles').update({ is_verified: verified }).eq('user_id', userId);
    setBusy(null);
    if (error) { toastError('Failed', error.message); return; }
    await firebaseClient.from('notifications').insert({
      user_id: userId,
      type: verified ? 'verification' : 'verification_revoked',
      body: verified ? 'Admin has approved your pandit profile. You are now visible to devotees.' : 'Your verification has been revoked. Please contact support.',
      link: '/app/profile',
    });
    success(
      verified ? 'Pandit Profile Verified!' : 'Verification Revoked',
      verified ? 'Pandit is now verified and visible on devotee discovery with gold badge.' : 'Pandit verification badge was removed.',
      {
        label: 'View Pandits',
        href: '/app/pandits',
      }
    );
    load();
  };

  return (
    <div>
      <PageHeader title="Verify Pandits" description="Review and approve pandit profiles." />

      {loading ? (
        <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
      ) : pandits.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <ShieldCheck className="h-10 w-10 text-saffron-300" />
          <p className="font-semibold text-saffron-900 dark:text-white">No pandit profiles</p>
          <p className="text-sm text-saffron-500">Pandit registrations will appear here for verification.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pandits.map((p) => (
            <div key={p.user_id} className={cn('card p-5', !p.is_verified && 'ring-1 ring-amber-300')}>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-saffron-500 to-vermillion-600 text-sm font-bold text-white">
                  {initials(p.profile?.full_name ?? '', p.profile?.email ?? '')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-saffron-900 dark:text-white">{p.profile?.full_name || 'Pandit'}</p>
                  <p className="truncate text-xs text-saffron-500">{p.profile?.email}</p>
                </div>
                {p.is_verified ? (
                  <Badge variant="green"><ShieldCheck className="h-3 w-3" /> Verified</Badge>
                ) : (
                  <Badge variant="amber">Pending</Badge>
                )}
              </div>
              <div className="mt-4 space-y-2 text-sm">
                {p.city && <p className="flex items-center gap-1.5 text-saffron-600 dark:text-slate-400"><MapPin className="h-3.5 w-3.5" /> {p.city}</p>}
                <p className="flex items-center gap-1.5 text-saffron-600 dark:text-slate-400">
                  <Star className="h-3.5 w-3.5" /> {p.rating > 0 ? p.rating.toFixed(1) : 'New'} · {p.experience_years || 1}y exp
                </p>
                <p className="text-saffron-600 dark:text-slate-400">Base: {formatINR(p.base_price)}</p>
                {(p.languages || []).length > 0 && <p className="text-xs text-saffron-400">{p.languages.join(', ')}</p>}
              </div>
              {p.bio && <p className="mt-3 line-clamp-2 text-xs text-saffron-500 dark:text-slate-400">{p.bio}</p>}
              <div className="mt-4 flex gap-2 border-t border-saffron-100 pt-3 dark:border-slate-800">
                {!p.is_verified ? (
                  <button onClick={() => verify(p.user_id, true)} disabled={busy === p.user_id} className="btn-primary flex-1">
                    {busy === p.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Approve
                  </button>
                ) : (
                  <button onClick={() => verify(p.user_id, false)} disabled={busy === p.user_id} className="btn-danger flex-1">
                    <X className="h-4 w-4" /> Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
