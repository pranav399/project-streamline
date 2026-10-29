import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Flame,
  Loader2,
  MapPin,
  Star,
  Video,
  Home as HomeIcon,
  Church,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { firebaseClient, type Service, type PanditProfile, type Profile, type BookingMode } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatINR, cn, timeSlots, slotToISO, initials } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { SkeletonCard } from '../components/ui/Skeleton';

const STEPS = ['Service', 'Pandit', 'Schedule', 'Details', 'Review'];

export function BookingPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { success, error: toastError, warning } = useToast();

  const [step, setStep] = useState(0);
  const [services, setServices] = useState<Service[]>([]);
  const [pandits, setPandits] = useState<(PanditProfile & { profile: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [serviceId, setServiceId] = useState<string | null>(params.get('service'));
  const [panditId, setPanditId] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date(Date.now() + 86400000));
  const [slot, setSlot] = useState('');
  const [mode, setMode] = useState<BookingMode>('home');
  const [gotra, setGotra] = useState('');
  const [sankalp, setSankalp] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [langFilter, setLangFilter] = useState('All');
  const [minRating, setMinRating] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: svcs } = await firebaseClient.from('services').select('*').eq('is_active', true).order('name');
      setServices((svcs as Service[]) ?? []);
      const { data: pds } = await firebaseClient
        .from('pandit_profiles')
        .select('*, profile:profiles!pandit_profiles_user_id_fkey(*)');
      setPandits((pds as (PanditProfile & { profile: Profile })[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const selectedService = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);
  const selectedPandit = useMemo(() => pandits.find((p) => p.user_id === panditId), [pandits, panditId]);

  const languages = useMemo(() => {
    const set = new Set<string>();
    pandits.forEach((p) => (p.languages || []).forEach((l) => set.add(l)));
    return ['All', ...Array.from(set)];
  }, [pandits]);

  const filteredPandits = useMemo(() => {
    return pandits.filter((p) => {
      const matchLang = langFilter === 'All' || (p.languages || []).includes(langFilter);
      const matchRating = (p.rating || 0) >= minRating;
      return matchLang && matchRating;
    });
  }, [pandits, langFilter, minRating]);

  const canNext = useMemo(() => {
    if (step === 0) return !!serviceId;
    if (step === 1) return !!panditId;
    if (step === 2) return !!slot;
    if (step === 3) return mode === 'online' || !!address.trim();
    return true;
  }, [step, serviceId, panditId, slot, mode, address]);

  const next = () => {
    if (step === 0 && !serviceId) {
      warning('Pooja Required', 'Please select a sacred pooja ceremony before proceeding.');
      return;
    }
    if (step === 1 && !panditId) {
      warning('Pandit Required', 'Please choose a verified Shastriji to conduct your ritual.');
      return;
    }
    if (step === 2 && !slot) {
      warning('Muhurat Required', 'Please select an auspicious date and Muhurat time slot.');
      return;
    }
    if (step === 3 && mode !== 'online' && !address.trim()) {
      warning('Address Required', 'Please provide the physical venue address for the ceremony.');
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    if (!profile || !serviceId || !panditId || !slot) {
      toastError('Incomplete Request', 'Please fill in all mandatory booking fields.');
      return;
    }
    setSubmitting(true);
    const scheduledAt = slotToISO(date, slot);
    const { data, error } = await firebaseClient
      .from('bookings')
      .insert({
        devotee_id: profile.id,
        pandit_id: panditId,
        service_id: serviceId,
        scheduled_at: scheduledAt,
        mode,
        status: 'pending',
        gotra: gotra.trim(),
        sankalp: sankalp.trim(),
        address: mode === 'online' ? '' : address.trim(),
        notes: notes.trim(),
        amount: selectedService?.price ?? 0,
      })
      .select()
      .single();

    if (error) {
      toastError('Booking Request Failed', error.message);
      setSubmitting(false);
      return;
    }

    await firebaseClient.from('notifications').insert({
      user_id: panditId,
      type: 'booking_request',
      title: 'New booking request',
      body: `${profile.full_name} requested ${selectedService?.name} on ${new Date(scheduledAt).toLocaleString('en-IN')}.`,
      link: '/app/schedule',
    });

    if (data?.id) {
      await firebaseClient.from('booking_status_log').insert({
        booking_id: data.id,
        status: 'pending',
        changed_by: profile.id,
        note: 'Booking created by devotee',
      });
    }

    setSubmitting(false);
    success(
      'Pooja Booking Requested Successfully!',
      `Your request for ${selectedService?.name} with ${selectedPandit?.profile?.full_name || 'Pandit Ji'} is placed.`,
      {
        label: 'View My Bookings',
        href: '/app/bookings',
      }
    );
    navigate('/app/bookings');
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Book a Pooja" description="Loading…" />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Book a Pooja" description="Complete the steps below to request your ceremony." />

      {/* Stepper */}
      <div className="mb-8 flex items-center">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition',
                  i < step && 'bg-emerald-500 text-white',
                  i === step && 'bg-saffron-600 text-white ring-4 ring-saffron-200 dark:ring-saffron-500/20',
                  i > step && 'bg-saffron-100 text-saffron-400 dark:bg-slate-800'
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn('hidden text-xs font-medium sm:block', i === step ? 'text-saffron-700 dark:text-saffron-300' : 'text-saffron-400')}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('mx-2 h-0.5 flex-1 rounded', i < step ? 'bg-emerald-500' : 'bg-saffron-200 dark:bg-slate-700')} />
            )}
          </div>
        ))}
      </div>

      <div className="card p-5 sm:p-6">
        {/* Step 0: Service */}
        {step === 0 && (
          <div>
            <h3 className="mb-4 font-display text-lg font-semibold text-saffron-900 dark:text-white">Choose a ceremony</h3>
            {services.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Flame className="h-10 w-10 text-saffron-300" />
                <p className="font-semibold text-saffron-900 dark:text-white">No pooja services available</p>
                <p className="text-sm text-saffron-500">Please check back soon for available ceremonies.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setServiceId(s.id)}
                    className={cn(
                      'flex flex-col gap-2 rounded-xl border p-3 text-left transition',
                      serviceId === s.id
                        ? 'border-saffron-500 bg-saffron-50 ring-2 ring-saffron-500/20 dark:border-saffron-500 dark:bg-saffron-500/10'
                        : 'border-saffron-200 hover:border-saffron-300 dark:border-slate-700 dark:hover:border-slate-600'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-saffron-100 text-saffron-600 dark:bg-slate-800"><Flame className="h-4 w-4" /></span>
                      <span className="font-semibold text-saffron-900 dark:text-white">{s.name}</span>
                      {serviceId === s.id && <Check className="ml-auto h-4 w-4 text-saffron-600" />}
                    </div>
                    <p className="line-clamp-2 text-xs text-saffron-600 dark:text-slate-400">{s.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-saffron-500"><Clock className="h-3 w-3" /> {s.duration_mins}m</span>
                      <span className="font-bold text-saffron-700 dark:text-saffron-300">{formatINR(s.price)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 1: Pandit */}
        {step === 1 && (
          <div>
            <h3 className="mb-4 font-display text-lg font-semibold text-saffron-900 dark:text-white">Choose a verified pandit</h3>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <select value={langFilter} onChange={(e) => setLangFilter(e.target.value)} className="input sm:w-44">
                {languages.map((l) => <option key={l} value={l}>{l === 'All' ? 'All languages' : l}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <span className="text-xs text-saffron-500">Min rating:</span>
                {[0, 3, 4, 4.5].map((r) => (
                  <button
                    key={r}
                    onClick={() => setMinRating(r)}
                    className={cn(
                      'flex items-center gap-0.5 rounded-full px-2.5 py-1 text-xs font-medium transition',
                      minRating === r ? 'bg-saffron-600 text-white' : 'border border-saffron-200 text-saffron-600 dark:border-slate-700 dark:text-slate-300'
                    )}
                  >
                    {r === 0 ? 'Any' : <><Star className="h-3 w-3 fill-current" /> {r}+</>}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredPandits.map((p) => (
                <button
                  key={p.user_id}
                  onClick={() => setPanditId(p.user_id)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3 text-left transition',
                    panditId === p.user_id
                      ? 'border-saffron-500 bg-saffron-50 ring-2 ring-saffron-500/20 dark:border-saffron-500 dark:bg-saffron-500/10'
                      : 'border-saffron-200 hover:border-saffron-300 dark:border-slate-700'
                  )}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-saffron-500 to-vermillion-600 text-sm font-bold text-white">
                    {initials(p.profile?.full_name ?? '', p.profile?.email ?? '')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-saffron-900 dark:text-white">{p.profile?.full_name || 'Pandit'}</p>
                    <p className="flex items-center gap-1 text-xs text-saffron-500">
                      <Star className="h-3 w-3 fill-marigold-400 text-marigold-400" /> {p.rating > 0 ? p.rating.toFixed(1) : 'New'} · {p.experience_years || 1}y exp
                    </p>
                    <p className="truncate text-xs text-saffron-400">{(p.languages || []).join(', ') || '—'}</p>
                  </div>
                  {panditId === p.user_id && <Check className="h-5 w-5 text-saffron-600" />}
                </button>
              ))}
              {filteredPandits.length === 0 && (
                <p className="col-span-2 py-8 text-center text-sm text-saffron-400">No pandits match your filters.</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Schedule */}
        {step === 2 && (
          <div>
            <h3 className="mb-4 font-display text-lg font-semibold text-saffron-900 dark:text-white">Pick a date & time</h3>
            <div className="mb-4">
              <label className="label">Date</label>
              <input
                type="date"
                value={date.toISOString().slice(0, 10)}
                min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                onChange={(e) => setDate(new Date(e.target.value + 'T09:00:00'))}
                className="input sm:w-56"
              />
            </div>
            <label className="label">Time slot</label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {timeSlots().map((s) => (
                <button
                  key={s}
                  onClick={() => setSlot(s)}
                  className={cn(
                    'rounded-lg border px-2 py-2 text-xs font-medium transition',
                    slot === s
                      ? 'border-saffron-500 bg-saffron-600 text-white'
                      : 'border-saffron-200 text-saffron-700 hover:bg-saffron-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="mt-3 flex items-center gap-1 text-xs text-saffron-400">
              <Calendar className="h-3.5 w-3.5" /> Times shown in your local timezone.
            </p>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div>
            <h3 className="mb-4 font-display text-lg font-semibold text-saffron-900 dark:text-white">Ceremony details</h3>
            <div className="mb-4">
              <label className="label">Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: 'home' as BookingMode, icon: HomeIcon, label: 'At Home' },
                  { v: 'online' as BookingMode, icon: Video, label: 'Online' },
                  { v: 'temple' as BookingMode, icon: Church, label: 'At Temple' },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.v}
                      onClick={() => setMode(m.v)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition',
                        mode === m.v
                          ? 'border-saffron-500 bg-saffron-50 text-saffron-700 dark:border-saffron-500 dark:bg-saffron-500/10 dark:text-saffron-300'
                          : 'border-saffron-200 text-saffron-600 hover:bg-saffron-50 dark:border-slate-700 dark:text-slate-300'
                      )}
                    >
                      <Icon className="h-5 w-5" /> {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {mode !== 'online' && (
              <div className="mb-4">
                <label className="label">Address</label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-saffron-400" />
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    placeholder="Full address for the pandit to visit"
                    className="input pl-9"
                  />
                </div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Gotra (optional)</label>
                <input value={gotra} onChange={(e) => setGotra(e.target.value)} placeholder="e.g. Kashyapa" className="input" />
              </div>
              <div>
                <label className="label">Sankalp (optional)</label>
                <input value={sankalp} onChange={(e) => setSankalp(e.target.value)} placeholder="Purpose / intention" className="input" />
              </div>
            </div>
            <div className="mt-4">
              <label className="label">Notes (optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any special requests…" className="input" />
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div>
            <h3 className="mb-4 font-display text-lg font-semibold text-saffron-900 dark:text-white">Review & confirm</h3>
            <div className="space-y-3">
              <ReviewRow icon={<Flame className="h-4 w-4" />} label="Ceremony" value={selectedService?.name ?? ''} />
              <ReviewRow icon={<Sparkles className="h-4 w-4" />} label="Pandit" value={selectedPandit?.profile?.full_name ?? 'Pandit'} />
              <ReviewRow icon={<Calendar className="h-4 w-4" />} label="Schedule" value={`${date.toLocaleDateString('en-IN')} · ${slot}`} />
              <ReviewRow icon={mode === 'online' ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />} label="Mode" value={mode === 'online' ? 'Online video call' : mode === 'temple' ? 'At temple' : 'At home'} />
              {gotra && <ReviewRow icon={<Sparkles className="h-4 w-4" />} label="Gotra" value={gotra} />}
              {sankalp && <ReviewRow icon={<Sparkles className="h-4 w-4" />} label="Sankalp" value={sankalp} />}
              <div className="lotus-divider my-4" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-saffron-600 dark:text-slate-400">Total amount</span>
                <span className="text-2xl font-bold text-saffron-700 dark:text-saffron-300">{formatINR(selectedService?.price ?? 0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between border-t border-saffron-100 pt-4 dark:border-slate-800">
          <button onClick={back} disabled={step === 0} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={next} disabled={!canNext} className="btn-primary">
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={submit} disabled={submitting} className="btn-gold">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {submitting ? 'Requesting…' : 'Confirm Booking'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-saffron-100 text-saffron-600 dark:bg-slate-800 dark:text-saffron-400">{icon}</span>
      <span className="text-sm text-saffron-500 dark:text-slate-400">{label}</span>
      <span className="ml-auto text-sm font-semibold text-saffron-900 dark:text-white">{value}</span>
    </div>
  );
}
