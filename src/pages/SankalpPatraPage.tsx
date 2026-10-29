import React, { useEffect, useState } from 'react';
import {
  Flame,
  Award,
  Download,
  Printer,
  Calendar,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  Eye,
  Scroll,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { firebaseClient, type Booking } from '../lib/firebase';
import { formatDateTime } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { SkeletonCard } from '../components/ui/Skeleton';
import { SankalpPatraModal } from '../components/sankalp/SankalpPatraModal';

export function SankalpPatraPage() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const state = JSON.parse(localStorage.getItem('poojaconnect_fb_cache_v1') || '{}');
      return (state.bookings || []) as Booking[];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [sampleMode, setSampleMode] = useState(false);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const col = profile.role === 'pandit' ? 'pandit_id' : profile.role === 'admin' ? null : 'devotee_id';
      let q = firebaseClient
        .from('bookings')
        .select('*, service:services(*), devotee:profiles!bookings_devotee_id_fkey(id, full_name, email, phone, avatar_url), pandit:profiles!bookings_pandit_id_fkey(id, full_name, avatar_url)')
        .order('scheduled_at', { ascending: false });

      if (col) q = q.eq(col, profile.id);
      const { data } = await q;

      const allBookings = (data as Booking[]) ?? [];
      setBookings(allBookings);
      setLoading(false);
    })();
  }, [profile]);

  const openCertificate = (b: Booking | null, isSample = false) => {
    setSelectedBooking(b);
    setSampleMode(isSample);
    setModalOpen(true);
  };

  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const otherBookings = bookings.filter((b) => b.status === 'confirmed');

  return (
    <div className="space-y-6">
      <PageHeader
        title="🪔 Digital Sankalp Patra & Blessings Certificate"
        description="Preserve your sacred milestone with an authentic Vedic certificate featuring family names, Gotra, Nakshatra, Shastriji's seal, and chanted shlokas."
      />

      {/* Hero Spiritual Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-saffron-600 to-vermillion-700 p-6 sm:p-8 text-white shadow-pop">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>॥ शास्त्रोक्त संकल्प सिद्धिः ॥ Official Vedic Keepsake</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
            Sacred Digital Sankalp Patra
          </h2>
          <p className="mt-2 text-sm sm:text-base text-amber-100/90 leading-relaxed">
            Every Vedic ceremony performed with PoojaConnect carries an eternal spiritual vibration.
            Download your gold-gilded, printable A4 Sankalp Certificate with verified Acharya seal,
            QR verification, and chanted Rigvedic blessings.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => openCertificate(completedBookings[0] || null, completedBookings.length === 0)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-saffron-800 shadow-md hover:bg-amber-50 transition"
            >
              <Award className="w-4 h-4 text-saffron-600" />
              <span>{completedBookings.length > 0 ? 'View Latest Sankalp Patra' : 'Generate Sample Sankalp Patra'}</span>
            </button>
            <button
              onClick={() => openCertificate(null, true)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition backdrop-blur-md"
            >
              <Eye className="w-4 h-4" />
              <span>Preview Auspicious Griha Pravesh Demo</span>
            </button>
          </div>
        </div>

        {/* Decorative Golden Mandala / Om in background */}
        <div className="absolute -right-8 -bottom-10 opacity-15 pointer-events-none select-none text-[220px] font-display">
          ॐ
        </div>
      </div>

      {/* Completed Ceremonies Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-saffron-600" />
            <h3 className="font-display text-lg font-bold text-saffron-950 dark:text-white">
              Completed Ceremonies ({completedBookings.length})
            </h3>
          </div>
          <span className="text-xs text-saffron-600 dark:text-slate-400">
            {profile?.role === 'pandit' ? 'Ceremonies you consecrated' : 'Ceremonies consecrated for your family'}
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : completedBookings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedBookings.map((b) => (
              <div
                key={b.id}
                className="card p-5 border-amber-200/80 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 hover:shadow-pop transition relative"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-saffron-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
                      ॐ
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-saffron-950 dark:text-white text-base">
                        {b.service?.name || 'Vedic Ceremony'}
                      </h4>
                      <p className="text-xs text-saffron-600 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDateTime(b.scheduled_at)}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full dark:bg-emerald-950/50 dark:text-emerald-300">
                    <CheckCircle className="w-3 h-3" />
                    Sankalp Ready
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-saffron-800 dark:text-slate-300 bg-saffron-50/60 dark:bg-slate-800/60 p-3 rounded-lg border border-saffron-100 dark:border-slate-700">
                  <div>
                    <span className="text-saffron-500 dark:text-slate-400 block text-[10px] uppercase">
                      {profile?.role === 'pandit' ? 'Devotee (Yajman)' : 'Presiding Acharya'}
                    </span>
                    <span className="font-semibold truncate block">
                      {profile?.role === 'pandit'
                        ? b.devotee?.full_name || 'Devotee'
                        : b.pandit?.full_name || 'Acharya Shastri'}
                    </span>
                  </div>
                  <div>
                    <span className="text-saffron-500 dark:text-slate-400 block text-[10px] uppercase">
                      Gotra & Vidhan
                    </span>
                    <span className="font-semibold truncate block">
                      {b.gotra ? `${b.gotra} Gotra` : 'Shastrokt Vidhan'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-saffron-100 dark:border-slate-800">
                  <span className="font-mono text-[10px] text-saffron-500 dark:text-slate-400">
                    ID: SKP-2026-{b.id.slice(0, 8).toUpperCase()}
                  </span>
                  <button
                    onClick={() => openCertificate(b, false)}
                    className="btn-gold text-xs py-1.5 px-3"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>View & Download Sankalp Patra</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center bg-white dark:bg-slate-900 border-saffron-200 dark:border-slate-800">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
              <Scroll className="w-7 h-7" />
            </div>
            <h4 className="font-display font-bold text-saffron-950 dark:text-white text-lg">
              No Completed Ceremonies Yet
            </h4>
            <p className="text-xs sm:text-sm text-saffron-600 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
              Your official Sankalp Patra is automatically generated as soon as your Pandit marks a ceremony as completed.
              In the meantime, you can preview and customize a sample certificate below!
            </p>
            <button
              onClick={() => openCertificate(null, true)}
              className="btn-gold text-xs sm:text-sm shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              <span>Preview & Customize Sample Sankalp Patra</span>
            </button>
          </div>
        )}
      </div>

      {/* Upcoming / In-Progress Ceremonies Notice */}
      {otherBookings.length > 0 && (
        <div className="card p-4 bg-amber-50/70 border-amber-200 dark:bg-slate-900 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Flame className="w-5 h-5 text-saffron-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <h4 className="text-xs sm:text-sm font-bold text-saffron-900 dark:text-white">
                You have {otherBookings.length} upcoming ceremony scheduled
              </h4>
              <p className="text-xs text-saffron-600 dark:text-slate-400">
                You can pre-configure your Gotra, Nakshatra, and family members now so your Sankalp Patra is consecrated with precision on the day of the pooja.
              </p>
            </div>
            <button
              onClick={() => openCertificate(otherBookings[0], false)}
              className="btn-secondary text-xs shrink-0"
            >
              Pre-view Sankalp
            </button>
          </div>
        </div>
      )}

      {/* Vedic Shastric Significance Guide */}
      <div className="card p-5 sm:p-6 bg-white dark:bg-slate-900 border-saffron-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2 border-b border-saffron-100 pb-3 dark:border-slate-800">
          <Info className="w-5 h-5 text-saffron-600" />
          <h3 className="font-display text-base font-bold text-saffron-950 dark:text-white">
            Spiritual Significance of the Sankalp Patra (संकल्प की महत्ता)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-saffron-800 dark:text-slate-300">
          <div className="p-3.5 rounded-xl bg-saffron-50/60 dark:bg-slate-800/50 border border-saffron-100 dark:border-slate-700">
            <p className="font-bold text-saffron-900 dark:text-white mb-1">
              १. देश-काल एवं अग्नि साक्षी (Desha-Kala Sankalp)
            </p>
            <p className="leading-relaxed text-saffron-600 dark:text-slate-400">
              In Vedic traditions, no ritual is complete without invoking the exact cosmic coordinates (Desha, Kala, Tithi, Nakshatra) and family lineage (Gotra).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-saffron-50/60 dark:bg-slate-800/50 border border-saffron-100 dark:border-slate-700">
            <p className="font-bold text-saffron-900 dark:text-white mb-1">
              २. शुभाशीर्वाद एवं रक्षा मन्त्र (Chanted Vedic Protection)
            </p>
            <p className="leading-relaxed text-saffron-600 dark:text-slate-400">
              Chanted Rigvedic Shanti Mantras resonate long after the ceremony. Keeping this blessed document in your home temple fosters ongoing prosperity and peace.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-saffron-50/60 dark:bg-slate-800/50 border border-saffron-100 dark:border-slate-700">
            <p className="font-bold text-saffron-900 dark:text-white mb-1">
              ३. डिजिटल प्रामाणिकता (Verified Shastric Record)
            </p>
            <p className="leading-relaxed text-saffron-600 dark:text-slate-400">
              Every certificate carries an authentic Shastriji digital verification seal and QR code linking directly to the verified pooja log on PoojaConnect.
            </p>
          </div>
        </div>
      </div>

      {/* Sankalp Patra Modal */}
      {modalOpen && (
        <SankalpPatraModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          booking={sampleMode ? null : selectedBooking}
        />
      )}
    </div>
  );
}
