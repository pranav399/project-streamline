import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Star, MapPin, Search } from 'lucide-react';
import { firebaseClient, type PanditProfile, type Profile } from '../lib/firebase';
import { formatINR, initials } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { SkeletonCard } from '../components/ui/Skeleton';

type PanditRow = PanditProfile & { profile: Profile };

export function PanditsPage() {
  const [pandits, setPandits] = useState<PanditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await firebaseClient
        .from('pandit_profiles')
        .select('*, profile:profiles!pandit_profiles_user_id_fkey(*)');
      setPandits((data as PanditRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = pandits.filter((p) => {
    const q = query.toLowerCase();
    return (
      !q ||
      (p.profile?.full_name?.toLowerCase() || '').includes(q) ||
      (p.city?.toLowerCase() || '').includes(q) ||
      (p.specialties || []).some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      <PageHeader title="Find Pandits" description="Browse verified pandits available for booking." />

      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, city, or specialty…" className="input pl-9" />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <ShieldCheck className="h-10 w-10 text-saffron-300" />
          <p className="font-semibold text-saffron-900 dark:text-white">No pandits found</p>
          <p className="text-sm text-saffron-500">Try a different search. New pandits are being verified regularly.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.user_id} className="card p-5 transition hover:shadow-pop">
              <div className="flex items-center gap-3">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-saffron-500 to-vermillion-600 text-lg font-bold text-white">
                  {initials(p.profile?.full_name ?? '', p.profile?.email ?? '')}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate font-semibold text-saffron-900 dark:text-white">{p.profile?.full_name || 'Pandit'}</h3>
                    {p.is_verified && <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />}
                  </div>
                  <p className="flex items-center gap-1 text-xs text-saffron-500">
                    <Star className="h-3 w-3 fill-marigold-400 text-marigold-400" /> {p.rating > 0 ? p.rating.toFixed(1) : 'New'} · {p.experience_years || 1}y exp
                  </p>
                </div>
              </div>
              {p.bio && <p className="mt-3 line-clamp-2 text-sm text-saffron-600 dark:text-slate-400">{p.bio}</p>}
              <div className="mt-3 space-y-1 text-xs text-saffron-500 dark:text-slate-400">
                {p.city && <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.city}</p>}
                {(p.languages || []).length > 0 && <p>Languages: {p.languages.join(', ')}</p>}
                {(p.specialties || []).length > 0 && <p>Specialties: {p.specialties.join(', ')}</p>}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-saffron-100 pt-3 dark:border-slate-800">
                <span className="text-sm text-saffron-500">From <span className="font-bold text-saffron-700 dark:text-saffron-300">{formatINR(p.base_price || 1100)}</span></span>
                <Link to="/app/services" className="btn-gold px-3 py-1.5 text-xs">Book Now</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
