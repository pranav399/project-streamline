import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarHeart,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Clock,
  ArrowRight,
  Flame,
  Star,
  Landmark,
  ExternalLink,
  Bot,
  MessageSquare,
  ShieldCheck,
  BookOpen,
  Calendar,
  CheckCircle2,
  Users,
  User,
  Award,
  Store,
  BarChart3,
  Wallet,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { firebaseClient, type Booking, type Service, type Product } from '../lib/firebase';
import { formatINR, formatDateTime } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';

export function DashboardPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const state = JSON.parse(localStorage.getItem('poojaconnect_fb_cache_v1') || '{}');
      return (state.bookings || []).slice(0, 5) as Booking[];
    } catch {
      return [];
    }
  });
  const [services, setServices] = useState<Service[]>(() => {
    try {
      const state = JSON.parse(localStorage.getItem('poojaconnect_fb_cache_v1') || '{}');
      return (state.services || []).slice(0, 4) as Service[];
    } catch {
      return [];
    }
  });
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const state = JSON.parse(localStorage.getItem('poojaconnect_fb_cache_v1') || '{}');
      return (state.products || []).slice(0, 4) as Product[];
    } catch {
      return [];
    }
  });

  const [adminSummary, setAdminSummary] = useState(() => {
    try {
      const state = JSON.parse(localStorage.getItem('poojaconnect_fb_cache_v1') || '{}');
      const prfs = state.profiles || [];
      const bks = state.bookings || [];
      const ords = state.orders || [];
      const pandits = state.pandits || [];
      const totalRitual = bks.reduce((sum: number, b: any) => sum + (Number(b.amount) || 0), 0);
      const totalShop = ords.reduce((sum: number, o: any) => sum + (Number(o.total ?? o.total_amount) || 0), 0);
      const payoutReqs = state.payout_requests || [];
      const pendingPayouts = payoutReqs.filter((p: any) => p.status === 'pending').length;
      return {
        totalUsers: prfs.length,
        devoteesCount: prfs.filter((p: any) => p.role === 'devotee').length,
        verifiedPandits: pandits.filter((p: any) => p.is_verified).length,
        pendingPandits: pandits.filter((p: any) => !p.is_verified).length,
        totalRitualRevenue: totalRitual,
        totalShopRevenue: totalShop,
        combinedRevenue: totalRitual + totalShop,
        totalBookings: bks.length,
        totalOrders: ords.length,
        pendingPayouts,
      };
    } catch {
      return {
        totalUsers: 0,
        devoteesCount: 0,
        verifiedPandits: 0,
        pendingPandits: 0,
        totalRitualRevenue: 0,
        totalShopRevenue: 0,
        combinedRevenue: 0,
        totalBookings: 0,
        totalOrders: 0,
        pendingPayouts: 0,
      };
    }
  });

  useEffect(() => {
    if (!profile) return;
    const fetchDashboard = async () => {
      let bksQuery;
      if (profile.role === 'devotee') {
        bksQuery = firebaseClient
          .from('bookings')
          .select('*, service:services(*)')
          .eq('devotee_id', profile.id)
          .order('scheduled_at', { ascending: false })
          .limit(5);
      } else if (profile.role === 'pandit') {
        bksQuery = firebaseClient
          .from('bookings')
          .select('*, service:services(*), devotee:profiles!bookings_devotee_id_fkey(id, full_name, email, phone, avatar_url)')
          .eq('pandit_id', profile.id)
          .order('scheduled_at', { ascending: false });
      } else {
        bksQuery = firebaseClient
          .from('bookings')
          .select('*, service:services(*), devotee:profiles!bookings_devotee_id_fkey(id, full_name, email, phone, avatar_url)')
          .order('created_at', { ascending: false })
          .limit(5);
      }

      const [bksRes, svcsRes, prodsRes] = await Promise.all([
        bksQuery,
        firebaseClient.from('services').select('*').eq('is_active', true).limit(4),
        firebaseClient.from('products').select('*').eq('is_active', true).limit(4),
      ]);

      if (bksRes?.data) setBookings(bksRes.data as Booking[]);
      if (svcsRes?.data) setServices(svcsRes.data as Service[]);
      if (prodsRes?.data) setProducts(prodsRes.data as Product[]);

      if (profile.role === 'admin') {
        try {
          const state = JSON.parse(localStorage.getItem('poojaconnect_fb_cache_v1') || '{}');
          const prfs = state.profiles || [];
          const bks = state.bookings || [];
          const ords = state.orders || [];
          const pandits = state.pandits || [];
          const payoutReqs = state.payout_requests || [];
          const pendingPayouts = payoutReqs.filter((p: any) => p.status === 'pending').length;
          const totalRitual = bks.reduce((sum: number, b: any) => sum + (Number(b.amount) || 0), 0);
          const totalShop = ords.reduce((sum: number, o: any) => sum + (Number(o.total ?? o.total_amount) || 0), 0);
          setAdminSummary({
            totalUsers: prfs.length,
            devoteesCount: prfs.filter((p: any) => p.role === 'devotee').length,
            verifiedPandits: pandits.filter((p: any) => p.is_verified).length,
            pendingPandits: pandits.filter((p: any) => !p.is_verified).length,
            totalRitualRevenue: totalRitual,
            totalShopRevenue: totalShop,
            combinedRevenue: totalRitual + totalShop,
            totalBookings: bks.length,
            totalOrders: ords.length,
            pendingPayouts,
          });
        } catch {
          // ignore fallback
        }
      }
      setLoading(false);
    };

    fetchDashboard();

    const handleSync = () => fetchDashboard();
    window.addEventListener('poojaconnect_firebase_sync', handleSync);
    return () => window.removeEventListener('poojaconnect_firebase_sync', handleSync);
  }, [profile]);

  if (!profile) return null;

  return (
    <div>
      <PageHeader
        title={`${greeting(profile.role)}, ${profile.full_name || (profile.role === 'pandit' ? 'Acharya Ji' : profile.role === 'admin' ? 'Administrator' : 'devotee')} 🙏`}
        description={roleSubtitle(profile.role)}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsFor(profile.role, bookings, products, adminSummary).map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card-warm p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 text-saffron-600 shadow-soft dark:bg-slate-800 dark:text-saffron-400">
                  <Icon className="h-5 w-5" />
                </span>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-3 text-2xl font-bold text-saffron-900 dark:text-white">{s.value}</p>
              <p className="text-sm text-saffron-600 dark:text-slate-400">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Featured Temple Heritage Banner with Hover and Animation Styles */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-saffron-300/80 bg-gradient-to-r from-saffron-500 via-saffron-600 to-vermillion-600 p-5 sm:p-6 text-white shadow-pop transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner">
              <Landmark className="h-6 w-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs">
                  New Portal Integration
                </span>
                <span className="text-xs text-saffron-100 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> 1,000+ Ancient Shrines
                </span>
              </div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-white mt-1">
                India Temple Heritage Portal
              </h3>
              <p className="text-xs sm:text-sm text-saffron-100 max-w-xl mt-0.5 leading-relaxed">
                Explore interactive 3D models, Jyotirlingas, Char Dham, and architectural wonders across Bharat directly in your app.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href="https://india-temple-heritage-portal-three.vercel.app/#/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-saffron-900 shadow-md transition-all duration-200 hover:bg-saffron-50 hover:scale-105 active:scale-95 cursor-pointer"
            >
              Explore Heritage Portal <ArrowRight className="h-3.5 w-3.5 text-saffron-600" />
            </a>
          </div>
        </div>
      </div>

      {/* Devotee User Interface Chatbot Assistant Helper Card */}
      {profile.role === 'devotee' && (
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-saffron-200/90 bg-gradient-to-r from-saffron-50 via-amber-50 to-marigold-50/60 p-4 sm:p-5 shadow-xs transition-all duration-300 hover:shadow-soft dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-saffron-500 to-vermillion-600 text-white shadow-soft">
              <Bot className="h-6 w-6" />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm sm:text-base font-bold text-saffron-950 dark:text-white">
                  Pooja Mitra • Devotee Spiritual Chatbot
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Online
                </span>
              </div>
              <p className="text-xs text-saffron-700/90 dark:text-slate-300 mt-0.5 max-w-xl">
                Need help selecting an auspicious pooja, finding ritual vidhi, or preparing sacred samagri? Click to ask your Vedic assistant.
              </p>
            </div>
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-devotee-chatbot'))}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-saffron-600 to-vermillion-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all duration-200 hover:scale-105 hover:shadow-glow active:scale-95"
          >
            <MessageSquare className="h-3.5 w-3.5" /> Open Chatbot Assistant
          </button>
        </div>
      )}

      {/* Pandit Priest Quick Control Banner */}
      {profile.role === 'pandit' && (
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50 via-saffron-50 to-orange-50/60 p-4 sm:p-5 shadow-xs transition-all duration-300 hover:shadow-soft dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-saffron-600 to-vermillion-700 text-white shadow-soft">
              <ShieldCheck className="h-6 w-6" />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm sm:text-base font-bold text-saffron-950 dark:text-white">
                  Vedic Priest Portal • {profile.full_name || 'Acharya'}
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Active Priest
                </span>
              </div>
              <p className="text-xs text-saffron-700/90 dark:text-slate-300 mt-0.5 max-w-xl">
                Accept incoming ceremony requests, manage your ritual calendar, and update your Dakshina profile.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/app/schedule"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-saffron-600 to-vermillion-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-md transition-all duration-200 hover:scale-105 hover:shadow-glow active:scale-95"
            >
              <Calendar className="h-3.5 w-3.5" /> My Schedule
            </Link>
            <Link
              to="/app/earnings"
              className="inline-flex items-center gap-1.5 rounded-xl border border-saffron-300/80 bg-white px-3.5 py-2.5 text-xs font-bold text-saffron-800 shadow-xs transition-all duration-200 hover:bg-saffron-50 dark:border-slate-700 dark:bg-slate-800 dark:text-saffron-300"
            >
              <Star className="h-3.5 w-3.5 text-amber-500" /> Priest Profile
            </Link>
          </div>
        </div>
      )}

      {/* Digital Sankalp Patra & Blessings Certificate Quick Access Banner */}
      <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border-2 border-amber-300/80 bg-gradient-to-r from-amber-500/10 via-saffron-500/10 to-amber-500/10 p-4 sm:p-5 shadow-xs transition-all duration-300 hover:shadow-soft dark:border-amber-700/60 dark:bg-slate-900">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-saffron-700 text-white shadow-soft text-xl font-bold">
            ॐ
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-sm sm:text-base font-bold text-saffron-950 dark:text-white">
                🪔 Digital Sankalp Patra & Blessings Certificate
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/60">
                PDF Keepsake
              </span>
            </div>
            <p className="text-xs text-saffron-700/90 dark:text-slate-300 mt-0.5 max-w-xl">
              Sacred, printable Sanskrit-English certificate with family names, Gotra, Nakshatra, Pandit seal, and chanted Vedic blessing shlokas.
            </p>
          </div>
        </div>
        <Link
          to="/app/sankalp-patra"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-saffron-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all duration-200 hover:scale-105 hover:shadow-glow active:scale-95"
        >
          <Award className="h-3.5 w-3.5" />
          <span>View Sankalp Patra</span>
        </Link>
      </div>

      {/* Main Grid: Role-specific Content */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Left Column: Recent Bookings/Requests */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-saffron-900 dark:text-white">
              {profile.role === 'pandit' ? 'Recent Ceremony Requests' : profile.role === 'admin' ? 'Recent Platform Bookings' : 'Recent Bookings'}
            </h2>
            <Link
              to={profile.role === 'pandit' ? '/app/schedule' : profile.role === 'admin' ? '/app/admin-orders' : '/app/bookings'}
              className="flex items-center gap-1 text-sm font-medium text-saffron-600 hover:text-saffron-800 dark:text-saffron-400"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="card overflow-hidden">
            {loading ? (
              <div className="space-y-3 p-4"><SkeletonCard /><SkeletonCard /></div>
            ) : bookings.length === 0 ? (
              <EmptyState
                icon={<CalendarHeart className="h-8 w-8" />}
                title={profile.role === 'pandit' ? 'No ceremony requests yet' : 'No bookings yet'}
                desc={
                  profile.role === 'pandit'
                    ? 'Keep your availability and priest profile updated to receive new booking requests from devotees.'
                    : profile.role === 'admin'
                    ? 'No bookings have been placed on the platform yet.'
                    : 'Book your first pooja ceremony with a verified pandit to see it here.'
                }
                action={
                  profile.role === 'devotee' ? (
                    <Link to="/app/services" className="btn-gold">Book a Pooja</Link>
                  ) : profile.role === 'pandit' ? (
                    <Link to="/app/schedule" className="btn-gold">View Schedule</Link>
                  ) : undefined
                }
              />
            ) : (
              <div className="divide-y divide-saffron-100 dark:divide-slate-800">
                {bookings.map((b) => (
                  <div key={b.id} className="flex items-center gap-4 p-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-saffron-100 text-saffron-600 dark:bg-saffron-500/10 dark:text-saffron-400">
                      <Flame className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-saffron-900 dark:text-white">
                        {b.service?.name ?? 'Ceremony'}
                        {profile.role === 'pandit' && b.devotee?.full_name ? (
                          <span className="text-xs font-normal text-saffron-600 dark:text-saffron-300 ml-1.5">
                            • Devotee: {b.devotee.full_name}
                          </span>
                        ) : null}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-saffron-500 dark:text-slate-400">
                        <Clock className="h-3 w-3" /> {formatDateTime(b.scheduled_at)}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                    <span className="hidden text-sm font-semibold text-saffron-700 dark:text-saffron-300 sm:block">
                      {formatINR(b.amount)}
                    </span>
                    {profile.role === 'pandit' && (
                      <Link
                        to="/app/schedule"
                        className="rounded-lg bg-saffron-100 px-2.5 py-1 text-xs font-semibold text-saffron-800 hover:bg-saffron-200 dark:bg-slate-800 dark:text-saffron-300"
                      >
                        Manage
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Role-Appropriate Panel */}
        <div>
          {/* Devotee View: Popular Poojas with prominent Book Now buttons */}
          {profile.role === 'devotee' && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-semibold text-saffron-900 dark:text-white">Popular Poojas</h2>
                  <span className="rounded-full bg-saffron-100 dark:bg-saffron-950/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-saffron-700 dark:text-saffron-300">
                    Book Rituals
                  </span>
                </div>
                <Link
                  to="/app/services"
                  className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-saffron-600 hover:text-saffron-800 dark:text-saffron-400 transition hover:underline"
                >
                  View All <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <SkeletonCard />
                ) : services.length === 0 ? (
                  <div className="card p-6 text-center text-sm text-saffron-500 dark:text-slate-400">
                    <Sparkles className="mx-auto mb-2 h-6 w-6 text-saffron-300" />
                    <p className="font-semibold text-saffron-900 dark:text-white">No poojas available</p>
                    <p className="mt-1 text-xs text-saffron-500">Services catalog is currently being updated.</p>
                  </div>
                ) : (
                  services.map((s) => (
                    <div
                      key={s.id}
                      className="card group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 transition-all duration-200 hover:shadow-pop hover:border-saffron-300/80 dark:hover:border-saffron-700"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl bg-saffron-100 dark:bg-slate-800 shadow-inner">
                          {s.image_url ? (
                            <img
                              src={s.image_url}
                              alt={s.name}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : null}
                          <div className="flex h-full w-full items-center justify-center text-saffron-400">
                            <Flame className="h-5 w-5" />
                          </div>
                          <span className="absolute bottom-0 inset-x-0 bg-saffron-950/70 py-0.5 text-[9px] text-center font-bold text-white uppercase backdrop-blur-xs">
                            {s.duration_mins ? `${s.duration_mins}m` : 'Vedic'}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-saffron-50 dark:bg-saffron-950/60 px-1.5 py-0.5 text-[10px] font-medium text-saffron-700 dark:text-saffron-300 border border-saffron-200/60 dark:border-saffron-800/60">
                              {s.category}
                            </span>
                          </div>
                          <p className="truncate text-sm font-semibold text-saffron-950 dark:text-white mt-1">
                            {s.name}
                          </p>
                          <p className="text-xs font-bold text-saffron-700 dark:text-saffron-300 sm:hidden mt-0.5">
                            {formatINR(s.price)}
                          </p>
                        </div>
                      </div>

                      {/* Actions & Price */}
                      <div className="flex items-center justify-between sm:justify-end sm:flex-col sm:items-end gap-2 border-t border-saffron-100/70 pt-2.5 sm:border-t-0 sm:pt-0 dark:border-slate-800">
                        <div className="hidden sm:block text-right">
                          <span className="text-[11px] text-saffron-500 dark:text-slate-400 block font-medium">Dakshina</span>
                          <span className="text-sm font-bold text-saffron-800 dark:text-saffron-300">
                            {formatINR(s.price)}
                          </span>
                        </div>

                        <Link
                          to={`/app/book?service=${s.id}`}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-saffron-500 to-vermillion-600 px-3.5 py-2 text-xs font-bold text-white shadow-soft transition-all duration-200 hover:from-saffron-600 hover:to-vermillion-700 hover:scale-[1.03] active:scale-95 text-center"
                        >
                          <CalendarHeart className="h-3.5 w-3.5 shrink-0" />
                          <span>Book Now</span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Pandit View: Priest Controls & Quick Tools */}
          {profile.role === 'pandit' && (
            <div className="space-y-4">
              <div className="card p-5 border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/50 to-white dark:from-slate-900 dark:to-slate-800">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <h3 className="font-display text-sm font-bold text-saffron-950 dark:text-white">
                    Priest Status: Available for Rituals
                  </h3>
                </div>
                <p className="mt-1 text-xs text-saffron-700 dark:text-slate-300">
                  You are currently active and discoverable by devotees searching for verified priests in your region.
                </p>
              </div>

              <div className="card p-4 space-y-2">
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-saffron-700 dark:text-saffron-300">
                  Priest Quick Actions
                </h3>
                <div className="space-y-2 pt-1">
                  <Link
                    to="/app/schedule"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-saffron-200/70 hover:border-saffron-400 bg-saffron-50/40 hover:bg-saffron-100/60 transition group dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar className="h-4 w-4 text-saffron-600 group-hover:scale-110 transition" />
                      <div>
                        <p className="text-xs font-bold text-saffron-900 dark:text-white">My Ritual Schedule</p>
                        <p className="text-[10px] text-saffron-600 dark:text-slate-400">Accept/decline booking requests</p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-saffron-600" />
                  </Link>

                  <Link
                    to="/app/earnings"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-saffron-200/70 hover:border-saffron-400 bg-saffron-50/40 hover:bg-saffron-100/60 transition group dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <Star className="h-4 w-4 text-amber-500 group-hover:scale-110 transition" />
                      <div>
                        <p className="text-xs font-bold text-saffron-900 dark:text-white">Earnings & Bio Profile</p>
                        <p className="text-[10px] text-saffron-600 dark:text-slate-400">Update dakshina rates & mantras</p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-saffron-600" />
                  </Link>

                  <Link
                    to="/app/profile"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-saffron-200/70 hover:border-saffron-400 bg-saffron-50/40 hover:bg-saffron-100/60 transition group dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="h-4 w-4 text-saffron-600 group-hover:scale-110 transition" />
                      <div>
                        <p className="text-xs font-bold text-saffron-900 dark:text-white">Account Settings</p>
                        <p className="text-[10px] text-saffron-600 dark:text-slate-400">Phone, email & security</p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-saffron-600" />
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <p className="text-xs font-bold">Vedic Preparation Reminder</p>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
                  Please verify family gotra and confirm sacred samagri checklist at least 24 hours prior to ritual vidhi.
                </p>
              </div>
            </div>
          )}

          {/* Admin View: Platform Controls */}
          {profile.role === 'admin' && (
            <div className="space-y-4">
              <div className="card p-4 space-y-2">
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-saffron-700 dark:text-saffron-300">
                  Administration Quick Links
                </h3>
                <div className="space-y-2 pt-1">
                  <Link
                    to="/app/admin-analytics"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-saffron-300/90 bg-gradient-to-r from-saffron-50 via-amber-50 to-orange-50 hover:from-saffron-100 hover:to-amber-100 transition group shadow-xs dark:border-saffron-800 dark:from-slate-800 dark:to-saffron-950/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-saffron-600 text-white shadow-xs group-hover:scale-105 transition">
                        <BarChart3 className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-saffron-950 dark:text-white">Analytics & Visualizations</p>
                          <span className="rounded-full bg-saffron-600 text-white text-[9px] font-bold px-1.5 py-0.2">New</span>
                        </div>
                        <p className="text-[10px] text-saffron-700 dark:text-slate-400">8 interactive data charts</p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-saffron-600" />
                  </Link>
                  <Link
                    to="/app/admin-payouts"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-amber-300/80 bg-gradient-to-r from-amber-50/70 to-saffron-50/70 hover:from-amber-100/70 hover:to-saffron-100/70 transition group shadow-xs dark:border-amber-800/80 dark:from-slate-800 dark:to-amber-950/30"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600 text-white shadow-xs group-hover:scale-105 transition">
                        <Wallet className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-saffron-950 dark:text-white">Pandit Payouts</p>
                          {(adminSummary.pendingPayouts ?? 0) > 0 && (
                            <span className="rounded-full bg-amber-500 text-amber-950 text-[9px] font-bold px-1.5 py-0.2 animate-pulse">
                              {adminSummary.pendingPayouts} Pending
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-saffron-700/80 dark:text-slate-400">Review, verify & approve dakshina disbursements</p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-amber-600" />
                  </Link>
                  <Link
                    to="/app/admin-users"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-saffron-200/70 hover:border-saffron-400 bg-saffron-50/40 hover:bg-saffron-100/60 transition group dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="h-4 w-4 text-saffron-600" />
                      <p className="text-xs font-bold text-saffron-900 dark:text-white">Manage Users</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-saffron-600" />
                  </Link>
                  <Link
                    to="/app/admin-pandits"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-saffron-200/70 hover:border-saffron-400 bg-saffron-50/40 hover:bg-saffron-100/60 transition group dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <p className="text-xs font-bold text-saffron-900 dark:text-white">Verify Pandits</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-saffron-600" />
                  </Link>
                  <Link
                    to="/app/admin-services"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-saffron-200/70 hover:border-saffron-400 bg-saffron-50/40 hover:bg-saffron-100/60 transition group dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <CalendarHeart className="h-4 w-4 text-saffron-600" />
                      <p className="text-xs font-bold text-saffron-900 dark:text-white">Pooja Services Catalog</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-saffron-600" />
                  </Link>
                  <Link
                    to="/app/admin-products"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-saffron-200/70 hover:border-saffron-400 bg-saffron-50/40 hover:bg-saffron-100/60 transition group dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShoppingBag className="h-4 w-4 text-amber-600" />
                      <p className="text-xs font-bold text-saffron-900 dark:text-white">Samagri Shop Products</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-saffron-600" />
                  </Link>
                  <Link
                    to="/app/admin-orders"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-saffron-200/70 hover:border-saffron-400 bg-saffron-50/40 hover:bg-saffron-100/60 transition group dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <Store className="h-4 w-4 text-saffron-600" />
                      <p className="text-xs font-bold text-saffron-900 dark:text-white">Transactions & Orders</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-saffron-600" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Role-Appropriate Content */}
      {/* Devotee: Featured Samagri Shop */}
      {profile.role === 'devotee' && (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-saffron-900 dark:text-white">Featured Samagri</h2>
            <Link to="/app/shop" className="flex items-center gap-1 text-sm font-medium text-saffron-600 hover:text-saffron-800 dark:text-saffron-400">
              Shop all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            ) : products.length === 0 ? (
              <div className="col-span-full card p-8 text-center text-sm text-saffron-500 dark:text-slate-400">
                <ShoppingBag className="mx-auto mb-2 h-7 w-7 text-saffron-300" />
                <p className="font-semibold text-saffron-900 dark:text-white">No samagri items available</p>
                <p className="mt-1 text-xs text-saffron-500">Check back soon for new pooja samagri in our shop.</p>
              </div>
            ) : (
              products.map((p) => (
                <Link key={p.id} to="/app/shop" className="card overflow-hidden transition hover:shadow-pop">
                  <div className="aspect-square overflow-hidden bg-saffron-100 dark:bg-slate-800">
                    {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold text-saffron-900 dark:text-white">{p.name}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-sm font-bold text-saffron-700 dark:text-saffron-300">{formatINR(p.price)}</span>
                      {p.stock > 0 ? (
                        <span className="chip bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">In stock</span>
                      ) : (
                        <span className="chip bg-vermillion-100 text-vermillion-700 dark:bg-vermillion-500/15 dark:text-vermillion-300">Out</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}

      {/* Pandit: Code of Conduct & Ritual Guidelines */}
      {profile.role === 'pandit' && (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-saffron-900 dark:text-white">
              Priest Code of Conduct & Ritual Excellence
            </h2>
            <span className="text-xs font-semibold text-saffron-600 dark:text-saffron-400">
              Vedic Guidelines
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card p-4 border border-saffron-200/80 hover:shadow-pop transition">
              <div className="flex items-center gap-2 text-saffron-700 dark:text-saffron-300">
                <Clock className="h-4 w-4 text-saffron-600" />
                <h3 className="font-display text-sm font-bold">Punctual Muhurat Arrival</h3>
              </div>
              <p className="mt-2 text-xs text-saffron-600 dark:text-slate-400 leading-relaxed">
                Always arrive 15 minutes prior to the calculated auspicious muhurat to set up the holy mandap and tranquilize the atmosphere.
              </p>
            </div>
            <div className="card p-4 border border-saffron-200/80 hover:shadow-pop transition">
              <div className="flex items-center gap-2 text-saffron-700 dark:text-saffron-300">
                <Flame className="h-4 w-4 text-saffron-600" />
                <h3 className="font-display text-sm font-bold">Sacred Samagri Check</h3>
              </div>
              <p className="mt-2 text-xs text-saffron-600 dark:text-slate-400 leading-relaxed">
                Inspect Gangajal, pure cow ghee, unbroken akshat, and Janeu before starting the sankalp to ensure ritual authenticity.
              </p>
            </div>
            <div className="card p-4 border border-saffron-200/80 hover:shadow-pop transition">
              <div className="flex items-center gap-2 text-saffron-700 dark:text-saffron-300">
                <Sparkles className="h-4 w-4 text-saffron-600" />
                <h3 className="font-display text-sm font-bold">Devotee Vidhi Guidance</h3>
              </div>
              <p className="mt-2 text-xs text-saffron-600 dark:text-slate-400 leading-relaxed">
                Explain the divine meaning of Sanskrit slokas clearly to family members so all devotees participate with heartfelt devotion.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Admin: Analytics & Visual Intelligence Showcase */}
      {profile.role === 'admin' && (
        <div className="mt-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-semibold text-saffron-900 dark:text-white">
                  Platform Analytics & Visual Overview
                </h2>
                <span className="rounded-full bg-saffron-100 dark:bg-saffron-950/60 px-2 py-0.5 text-[10px] font-bold text-saffron-700 dark:text-saffron-300 border border-saffron-200/60 dark:border-saffron-800/60">
                  Visual Intelligence
                </span>
              </div>
              <p className="text-xs text-saffron-600 dark:text-slate-400 mt-0.5">
                Interactive metrics on platform users, ceremony revenue velocity, and priest verification.
              </p>
            </div>
            <Link
              to="/app/admin-analytics"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-saffron-600 to-vermillion-600 px-3.5 py-2 text-xs font-bold text-white shadow-md transition hover:scale-105 hover:shadow-glow active:scale-95 shrink-0"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Open Full Analytics Suite (8 Charts)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Chart 1: Revenue Velocity Preview */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-display text-sm font-bold text-saffron-900 dark:text-white">
                    Platform Revenue Velocity (₹)
                  </h3>
                  <p className="text-[11px] text-saffron-600 dark:text-slate-400">
                    Combined Pooja Dakshina & Samagri Shop monthly trends
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {formatINR(adminSummary.combinedRevenue)} Total
                </span>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={[
                      { month: 'May', ritual: 24000, shop: 8500 },
                      { month: 'Jun', ritual: 38000, shop: 12400 },
                      { month: 'Jul', ritual: 52000, shop: 19800 },
                      { month: 'Aug', ritual: 68000, shop: 26500 },
                      { month: 'Sep', ritual: 92000, shop: 34200 },
                      { month: 'Oct', ritual: 124000, shop: 48900 },
                    ]}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="adminDashRitualGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ea580c" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="adminDashShopGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" opacity={0.6} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        formatINR(Number(val)),
                        name === 'ritual' ? 'Rituals Dakshina' : 'Samagri Shop',
                      ]}
                    />
                    <Area type="monotone" dataKey="ritual" stroke="#ea580c" strokeWidth={2} fillOpacity={1} fill="url(#adminDashRitualGrad)" />
                    <Area type="monotone" dataKey="shop" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#adminDashShopGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: User Demographics Preview */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-display text-sm font-bold text-saffron-900 dark:text-white">
                    Platform User Distribution
                  </h3>
                  <p className="text-[11px] text-saffron-600 dark:text-slate-400">
                    Breakdown of registered devotees, verified pandits, and admins
                  </p>
                </div>
                <span className="text-xs font-bold text-saffron-700 dark:text-saffron-300">
                  {adminSummary.totalUsers} Registered
                </span>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { role: 'Devotees', count: adminSummary.devoteesCount || 8, fill: '#ea580c' },
                      { role: 'Verified Pandits', count: adminSummary.verifiedPandits || 5, fill: '#10b981' },
                      { role: 'Pending Pandits', count: adminSummary.pendingPandits || 1, fill: '#f59e0b' },
                      { role: 'Admins', count: 2, fill: '#dc2626' },
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" opacity={0.6} />
                    <XAxis dataKey="role" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function greeting(role?: string): string {
  const h = new Date().getHours();
  const time = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  if (role === 'pandit') return `${time}, Pranam Pandit Ji`;
  return `${time}`;
}

function roleSubtitle(role: string): string {
  if (role === 'devotee') return 'Your sacred devotional journey, ceremonies & samagri at a glance.';
  if (role === 'pandit') return 'Manage your ceremony requests, ritual schedule, and Dakshina earnings.';
  return 'Oversee platform activity, verified priests, ceremonies, and transactions.';
}

function statsFor(role: string, bookings: Booking[], products: Product[], adminSummary?: any) {
  const upcomingCount = bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending').length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const totalSpent = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);

  if (role === 'pandit') {
    return [
      { label: 'Pending Requests', value: String(bookings.filter((b) => b.status === 'pending').length), icon: CalendarHeart },
      { label: 'Completed Poojas', value: String(completedCount), icon: Sparkles },
      { label: 'Total Earnings', value: formatINR(totalSpent), icon: TrendingUp },
      { label: 'Rating', value: '4.9 ★', icon: Star },
    ];
  }
  if (role === 'admin') {
    return [
      { label: 'Platform Users', value: String(adminSummary?.totalUsers || 16), icon: Users },
      { label: 'Verified Pandits', value: String(adminSummary?.verifiedPandits || 5), icon: ShieldCheck },
      { label: 'Rituals & Shop Orders', value: String((adminSummary?.totalBookings || bookings.length) + (adminSummary?.totalOrders || 0)), icon: CalendarHeart },
      { label: 'Platform Revenue', value: formatINR(adminSummary?.combinedRevenue || totalSpent), icon: TrendingUp },
    ];
  }
  return [
    { label: 'Upcoming', value: String(upcomingCount), icon: CalendarHeart },
    { label: 'Completed', value: String(completedCount), icon: Sparkles },
    { label: 'Total Bookings', value: String(bookings.length), icon: ShoppingBag },
    { label: 'Total Amount', value: formatINR(totalSpent), icon: TrendingUp },
  ];
}

function EmptyState({ icon, title, desc, action }: { icon: ReactNode; title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-saffron-100 text-saffron-400 dark:bg-slate-800">{icon}</span>
      <p className="font-semibold text-saffron-900 dark:text-white">{title}</p>
      <p className="max-w-sm text-sm text-saffron-500 dark:text-slate-400">{desc}</p>
      {action}
    </div>
  );
}
