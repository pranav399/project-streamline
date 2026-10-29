import { useEffect, useState } from 'react';
import { CalendarHeart, Clock, Video, MapPin, Flame, Loader2, X, Star, Check, Award, Scroll } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { firebaseClient, type Booking } from '../lib/firebase';
import { formatINR, formatDateTime } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { SankalpPatraModal } from '../components/sankalp/SankalpPatraModal';

export function BookingsPage() {
  const { profile } = useAuth();
  const { success, error: toastError, info } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [sankalpBooking, setSankalpBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = async () => {
    if (!profile) return;
    setLoading(true);
    const col = profile.role === 'pandit' ? 'pandit_id' : profile.role === 'admin' ? null : 'devotee_id';
    let q = firebaseClient
      .from('bookings')
      .select('*, service:services(*), devotee:profiles!bookings_devotee_id_fkey(id, full_name, email, phone, avatar_url), pandit:profiles!bookings_pandit_id_fkey(id, full_name, avatar_url)')
      .order('scheduled_at', { ascending: false });
    if (col) q = q.eq(col, profile.id);
    const { data } = await q;
    setBookings((data as Booking[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const channel = firebaseClient
      .channel('bookings-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => load())
      .subscribe();
    return () => { firebaseClient.removeChannel(channel); };
  }, [profile]);

  const cancelBooking = async (id: string) => {
    setCancelling(id);
    const { error } = await firebaseClient.from('bookings').update({ status: 'cancelled' }).eq('id', id);
    setCancelling(null);
    if (error) { toastError('Cancellation Failed', error.message); return; }
    info('Booking Cancelled', 'Your ritual booking has been cancelled and Pandit Ji informed.');
    load();
  };

  const submitReview = async () => {
    if (!reviewBooking || !profile || !reviewBooking.pandit_id) return;
    setSubmittingReview(true);
    const { error } = await firebaseClient.from('reviews').insert({
      booking_id: reviewBooking.id,
      devotee_id: profile.id,
      pandit_id: reviewBooking.pandit_id,
      rating,
      comment: comment.trim(),
    });
    if (error) { toastError('Review Submission Failed', error.message); setSubmittingReview(false); return; }
    success('Review Submitted Successfully!', 'Thank you for blessing our community with your feedback.', {
      label: 'Explore More Poojas',
      href: '/app/services',
    });
    setReviewBooking(null);
    setRating(5);
    setComment('');
    setSubmittingReview(false);
  };

  const filtered = bookings.filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return ['pending', 'confirmed'].includes(b.status) && new Date(b.scheduled_at) >= new Date();
    if (filter === 'completed') return b.status === 'completed';
    if (filter === 'cancelled') return ['cancelled', 'rejected'].includes(b.status);
    return true;
  });

  return (
    <div>
      <PageHeader title="My Bookings" description="Track your pooja requests and their status." />

      <div className="mb-4 flex gap-2">
        {(['all', 'upcoming', 'completed', 'cancelled'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition ${
              filter === f
                ? 'bg-saffron-600 text-white shadow-soft'
                : 'border border-saffron-200 bg-white text-saffron-700 hover:bg-saffron-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <CalendarHeart className="h-10 w-10 text-saffron-300" />
          <p className="font-semibold text-saffron-900 dark:text-white">No bookings here</p>
          <p className="text-sm text-saffron-500">Your bookings will appear in this list.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div key={b.id} className="card p-4 sm:p-5">
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
                    {profile?.role !== 'pandit' && b.pandit && (
                      <span className="flex items-center gap-1">Pandit: {b.pandit.full_name}</span>
                    )}
                    {profile?.role === 'pandit' && b.devotee && (
                      <span className="flex items-center gap-1">Devotee: {b.devotee.full_name} ({b.devotee.phone || 'no phone'})</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-saffron-700 dark:text-saffron-300">{formatINR(b.amount)}</span>
                </div>
              </div>

              {b.status === 'confirmed' && b.mode === 'online' && b.video_link && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-saffron-50 px-3 py-2 text-sm dark:bg-saffron-500/10">
                  <Video className="h-4 w-4 text-saffron-600" />
                  <a href={b.video_link} target="_blank" rel="noreferrer" className="font-medium text-saffron-700 hover:underline dark:text-saffron-300">
                    Join video call
                  </a>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2 border-t border-saffron-100 pt-3 dark:border-slate-800">
                {b.status === 'completed' && (
                  <button
                    onClick={() => setSankalpBooking(b)}
                    className="btn-gold text-xs shadow-soft"
                    title="Download official digital Sankalp Patra & Blessings Certificate"
                  >
                    <Award className="h-4 w-4" /> 🪔 Sankalp Patra (PDF)
                  </button>
                )}
                {b.status === 'confirmed' && (
                  <button
                    onClick={() => setSankalpBooking(b)}
                    className="btn-secondary text-xs"
                    title="Preview Sankalp details"
                  >
                    <Scroll className="h-3.5 w-3.5 text-amber-600" /> Preview Sankalp
                  </button>
                )}
                {['pending', 'confirmed'].includes(b.status) && profile?.role === 'devotee' && (
                  <button onClick={() => cancelBooking(b.id)} disabled={cancelling === b.id} className="btn-danger">
                    {cancelling === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    Cancel
                  </button>
                )}
                {b.status === 'completed' && profile?.role === 'devotee' && (
                  <button onClick={() => setReviewBooking(b)} className="btn-secondary">
                    <Star className="h-4 w-4" /> Rate & Review
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pandit Review Modal */}
      <Modal
        open={!!reviewBooking}
        onClose={() => setReviewBooking(null)}
        title="Rate your pandit"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-saffron-600 dark:text-slate-400">
            How was your experience with {reviewBooking?.pandit?.full_name || 'your pandit'}?
          </p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((r) => (
              <button key={r} onClick={() => setRating(r)} className="p-1">
                <Star className={`h-7 w-7 transition ${r <= rating ? 'fill-marigold-400 text-marigold-400' : 'text-saffron-300'}`} />
              </button>
            ))}
          </div>
          <div>
            <label className="label">Comment (optional)</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Share your experience…" className="input" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setReviewBooking(null)} className="btn-secondary">Cancel</button>
            <button onClick={submitReview} disabled={submittingReview} className="btn-primary">
              {submittingReview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Submit
            </button>
          </div>
        </div>
      </Modal>

      {/* Digital Sankalp Patra & Blessings Certificate Modal */}
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
