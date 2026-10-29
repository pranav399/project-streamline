import { useEffect, useState } from 'react';
import { Clock, Check, X, Loader2, Flame, Video, MapPin, Calendar, Bell, Award, Scroll } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { firebaseClient, type Booking } from '../lib/firebase';
import { formatINR, formatDateTime, cn } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { SankalpPatraModal } from '../components/sankalp/SankalpPatraModal';

export function PanditSchedulePage() {
  const { profile } = useAuth();
  const { success, error: toastError, info } = useToast();
  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const state = JSON.parse(localStorage.getItem('poojaconnect_fb_cache_v1') || '{}');
      return (state.bookings || []) as Booking[];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'confirmed' | 'completed' | 'all'>('pending');
  const [sankalpBooking, setSankalpBooking] = useState<Booking | null>(null);

  const load = async () => {
    if (!profile) return;
    const { data } = await firebaseClient
      .from('bookings')
      .select('*, service:services(*), devotee:profiles!bookings_devotee_id_fkey(id, full_name, email, phone, avatar_url)')
      .eq('pandit_id', profile.id)
      .order('scheduled_at', { ascending: true });
    if (data) setBookings((data as Booking[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const handleSync = () => load();
    window.addEventListener('poojaconnect_firebase_sync', handleSync);
    return () => window.removeEventListener('poojaconnect_firebase_sync', handleSync);
  }, [profile]);

  const respond = async (id: string, accept: boolean) => {
    setBusy(id);
    const status = accept ? 'confirmed' : 'rejected';
    const { error } = await firebaseClient.from('bookings').update({ status }).eq('id', id);
    if (error) { toastError('Action failed', error.message); setBusy(null); return; }
    const booking = bookings.find((b) => b.id === id);
    if (booking?.devotee_id) {
      await firebaseClient.from('notifications').insert({
        user_id: booking.devotee_id,
        type: accept ? 'booking_confirmed' : 'booking_rejected',
        title: accept ? 'Booking Confirmed! 🪔' : 'Booking Declined',
        body: accept
          ? `Your pandit has confirmed your booking for ${booking.service?.name}.`
          : `Unfortunately, the pandit was unable to accept your booking. Please try another pandit.`,
        link: '/app/bookings',
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }
    await firebaseClient.from('booking_status_log').insert({
      booking_id: id,
      status,
      changed_by: profile?.id,
      note: accept ? 'Accepted by pandit' : 'Rejected by pandit',
    });
    setBusy(null);
    if (accept) {
      success('Booking Accepted & Confirmed!', `You confirmed ${booking?.service?.name || 'ceremony'}. Devotee has been notified.`, {
        label: 'View Confirmed',
        onClick: () => setFilter('confirmed'),
      });
    } else {
      info('Booking Declined', 'The booking request was declined and devotee informed.');
    }
    load();
  };

  const markComplete = async (id: string) => {
    setBusy(id);
    const { error } = await firebaseClient.from('bookings').update({ status: 'completed' }).eq('id', id);
    if (error) { toastError('Completion Failed', error.message); setBusy(null); return; }
    const booking = bookings.find((b) => b.id === id);
    if (booking && profile) {
      const { data: currentP } = await firebaseClient.from('pandit_profiles').select('total_earnings, completed_bookings').eq('user_id', profile.id).maybeSingle();
      if (currentP) {
        await firebaseClient.from('pandit_profiles').update({
          completed_bookings: (currentP.completed_bookings || 0) + 1,
        }).eq('user_id', profile.id);
      }
      window.dispatchEvent(new CustomEvent('poojaconnect_firebase_sync'));
    }
    setBusy(null);
    success(
      'Pooja Ceremony Completed!',
      'Earnings have been credited. Generating Digital Sankalp Patra & Blessings Certificate.',
      {
        label: '🪔 Issue Sankalp Patra',
        onClick: () => booking && setSankalpBooking({ ...booking, status: 'completed' }),
      }
    );
    if (booking) {
      setSankalpBooking({ ...booking, status: 'completed' });
    }
    load();
  };

  const filtered = bookings.filter((b) => filter === 'all' || b.status === filter);

  const counts = {
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    all: bookings.length,
  };

  return (
    <div>
      <PageHeader
        title="My Schedule"
        description="Accept or decline booking requests in real time."
        actions={
          <div className="flex items-center gap-2 rounded-lg bg-saffron-50 px-3 py-1.5 text-sm text-saffron-600 dark:bg-saffron-500/10 dark:text-saffron-400">
            <Bell className="h-4 w-4 animate-bell-swing" /> Live updates enabled
          </div>
        }
      />

      <div className="mb-4 flex gap-2">
        {(['pending', 'confirmed', 'completed', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition',
              filter === f
                ? 'bg-saffron-600 text-white shadow-soft'
                : 'border border-saffron-200 bg-white text-saffron-700 hover:bg-saffron-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            )}
          >
            {f}
            {counts[f] > 0 && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-vermillion-500 px-1 text-[10px] font-bold text-white">{counts[f]}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <Calendar className="h-10 w-10 text-saffron-300" />
          <p className="font-semibold text-saffron-900 dark:text-white">No {filter !== 'all' ? filter : ''} bookings</p>
          <p className="text-sm text-saffron-500">New requests will appear here instantly.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div key={b.id} className={cn('card p-4 sm:p-5', b.status === 'pending' && 'ring-1 ring-saffron-300')}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-saffron-100 text-saffron-600 dark:bg-saffron-500/10 dark:text-saffron-400">
                  <Flame className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold text-saffron-900 dark:text-white">{b.service?.name ?? 'Service'}</h3>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-saffron-500 dark:text-slate-400">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDateTime(b.scheduled_at)}</span>
                    <span className="flex items-center gap-1">
                      {b.mode === 'online' ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                      {b.mode === 'online' ? 'Online' : b.mode === 'temple' ? 'Temple' : 'Home'}
                    </span>
                    <span>Devotee: {b.devotee?.full_name || 'Devotee'}</span>
                    {b.devotee?.phone && <span>📞 {b.devotee.phone}</span>}
                  </div>
                  {(b.gotra || b.sankalp || b.address || b.notes) && (
                    <div className="mt-2 rounded-lg bg-saffron-50/60 px-3 py-2 text-xs text-saffron-600 dark:bg-slate-800/50 dark:text-slate-400">
                      {b.gotra && <p>Gotra: {b.gotra}</p>}
                      {b.sankalp && <p>Sankalp: {b.sankalp}</p>}
                      {b.address && <p>Address: {b.address}</p>}
                      {b.notes && <p>Notes: {b.notes}</p>}
                    </div>
                  )}
                </div>
                <span className="text-lg font-bold text-saffron-700 dark:text-saffron-300">{formatINR(b.amount)}</span>
              </div>

              {b.status === 'pending' && (
                <div className="mt-3 flex gap-2 border-t border-saffron-100 pt-3 dark:border-slate-800">
                  <button onClick={() => respond(b.id, true)} disabled={busy === b.id} className="btn-primary">
                    {busy === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Accept
                  </button>
                  <button onClick={() => respond(b.id, false)} disabled={busy === b.id} className="btn-danger">
                    <X className="h-4 w-4" /> Decline
                  </button>
                </div>
              )}
              {b.status === 'confirmed' && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-saffron-100 pt-3 dark:border-slate-800">
                  <button onClick={() => markComplete(b.id)} disabled={busy === b.id} className="btn-primary">
                    {busy === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Mark as Completed
                  </button>
                  <button
                    onClick={() => setSankalpBooking(b)}
                    className="btn-secondary text-xs"
                    title="Prepare Sankalp details"
                  >
                    <Scroll className="h-3.5 w-3.5 text-amber-600" /> Prepare Sankalp
                  </button>
                </div>
              )}
              {b.status === 'completed' && (
                <div className="mt-3 flex gap-2 border-t border-saffron-100 pt-3 dark:border-slate-800">
                  <button
                    onClick={() => setSankalpBooking(b)}
                    className="btn-gold text-xs shadow-soft"
                    title="Issue or Download Sankalp Patra for Devotee"
                  >
                    <Award className="h-4 w-4" /> 🪔 Issue / View Sankalp Patra (PDF)
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Digital Sankalp Patra Modal */}
      {sankalpBooking && (
        <SankalpPatraModal
          open={!!sankalpBooking}
          onClose={() => setSankalpBooking(null)}
          booking={sankalpBooking}
        />
      )}
    </div>
  );
}
