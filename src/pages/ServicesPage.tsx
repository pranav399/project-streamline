import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, Clock, Flame, ArrowRight } from 'lucide-react';
import { firebaseClient, type Service } from '../lib/firebase';
import { formatINR, cn } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { SkeletonCard } from '../components/ui/Skeleton';

export function ServicesPage() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>(() => {
    try {
      const state = JSON.parse(localStorage.getItem('poojaconnect_fb_cache_v1') || '{}');
      return (state.services || []) as Service[];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    (async () => {
      const { data } = await firebaseClient.from('services').select('*').eq('is_active', true).order('name');
      if (data) setServices((data as Service[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(services.map((s) => s.category));
    return ['All', ...Array.from(set)];
  }, [services]);

  const filtered = useMemo(() => {
    return services.filter((s) => {
      const matchCat = category === 'All' || s.category === category;
      const q = query.toLowerCase();
      const matchQ = !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [services, query, category]);

  return (
    <div>
      <PageHeader
        title="Book a Pooja"
        description="Browse our catalog of sacred ceremonies performed by verified pandits."
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search poojas…"
            className="input pl-9"
          />
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <Sparkles className="h-10 w-10 text-saffron-300" />
          <p className="font-semibold text-saffron-900 dark:text-white">No poojas found</p>
          <p className="text-sm text-saffron-500">Try a different search or category.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <div key={s.id} className="card group overflow-hidden transition hover:shadow-pop">
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
                  <div className="flex h-full w-full items-center justify-center text-saffron-400"><Flame className="h-10 w-10" /></div>
                )}
                <span className="absolute left-3 top-3 chip bg-white/95 text-saffron-700 shadow-soft backdrop-blur-xs font-semibold">{s.category}</span>
              </div>
              <div className="p-4">
                <h3 className="font-display text-base font-semibold text-saffron-900 dark:text-white">{s.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-saffron-600 dark:text-slate-400">{s.description}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-saffron-500 dark:text-slate-400">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {s.duration_mins} min</span>
                  <span className="flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> {(s.samagri_list || []).length} samagri</span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-bold text-saffron-700 dark:text-saffron-300">{formatINR(s.price)}</span>
                  <button
                    onClick={() => navigate(`/app/book?service=${s.id}`)}
                    className="btn-gold"
                  >
                    Book Now <ArrowRight className="h-3.5 w-3.5" />
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
