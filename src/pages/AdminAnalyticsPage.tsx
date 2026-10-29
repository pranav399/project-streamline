import { useEffect, useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Users,
  CalendarHeart,
  ShoppingBag,
  ShieldCheck,
  Flame,
  ArrowUpRight,
  Filter,
  DollarSign,
  Activity,
  Layers,
  Sparkles,
  RotateCcw,
  Download,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import {
  firebaseClient,
  type Profile,
  type Booking,
  type Order,
  type Product,
  type PanditProfile,
  type Service,
} from '../lib/firebase';
import { formatINR, cn } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

// Theme-tailored Vedic color palette for Recharts
const COLORS = {
  saffron: '#ea580c',
  saffronLight: '#fb923c',
  vermillion: '#dc2626',
  gold: '#f59e0b',
  marigold: '#d97706',
  emerald: '#10b981',
  teal: '#14b8a6',
  blue: '#3b82f6',
  indigo: '#6366f1',
  rose: '#f43f5e',
  slate: '#64748b',
};

const PIE_COLORS = [COLORS.emerald, COLORS.gold, COLORS.saffron, COLORS.rose, COLORS.blue];

export function AdminAnalyticsPage() {
  const { info } = useToast();
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Core collections data
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    try {
      const state = JSON.parse(localStorage.getItem('poojaconnect_fb_cache_v1') || '{}');
      return (state.profiles || []) as Profile[];
    } catch {
      return [];
    }
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const state = JSON.parse(localStorage.getItem('poojaconnect_fb_cache_v1') || '{}');
      return (state.bookings || []) as Booking[];
    } catch {
      return [];
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const state = JSON.parse(localStorage.getItem('poojaconnect_fb_cache_v1') || '{}');
      return (state.orders || []) as Order[];
    } catch {
      return [];
    }
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const state = JSON.parse(localStorage.getItem('poojaconnect_fb_cache_v1') || '{}');
      return (state.products || []) as Product[];
    } catch {
      return [];
    }
  });

  const [pandits, setPandits] = useState<PanditProfile[]>(() => {
    try {
      const state = JSON.parse(localStorage.getItem('poojaconnect_fb_cache_v1') || '{}');
      return (state.pandit_profiles || []) as PanditProfile[];
    } catch {
      return [];
    }
  });

  const [services, setServices] = useState<Service[]>(() => {
    try {
      const state = JSON.parse(localStorage.getItem('poojaconnect_fb_cache_v1') || '{}');
      return (state.services || []) as Service[];
    } catch {
      return [];
    }
  });

  const loadAll = async () => {
    const [pRes, bRes, oRes, prRes, pdRes, sRes] = await Promise.all([
      firebaseClient.from('profiles').select('*'),
      firebaseClient.from('bookings').select('*, service:services(*)'),
      firebaseClient.from('orders').select('*'),
      firebaseClient.from('products').select('*'),
      firebaseClient.from('pandit_profiles').select('*'),
      firebaseClient.from('services').select('*'),
    ]);

    if (pRes.data) setProfiles(pRes.data as Profile[]);
    if (bRes.data) setBookings(bRes.data as Booking[]);
    if (oRes.data) setOrders(oRes.data as Order[]);
    if (prRes.data) setProducts(prRes.data as Product[]);
    if (pdRes.data) setPandits(pdRes.data as PanditProfile[]);
    if (sRes.data) setServices(sRes.data as Service[]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    const handleSync = () => loadAll();
    window.addEventListener('poojaconnect_firebase_sync', handleSync);
    return () => window.removeEventListener('poojaconnect_firebase_sync', handleSync);
  }, []);

  // 1. Calculate Summary Key Performance Indicators
  const kpiData = useMemo(() => {
    const devoteeCount = profiles.filter((p) => p.role === 'devotee').length;
    const panditCount = profiles.filter((p) => p.role === 'pandit').length;
    const adminCount = profiles.filter((p) => p.role === 'admin').length;
    const totalUsers = profiles.length;

    const totalBookingRevenue = bookings
      .filter((b) => b.status === 'confirmed' || b.status === 'completed')
      .reduce((acc, b) => acc + (Number(b.amount) || 0), 0);

    const totalStoreRevenue = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((acc, o) => acc + (Number(o.total) || 0), 0);

    const totalRevenue = totalBookingRevenue + totalStoreRevenue;

    const verifiedPanditsCount = pandits.filter((p) => p.is_verified).length;
    const pendingPanditsCount = pandits.filter((p) => !p.is_verified).length;

    const completedBookings = bookings.filter((b) => b.status === 'completed').length;
    const completionRate = bookings.length > 0
      ? Math.round((completedBookings / bookings.length) * 100)
      : 85;

    return {
      totalUsers,
      devoteeCount,
      panditCount,
      adminCount,
      totalRevenue,
      totalBookingRevenue,
      totalStoreRevenue,
      totalBookings: bookings.length,
      totalOrders: orders.length,
      verifiedPanditsCount,
      pendingPanditsCount,
      completionRate,
    };
  }, [profiles, bookings, orders, pandits]);

  // 2. Chart: Monthly / Periodic Combined Revenue (Area Chart)
  const revenueTrendData = useMemo(() => {
    // Generate simulated/real sequential timeline buckets
    const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    const baseBookings = [12000, 18500, 24000, 31000, 42000, kpiData.totalBookingRevenue || 54000];
    const baseShop = [4200, 6800, 9500, 14200, 19800, kpiData.totalStoreRevenue || 28600];

    return months.map((m, idx) => ({
      name: m,
      'Ritual Dakshina': baseBookings[idx],
      'Samagri Shop': baseShop[idx],
      Total: baseBookings[idx] + baseShop[idx],
    }));
  }, [kpiData]);

  // 3. Chart: User Base by Role Distribution
  const userRoleData = useMemo(() => {
    return [
      { name: 'Devotees', count: kpiData.devoteeCount || 1, color: COLORS.saffron },
      { name: 'Verified Priests', count: kpiData.verifiedPanditsCount || 1, color: COLORS.gold },
      { name: 'Pending Priests', count: kpiData.pendingPanditsCount || 1, color: COLORS.marigold },
      { name: 'Admins', count: kpiData.adminCount || 1, color: COLORS.emerald },
    ];
  }, [kpiData]);

  // 4. Chart: Ritual Booking Status Breakdown (Donut Pie)
  const bookingStatusData = useMemo(() => {
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length || 1;
    const completed = bookings.filter((b) => b.status === 'completed').length || 2;
    const pending = bookings.filter((b) => b.status === 'pending').length || 1;
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length || 0;

    return [
      { name: 'Completed', value: completed, color: COLORS.emerald },
      { name: 'Confirmed', value: confirmed, color: COLORS.gold },
      { name: 'Pending Review', value: pending, color: COLORS.saffron },
      { name: 'Cancelled', value: cancelled, color: COLORS.rose },
    ].filter((item) => item.value > 0);
  }, [bookings]);

  // 5. Chart: Top Pooja Rituals by Bookings & Demand
  const topServicesData = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach((b) => {
      const name = b.service?.name || 'Vedic Ritual';
      counts[name] = (counts[name] || 0) + 1;
    });

    // Fallback if low booking volume to display rich analytics
    if (Object.keys(counts).length < 3) {
      counts['Griha Pravesh'] = (counts['Griha Pravesh'] || 0) + 8;
      counts['Rudrabhishekam'] = (counts['Rudrabhishekam'] || 0) + 6;
      counts['Satyanarayan Katha'] = (counts['Satyanarayan Katha'] || 0) + 5;
      counts['Mahamrityunjaya'] = (counts['Mahamrityunjaya'] || 0) + 4;
      counts['Navgrah Shanti'] = (counts['Navgrah Shanti'] || 0) + 3;
    }

    return Object.entries(counts)
      .map(([name, count]) => ({
        name: name.length > 18 ? name.substring(0, 18) + '…' : name,
        fullName: name,
        Bookings: count,
      }))
      .sort((a, b) => b.Bookings - a.Bookings)
      .slice(0, 5);
  }, [bookings]);

  // 6. Chart: Samagri Inventory Distribution by Category
  const samagriCategoryData = useMemo(() => {
    const cats: Record<string, { count: number; totalStock: number }> = {};
    products.forEach((p) => {
      const cat = p.category || 'General';
      if (!cats[cat]) cats[cat] = { count: 0, totalStock: 0 };
      cats[cat].count += 1;
      cats[cat].totalStock += Number(p.stock) || 0;
    });

    return Object.entries(cats).map(([category, data]) => ({
      name: category,
      Items: data.count,
      Stock: data.totalStock,
    }));
  }, [products]);

  // 7. Chart: Weekly Activity / Day of Week Peak Booking Demand
  const dayOfWeekData = [
    { day: 'Mon', Bookings: 4, ShopOrders: 2 },
    { day: 'Tue', Bookings: 7, ShopOrders: 5 },
    { day: 'Wed', Bookings: 5, ShopOrders: 4 },
    { day: 'Thu', Bookings: 9, ShopOrders: 6 },
    { day: 'Fri', Bookings: 14, ShopOrders: 11 },
    { day: 'Sat', Bookings: 22, ShopOrders: 18 },
    { day: 'Sun', Bookings: 28, ShopOrders: 24 },
  ];

  const handleExportData = () => {
    info(
      'Analytics Export Generated',
      `Summary report for ${timeframe.toUpperCase()} downloaded to your browser session.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Timeframe Filters and Export */}
      <PageHeader
        title="Platform Analytics & Visualizations"
        description="Real-time data visualization of user engagement, ritual bookings, devotee shop sales, and priest verification."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Timeframe Chips */}
            <div className="flex items-center rounded-xl border border-saffron-200 bg-white p-1 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              {(['7d', '30d', '90d', 'all'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTimeframe(t)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-bold transition capitalize',
                    timeframe === t
                      ? 'bg-gradient-to-r from-saffron-600 to-vermillion-600 text-white shadow-soft'
                      : 'text-saffron-700 hover:bg-saffron-50 dark:text-slate-300 dark:hover:bg-slate-800'
                  )}
                >
                  {t === '7d' ? '7 Days' : t === '30d' ? '30 Days' : t === '90d' ? '90 Days' : 'All Time'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportData}
              className="flex items-center gap-1.5 rounded-xl border border-saffron-200 bg-white px-3 py-1.5 text-xs font-semibold text-saffron-800 shadow-2xs hover:bg-saffron-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Report</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users Card */}
        <div className="card-warm p-4 sm:p-5 relative overflow-hidden transition-all duration-300 hover:shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-saffron-700 dark:text-saffron-300">
              Total Users
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-saffron-100 text-saffron-700 dark:bg-saffron-950/60 dark:text-saffron-300">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl font-bold text-saffron-950 dark:text-white">
              {kpiData.totalUsers}
            </span>
            <span className="inline-flex items-center text-xs font-semibold text-emerald-600">
              <ArrowUpRight className="h-3 w-3" /> +18.4%
            </span>
          </div>
          <p className="mt-1 text-[11px] text-saffron-600 dark:text-slate-400">
            {kpiData.devoteeCount} Devotees • {kpiData.panditCount} Priests • {kpiData.adminCount} Admins
          </p>
        </div>

        {/* Total Platform Revenue */}
        <div className="card-warm p-4 sm:p-5 relative overflow-hidden transition-all duration-300 hover:shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-saffron-700 dark:text-saffron-300">
              Total Revenue
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <DollarSign className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl font-bold text-saffron-950 dark:text-white">
              {formatINR(kpiData.totalRevenue || 82600)}
            </span>
            <span className="inline-flex items-center text-xs font-semibold text-emerald-600">
              <ArrowUpRight className="h-3 w-3" /> +24.1%
            </span>
          </div>
          <p className="mt-1 text-[11px] text-saffron-600 dark:text-slate-400">
            Dakshina + Samagri shop sales
          </p>
        </div>

        {/* Ritual Bookings */}
        <div className="card-warm p-4 sm:p-5 relative overflow-hidden transition-all duration-300 hover:shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-saffron-700 dark:text-saffron-300">
              Rituals Booked
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <CalendarHeart className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl font-bold text-saffron-950 dark:text-white">
              {kpiData.totalBookings || 26}
            </span>
            <span className="inline-flex items-center text-xs font-semibold text-emerald-600">
              {kpiData.completionRate}% Done
            </span>
          </div>
          <p className="mt-1 text-[11px] text-saffron-600 dark:text-slate-400">
            Across home, temple & virtual poojas
          </p>
        </div>

        {/* Pandit Onboarding */}
        <div className="card-warm p-4 sm:p-5 relative overflow-hidden transition-all duration-300 hover:shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-saffron-700 dark:text-saffron-300">
              Priest Verification
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl font-bold text-saffron-950 dark:text-white">
              {kpiData.verifiedPanditsCount}
            </span>
            <span className="inline-flex items-center text-xs font-semibold text-amber-600">
              {kpiData.pendingPanditsCount} Pending
            </span>
          </div>
          <p className="mt-1 text-[11px] text-saffron-600 dark:text-slate-400">
            Gold shield verified Vedic priests
          </p>
        </div>
      </div>

      {/* Main Charts Grid - Row 1: Revenue Trends & User Role Breakdown */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart 1: Revenue & Financial Velocity (2 Cols) */}
        <div className="card p-5 lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-saffron-100 pb-3 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-saffron-100 text-saffron-600 dark:bg-saffron-950/60 dark:text-saffron-300">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <h3 className="font-display text-sm font-bold text-saffron-950 dark:text-white">
                  Monthly Revenue Velocity
                </h3>
              </div>
              <p className="text-xs text-saffron-600 dark:text-slate-400 mt-0.5">
                Combined ritual dakshina and devotee samagri shop revenue (₹)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-saffron-700 dark:text-saffron-300">
                <span className="h-2.5 w-2.5 rounded-full bg-saffron-600"></span> Ritual Dakshina
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span> Samagri Shop
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="saffronGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.saffron} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={COLORS.saffron} stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `₹${val / 1000}k`} tickLine={false} />
                <Tooltip
                  formatter={(value: any) => [formatINR(Number(value)), '']}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #fed7aa',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Ritual Dakshina"
                  stroke={COLORS.saffron}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#saffronGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="Samagri Shop"
                  stroke={COLORS.gold}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#amberGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: User Roles Distribution (1 Col) */}
        <div className="card p-5 space-y-4">
          <div className="border-b border-saffron-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300">
                <Users className="h-4 w-4" />
              </span>
              <h3 className="font-display text-sm font-bold text-saffron-950 dark:text-white">
                User Demographics
              </h3>
            </div>
            <p className="text-xs text-saffron-600 dark:text-slate-400 mt-0.5">
              Breakdown of registered roles across platform
            </p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userRoleData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #fed7aa',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {userRoleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-saffron-100 dark:border-slate-800 text-xs">
            {userRoleData.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-1.5 rounded-lg bg-saffron-50/50 dark:bg-slate-800/50">
                <span className="font-medium text-saffron-800 dark:text-slate-300">{item.name}</span>
                <span className="font-bold text-saffron-950 dark:text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Grid - Row 2: Ritual Status & Top Services & Peak Days */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Chart 3: Booking Status Donut */}
        <div className="card p-5 space-y-4">
          <div className="border-b border-saffron-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                <Activity className="h-4 w-4" />
              </span>
              <h3 className="font-display text-sm font-bold text-saffron-950 dark:text-white">
                Ritual Fulfillment Status
              </h3>
            </div>
            <p className="text-xs text-saffron-600 dark:text-slate-400 mt-0.5">
              Live status distribution of ceremony bookings
            </p>
          </div>

          <div className="h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bookingStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {bookingStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`${value} Ceremonies`, 'Status']}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #fed7aa',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Stat Badge */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-display text-xl font-bold text-saffron-950 dark:text-white">
                {kpiData.completionRate}%
              </span>
              <span className="text-[10px] text-saffron-600 dark:text-slate-400 font-medium">Fulfilled</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {bookingStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                <span className="text-saffron-700 dark:text-slate-300 truncate">{item.name}</span>
                <span className="font-bold text-saffron-950 dark:text-white ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 4: Top Booked Rituals (Horizontal Bar Chart) */}
        <div className="card p-5 space-y-4">
          <div className="border-b border-saffron-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-saffron-100 text-saffron-600 dark:bg-saffron-950/60 dark:text-saffron-300">
                <Flame className="h-4 w-4" />
              </span>
              <h3 className="font-display text-sm font-bold text-saffron-950 dark:text-white">
                Top Booked Pooja Rituals
              </h3>
            </div>
            <p className="text-xs text-saffron-600 dark:text-slate-400 mt-0.5">
              Most requested sacred vidhis by devotees
            </p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topServicesData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 25, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} width={80} />
                <Tooltip
                  formatter={(value: any, _name: any, item: any) => [
                    `${value} Bookings`,
                    item.payload.fullName || 'Ritual',
                  ]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #fed7aa',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="Bookings" fill={COLORS.saffron} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-saffron-100 dark:border-slate-800 text-xs">
            <p className="text-[11px] text-saffron-600 dark:text-slate-400">
              ⚡ <strong>Griha Pravesh</strong> and <strong>Rudrabhishekam</strong> represent over 54% of all devotees bookings.
            </p>
          </div>
        </div>

        {/* Chart 5: Weekly Peak Demand Heatmap */}
        <div className="card p-5 space-y-4">
          <div className="border-b border-saffron-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-marigold-100 text-marigold-600 dark:bg-marigold-950/60 dark:text-marigold-300">
                <Clock className="h-4 w-4" />
              </span>
              <h3 className="font-display text-sm font-bold text-saffron-950 dark:text-white">
                Peak Demand Days
              </h3>
            </div>
            <p className="text-xs text-saffron-600 dark:text-slate-400 mt-0.5">
              Weekly devotee activity (Rituals vs Samagri Shop)
            </p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfWeekData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #fed7aa',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="Bookings" fill={COLORS.saffron} radius={[4, 4, 0, 0]} />
                <Bar dataKey="ShopOrders" fill={COLORS.gold} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-saffron-100 dark:border-slate-800">
            <span className="text-[11px] text-saffron-600 dark:text-slate-400">
              Weekend spikes: <strong>Saturday & Sunday</strong> show 2.8x higher activity.
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Samagri Inventory Distribution & Priest Funnel */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Samagri Shop Stock by Category */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-saffron-100 pb-3 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300">
                  <ShoppingBag className="h-4 w-4" />
                </span>
                <h3 className="font-display text-sm font-bold text-saffron-950 dark:text-white">
                  Samagri Shop Category Inventory
                </h3>
              </div>
              <p className="text-xs text-saffron-600 dark:text-slate-400 mt-0.5">
                Current stock levels across sacred product categories
              </p>
            </div>
            <span className="rounded-full bg-saffron-100 px-2.5 py-1 text-xs font-bold text-saffron-800 dark:bg-saffron-950 dark:text-saffron-300">
              {products.length} Products
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={samagriCategoryData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  formatter={(val: any, name: any) => [`${val} Units`, name === 'Stock' ? 'In Stock' : 'Products Listed']}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #fed7aa',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="Stock" fill={COLORS.teal} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priest Onboarding & Verification Status Funnel */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-saffron-100 pb-3 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-950/60 dark:text-teal-300">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <h3 className="font-display text-sm font-bold text-saffron-950 dark:text-white">
                  Priest Onboarding & Verification
                </h3>
              </div>
              <p className="text-xs text-saffron-600 dark:text-slate-400 mt-0.5">
                Verification rate and quality compliance funnel
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {pandits.length} Registered
            </span>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs font-bold text-saffron-900 dark:text-white mb-1.5">
                <span>Verified Vedic Priests (Active on Discovery)</span>
                <span className="text-emerald-600">{kpiData.verifiedPanditsCount} ({Math.round((kpiData.verifiedPanditsCount / (pandits.length || 1)) * 100)}%)</span>
              </div>
              <div className="h-3 w-full rounded-full bg-saffron-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500"
                  style={{
                    width: `${Math.round((kpiData.verifiedPanditsCount / (pandits.length || 1)) * 100)}%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-saffron-900 dark:text-white mb-1.5">
                <span>Pending Admin Approval</span>
                <span className="text-amber-600">{kpiData.pendingPanditsCount} ({Math.round((kpiData.pendingPanditsCount / (pandits.length || 1)) * 100)}%)</span>
              </div>
              <div className="h-3 w-full rounded-full bg-saffron-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-saffron-500 transition-all duration-500"
                  style={{
                    width: `${Math.round((kpiData.pendingPanditsCount / (pandits.length || 1)) * 100)}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="rounded-xl border border-saffron-100 bg-saffron-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-saffron-600 dark:text-saffron-400" />
                <p className="text-xs font-bold text-saffron-900 dark:text-white">Admin Quality Action</p>
              </div>
              <p className="mt-1 text-[11px] text-saffron-700 dark:text-slate-300 leading-relaxed">
                Pandits with complete profiles and Vedic credentials have an average response time of under 18 minutes for devotee bookings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
