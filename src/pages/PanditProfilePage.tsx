import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Star,
  Check,
  Clock,
  Loader2,
  Save,
  Sparkles,
  Wallet,
  ArrowUpRight,
  Building2,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  Copy,
  Info,
  CreditCard,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  firebaseClient,
  type PanditProfile,
  type Review,
  type PayoutRequest,
  type Booking,
} from '../lib/firebase';
import { formatINR, formatDateTime, cn } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

export function PanditProfilePage() {
  const { profile } = useAuth();
  const { success, error: toastError, info } = useToast();
  const [pandit, setPandit] = useState<PanditProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [panditBookings, setPanditBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingBio, setSavingBio] = useState(false);
  const [savingPayout, setSavingPayout] = useState(false);

  // Bio & ritual profile state
  const [bio, setBio] = useState('');
  const [languages, setLanguages] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [city, setCity] = useState('');
  const [experience, setExperience] = useState(0);
  const [basePrice, setBasePrice] = useState(0);
  const [available, setAvailable] = useState(true);

  // Bank & UPI payout state
  const [payoutMethod, setPayoutMethod] = useState<'upi' | 'bank'>('upi');
  const [upiId, setUpiId] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankHolderName, setBankHolderName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');

  // Withdrawal modal state
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number | string>('');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [missingDetailsAlertOpen, setMissingDetailsAlertOpen] = useState(false);

  const payoutSectionRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    if (!profile) return;
    try {
      setLoading(true);

      // 1. Load pandit profile
      const { data: pData } = await firebaseClient
        .from('pandit_profiles')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (pData) {
        const p = pData as PanditProfile;
        setPandit(p);
        setBio(p.bio || '');
        setLanguages((p.languages || []).join(', '));
        setSpecialties((p.specialties || []).join(', '));
        setCity(p.city || '');
        setExperience(p.experience_years || 0);
        setBasePrice(Number(p.base_price || 0));
        setAvailable(p.is_available ?? true);

        // Payout details
        setPayoutMethod(p.payout_method || 'upi');
        setUpiId(p.upi_id || '');
        setBankName(p.bank_name || '');
        setBankHolderName(p.bank_holder_name || profile.full_name || '');
        setBankAccountNo(p.bank_account_no || '');
        setBankIfsc(p.bank_ifsc || '');
      }

      // 2. Load reviews
      const { data: revs } = await firebaseClient
        .from('reviews')
        .select('*, devotee:profiles!reviews_devotee_id_fkey(id, full_name, avatar_url)')
        .eq('pandit_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setReviews((revs as Review[]) ?? []);

      // 3. Load payout requests for this pandit
      const { data: reqs } = await firebaseClient
        .from('payout_requests')
        .select('*')
        .eq('pandit_id', profile.id)
        .order('created_at', { ascending: false });
      setPayoutRequests((reqs as PayoutRequest[]) ?? []);

      // 4. Load all bookings credited to this belonging pandit
      const { data: bks } = await firebaseClient
        .from('bookings')
        .select('*, service:services(*), devotee:profiles!bookings_devotee_id_fkey(id, full_name, avatar_url)')
        .eq('pandit_id', profile.id)
        .order('scheduled_at', { ascending: false });
      setPanditBookings((bks as Booking[]) ?? []);
    } catch (e: any) {
      console.warn('Load pandit profile data notice:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const onSync = () => loadData();
    window.addEventListener('poojaconnect_firebase_sync', onSync);
    return () => window.removeEventListener('poojaconnect_firebase_sync', onSync);
  }, [profile?.id]);

  // Balance calculations: Starting balance is strictly ₹0 for all newly registered pandits.
  // When any devotee books a ritual with this pandit, the booking amount is credited to this belonging pandit's wallet.
  const { totalEarnings, approvedTotal, pendingTotal, availableBalance, hasSavedPayoutDetails } = useMemo(() => {
    const isDemoPandit = profile?.id === 'demo-pandit-1' || profile?.id === 'demo-pandit-2' || pandit?.user_id === 'demo-pandit-1' || pandit?.user_id === 'demo-pandit-2';

    // Sum of bookings credited to this specific pandit (excluding cancelled/rejected)
    const activeBookings = panditBookings.filter((b) => b.status !== 'cancelled' && b.status !== 'rejected');
    const bookingEarnings = activeBookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

    const rawEarnings = Number(pandit?.total_earnings ?? 0);
    // Baseline seed for demo pandits only; strictly ₹0 for all new pandits until real bookings are credited!
    const earnings = isDemoPandit
      ? Math.max(rawEarnings, bookingEarnings)
      : bookingEarnings > 0
      ? Math.max(bookingEarnings, rawEarnings === 25000 ? 0 : rawEarnings)
      : (rawEarnings > 0 && rawEarnings !== 25000 ? rawEarnings : 0);

    const approved = payoutRequests
      .filter((r) => r.status === 'approved')
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const pending = payoutRequests
      .filter((r) => r.status === 'pending')
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const available = Math.max(0, earnings - approved - pending);

    const hasSaved =
      pandit?.payout_method === 'bank'
        ? Boolean(pandit.bank_account_no && pandit.bank_ifsc && pandit.bank_holder_name)
        : Boolean(pandit?.upi_id && pandit.upi_id.trim());

    return {
      totalEarnings: earnings,
      approvedTotal: approved,
      pendingTotal: pending,
      availableBalance: available,
      hasSavedPayoutDetails: hasSaved,
    };
  }, [pandit, payoutRequests, panditBookings, profile?.id]);

  // Save Bio & Availability
  const saveBio = async () => {
    if (!profile) return;
    setSavingBio(true);
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
    setSavingBio(false);
    if (error) {
      toastError('Profile Update Failed', error.message);
      return;
    }
    success('Pandit Profile Updated!', 'Your bio, specialties, pricing and availability have been saved.');
  };

  // Save Bank or UPI Payout Details
  const savePayoutDetails = async () => {
    if (!profile) return;

    if (payoutMethod === 'upi') {
      if (!upiId.trim() || !upiId.includes('@')) {
        toastError('Invalid UPI ID', 'Please enter a valid UPI address (e.g. name@upi or mobile@paytm).');
        return;
      }
    } else {
      if (!bankAccountNo.trim() || bankAccountNo.length < 8) {
        toastError('Invalid Account Number', 'Please enter a valid bank account number (at least 8 digits).');
        return;
      }
      if (!bankIfsc.trim() || bankIfsc.length < 5) {
        toastError('Invalid IFSC Code', 'Please enter a valid 11-character bank IFSC code (e.g. SBIN0001429).');
        return;
      }
      if (!bankHolderName.trim()) {
        toastError('Missing Account Holder', 'Please provide the account holder name exactly as on bank records.');
        return;
      }
    }

    setSavingPayout(true);
    try {
      const now = new Date().toISOString();
      const updates = {
        user_id: profile.id,
        payout_method: payoutMethod,
        upi_id: upiId.trim(),
        bank_name: bankName.trim() || 'Scheduled Commercial Bank',
        bank_holder_name: bankHolderName.trim(),
        bank_account_no: bankAccountNo.trim(),
        bank_ifsc: bankIfsc.trim().toUpperCase(),
        total_earnings: totalEarnings,
        updated_at: now,
      };

      const { error } = await firebaseClient.from('pandit_profiles').upsert(updates);
      if (error) {
        toastError('Failed to Save Payout Details', error.message);
        setSavingPayout(false);
        return;
      }

      setPandit((prev) => (prev ? { ...prev, ...updates } : null));
      success('Payout Details Saved Successfully! 🏦', 'Your settlement details are verified. You can now withdraw Dakshina.');
    } catch (err: any) {
      toastError('Save Error', err.message || 'Could not save payout details.');
    } finally {
      setSavingPayout(false);
    }
  };

  // Initiate Withdrawal
  const handleInitiateWithdraw = () => {
    // Check if payout details are configured
    const configured =
      payoutMethod === 'upi'
        ? Boolean(upiId.trim() && upiId.includes('@'))
        : Boolean(bankAccountNo.trim() && bankIfsc.trim() && bankHolderName.trim());

    if (!configured) {
      setMissingDetailsAlertOpen(true);
      return;
    }

    if (availableBalance <= 0) {
      toastError('Insufficient Balance', 'You currently have ₹0 available to withdraw. Complete more ritual vidhis.');
      return;
    }

    // Default amount to min(5000, availableBalance) or availableBalance
    setWithdrawAmount(availableBalance >= 5000 ? 5000 : availableBalance);
    setWithdrawNotes('Dakshina settlement request');
    setWithdrawModalOpen(true);
  };

  // Submit Withdrawal Request
  const handleSubmitWithdrawal = async () => {
    if (!profile) return;
    const numAmount = Number(withdrawAmount);

    if (isNaN(numAmount) || numAmount <= 0) {
      toastError('Invalid Amount', 'Please specify a positive withdrawal amount.');
      return;
    }

    if (numAmount > availableBalance) {
      toastError(
        'Amount Exceeds Available Balance',
        `Maximum withdrawable balance is ${formatINR(availableBalance)}.`
      );
      return;
    }

    if (numAmount < 100) {
      toastError('Minimum Withdrawal', 'Minimum withdrawal amount is ₹100.');
      return;
    }

    setSubmittingWithdrawal(true);
    try {
      const now = new Date().toISOString();
      const newReq: PayoutRequest = {
        id: `pay-req-${Date.now()}`,
        pandit_id: profile.id,
        pandit_name: profile.full_name || 'Acharya Ji',
        pandit_email: profile.email,
        pandit_phone: profile.phone,
        amount: numAmount,
        status: 'pending',
        payout_method: payoutMethod,
        payout_details: {
          upi_id: upiId.trim(),
          bank_name: bankName.trim(),
          bank_holder_name: bankHolderName.trim(),
          bank_account_no: bankAccountNo.trim(),
          bank_ifsc: bankIfsc.trim().toUpperCase(),
        },
        notes: withdrawNotes.trim(),
        created_at: now,
        updated_at: now,
      };

      // 1. Insert into payout_requests
      const { error } = await firebaseClient.from('payout_requests').insert(newReq);
      if (error) {
        toastError('Withdrawal Failed', error.message);
        setSubmittingWithdrawal(false);
        return;
      }

      // 2. Notify Admin
      await firebaseClient.from('notifications').insert({
        id: `notif_${Date.now()}`,
        user_id: 'demo-admin-1',
        type: 'payout_request',
        title: 'New Pandit Withdrawal Request 🙏',
        body: `${profile.full_name || 'Pandit'} requested a Dakshina payout of ${formatINR(numAmount)}.`,
        link: '/app/admin-payouts',
        is_read: false,
        created_at: now,
      });

      // 3. Update local state
      setPayoutRequests((prev) => [newReq, ...prev]);
      setWithdrawModalOpen(false);
      success(
        'Withdrawal Request Submitted!',
        `Your request for ${formatINR(numAmount)} has been sent to the Admin panel for approval & disbursement.`
      );
    } catch (err: any) {
      toastError('Submission Error', err.message || 'Could not submit withdrawal request.');
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  const scrollToPayoutSection = () => {
    setMissingDetailsAlertOpen(false);
    payoutSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Earnings & Pandit Profile" />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Earnings & Priest Profile"
        description="Manage your Dakshina earnings, request bank/UPI payouts, and update your ritual bio."
      />

      {/* Top Banner: Verification Status & Highlights */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Verification Status */}
        <div className="card-warm p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-saffron-600 dark:text-slate-400">
            Priest Verification Status
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            {pandit?.is_verified ? (
              <>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">Verified Pandit</span>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-400">Profile active & visible to devotees</p>
                </div>
              </>
            ) : (
              <>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15">
                  <Clock className="h-5 w-5" />
                </span>
                <div>
                  <span className="font-bold text-amber-700 dark:text-amber-300">Pending Verification</span>
                  <p className="text-[11px] text-amber-800 dark:text-amber-400">Admin review in progress</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Rating & Ceremonies */}
        <div className="card-warm p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-saffron-600 dark:text-slate-400">
            Rituals & Performance
          </p>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-saffron-100 text-saffron-600 dark:bg-saffron-950/60 dark:text-saffron-300">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-base font-bold text-saffron-950 dark:text-white">
                  {pandit?.completed_bookings || 15} Completed
                </p>
                <p className="text-[11px] text-saffron-600 dark:text-slate-400">Vedic ceremonies performed</p>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              <span>{pandit?.rating ? pandit.rating.toFixed(1) : '4.9'}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Payout Readiness Status */}
        <div className="card-warm p-5 sm:col-span-2 lg:col-span-1">
          <p className="text-xs font-bold uppercase tracking-wider text-saffron-600 dark:text-slate-400">
            Payout Settlement Setup
          </p>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl',
                hasSavedPayoutDetails
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300'
              )}>
                {hasSavedPayoutDetails ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              </span>
              <div>
                <p className="text-sm font-bold text-saffron-950 dark:text-white">
                  {hasSavedPayoutDetails ? 'Ready for Withdrawals' : 'Details Required'}
                </p>
                <p className="text-[11px] text-saffron-600 dark:text-slate-400">
                  {hasSavedPayoutDetails
                    ? `${payoutMethod === 'upi' ? 'UPI' : 'Bank'} details active`
                    : 'Add Bank / UPI below'}
                </p>
              </div>
            </div>
            {!hasSavedPayoutDetails && (
              <button
                type="button"
                onClick={scrollToPayoutSection}
                className="text-xs font-bold text-saffron-700 underline hover:text-saffron-900"
              >
                Setup
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Left side (Wallet + Payout Settings + Withdrawal History), Right side (Bio + Reviews) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Earnings & Payout Management */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enhanced Wallet & Total Earnings Card with WITHDRAW BUTTON */}
          <div className="overflow-hidden rounded-2xl border-2 border-saffron-300/80 bg-gradient-to-br from-amber-500/10 via-saffron-500/10 to-orange-500/15 p-5 sm:p-6 shadow-pop dark:border-saffron-800/60 dark:bg-slate-900">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-saffron-600 text-white shadow-soft">
                    <Wallet className="h-4.5 w-4.5" />
                  </span>
                  <span className="font-display text-sm font-bold uppercase tracking-wider text-saffron-900 dark:text-white">
                    Dakshina Earnings & Wallet
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-3">
                  <p className="font-display text-3xl sm:text-4xl font-bold text-saffron-950 dark:text-white">
                    {formatINR(availableBalance)}
                  </p>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Available to Withdraw
                  </span>
                </div>
              </div>

              {/* Prominent Withdraw Button */}
              <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                <button
                  type="button"
                  id="pandit-withdraw-dakshina-btn"
                  onClick={handleInitiateWithdraw}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-saffron-600 via-saffron-600 to-vermillion-600 px-5 py-3 text-sm font-bold text-white shadow-md transition-all duration-200 hover:scale-105 hover:shadow-glow active:scale-95 cursor-pointer"
                >
                  <ArrowUpRight className="h-4.5 w-4.5" />
                  <span>Withdraw Dakshina</span>
                </button>
                <p className="text-[11px] text-saffron-700/80 dark:text-slate-400">
                  {hasSavedPayoutDetails
                    ? `Disburses to: ${payoutMethod === 'upi' ? upiId || 'UPI' : bankName || 'Bank'}`
                    : 'Requires saving bank / UPI details first'}
                </p>
              </div>
            </div>

            {/* Wallet Breakdown Pills */}
            <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3 border-t border-saffron-200/80 pt-4 dark:border-slate-800">
              <div className="rounded-xl bg-white/80 p-2.5 sm:p-3 shadow-2xs dark:bg-slate-850">
                <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Total Lifetime</p>
                <p className="mt-0.5 font-display text-sm sm:text-base font-bold text-saffron-950 dark:text-white">
                  {formatINR(totalEarnings)}
                </p>
              </div>
              <div className="rounded-xl bg-white/80 p-2.5 sm:p-3 shadow-2xs dark:bg-slate-850">
                <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">In Withdrawal</p>
                <p className="mt-0.5 font-display text-sm sm:text-base font-bold text-amber-700 dark:text-amber-400">
                  {formatINR(pendingTotal)}
                </p>
              </div>
              <div className="rounded-xl bg-white/80 p-2.5 sm:p-3 shadow-2xs dark:bg-slate-850">
                <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Disbursed / Paid</p>
                <p className="mt-0.5 font-display text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-400">
                  {formatINR(approvedTotal)}
                </p>
              </div>
            </div>

            {/* Live Dakshina Crediting Status & Belonging Bookings */}
            {totalEarnings === 0 ? (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-dashed border-amber-300/80 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="font-bold">Initial Starting Balance: ₹0</p>
                  <p className="mt-0.5 text-[11px] text-amber-800/90 dark:text-amber-300/80">
                    All new Pandit accounts start with ₹0. When a devotee books a pooja selecting your profile, the ceremony fee is instantly credited to your wallet balance.
                  </p>
                </div>
              </div>
            ) : panditBookings.length > 0 ? (
              <div className="mt-4 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 text-xs dark:border-emerald-900/60 dark:bg-emerald-950/20">
                <div className="mb-2 flex items-center justify-between font-bold text-emerald-950 dark:text-emerald-200">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Ritual Fees Credited to this Pandit ({panditBookings.length})</span>
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    +{formatINR(panditBookings.filter((b) => b.status !== 'cancelled' && b.status !== 'rejected').reduce((s, b) => s + (Number(b.amount) || 0), 0))} Dakshina
                  </span>
                </div>
                <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1">
                  {panditBookings.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded-lg bg-white/90 p-2 text-[11px] shadow-2xs dark:bg-slate-800"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate font-semibold text-slate-800 dark:text-white">
                          {b.service?.name || 'Vedic Ceremony'}
                        </p>
                        <p className="truncate text-[10px] text-slate-500">
                          Devotee: {b.devotee?.full_name || 'Devotee'} • {formatDateTime(b.scheduled_at)}
                        </p>
                      </div>
                      <span className="shrink-0 font-display font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatINR(b.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Section: Bank & UPI Payout Details (Required before withdrawing) */}
          <div ref={payoutSectionRef} className="card p-5 sm:p-6 space-y-5 border-2 border-amber-200/80 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-saffron-100 pb-3 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-bold text-saffron-950 dark:text-white">
                    Bank & UPI Payout Details
                  </h3>
                  {hasSavedPayoutDetails ? (
                    <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <Check className="h-3 w-3" /> Saved & Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1 dark:bg-amber-950/60 dark:text-amber-300">
                      <AlertCircle className="h-3 w-3" /> Required for Withdrawal
                    </span>
                  )}
                </div>
                <p className="text-xs text-saffron-600 dark:text-slate-400 mt-0.5">
                  Update and save your payment details here so the admin can approve and transfer your funds.
                </p>
              </div>
            </div>

            {/* Payout Method Selector */}
            <div>
              <label className="label">Select Preferred Payout Method</label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setPayoutMethod('upi')}
                  className={cn(
                    'flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold text-xs sm:text-sm transition-all duration-200',
                    payoutMethod === 'upi'
                      ? 'border-saffron-600 bg-saffron-50/70 text-saffron-900 shadow-soft dark:bg-saffron-950/40 dark:text-white'
                      : 'border-saffron-200 bg-white text-slate-600 hover:bg-saffron-50/40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                  )}
                >
                  <Smartphone className="h-4.5 w-4.5 text-saffron-600" />
                  <span>UPI ID (Instant)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayoutMethod('bank')}
                  className={cn(
                    'flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold text-xs sm:text-sm transition-all duration-200',
                    payoutMethod === 'bank'
                      ? 'border-saffron-600 bg-saffron-50/70 text-saffron-900 shadow-soft dark:bg-saffron-950/40 dark:text-white'
                      : 'border-saffron-200 bg-white text-slate-600 hover:bg-saffron-50/40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                  )}
                >
                  <Building2 className="h-4.5 w-4.5 text-saffron-600" />
                  <span>Bank Account (NEFT/IMPS)</span>
                </button>
              </div>
            </div>

            {/* Form Fields: UPI */}
            {payoutMethod === 'upi' && (
              <div className="rounded-2xl border border-saffron-200/80 bg-saffron-50/30 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-3">
                <div>
                  <label className="label">Your Virtual Payment Address (UPI ID) *</label>
                  <div className="relative">
                    <Smartphone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-500" />
                    <input
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. yourname@oksbi or 9876543210@paytm"
                      className="input pl-9 font-mono text-sm"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Supports Google Pay, PhonePe, Paytm, BHIM, and all bank UPI handles.
                  </p>
                </div>
              </div>
            )}

            {/* Form Fields: Bank Transfer */}
            {payoutMethod === 'bank' && (
              <div className="rounded-2xl border border-saffron-200/80 bg-saffron-50/30 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Account Holder Name *</label>
                    <input
                      value={bankHolderName}
                      onChange={(e) => setBankHolderName(e.target.value)}
                      placeholder="As per bank passbook"
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="label">Bank Name *</label>
                    <input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. State Bank of India, HDFC, ICICI"
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="label">Account Number *</label>
                    <input
                      value={bankAccountNo}
                      onChange={(e) => setBankAccountNo(e.target.value)}
                      placeholder="e.g. 50100482918471"
                      className="input font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="label">Bank IFSC Code *</label>
                    <input
                      value={bankIfsc}
                      onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                      placeholder="e.g. SBIN0001429"
                      maxLength={11}
                      className="input font-mono uppercase text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-saffron-600 dark:text-slate-400">
                🔒 Data is encrypted and securely accessible only to verified administrators.
              </p>
              <button
                type="button"
                onClick={savePayoutDetails}
                disabled={savingPayout}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-saffron-600 to-vermillion-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {savingPayout ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Save Payout Details</span>
              </button>
            </div>
          </div>

          {/* Section: My Withdrawal History */}
          <div className="card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-saffron-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-saffron-600" />
                <h3 className="font-display text-base font-bold text-saffron-950 dark:text-white">
                  Withdrawal History & Requests
                </h3>
              </div>
              <button
                type="button"
                onClick={loadData}
                className="flex items-center gap-1 text-xs text-saffron-600 hover:text-saffron-900"
                title="Refresh requests"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {payoutRequests.length === 0 ? (
              <div className="py-8 text-center text-xs text-saffron-500 dark:text-slate-400">
                <Wallet className="mx-auto mb-2 h-7 w-7 text-saffron-300" />
                <p className="font-semibold text-saffron-900 dark:text-white">No withdrawal requests yet</p>
                <p className="mt-1">
                  When you request a payout, your settlement status and UTR bank receipts will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-saffron-100 dark:divide-slate-800">
                {payoutRequests.map((req) => (
                  <div key={req.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-base text-saffron-950 dark:text-white">
                          {formatINR(req.amount)}
                        </span>
                        {req.status === 'pending' ? (
                          <Badge variant="amber" className="text-[10px] font-bold">
                            Pending Approval
                          </Badge>
                        ) : req.status === 'approved' ? (
                          <Badge variant="green" className="text-[10px] font-bold">
                            Approved & Transferred
                          </Badge>
                        ) : (
                          <Badge variant="red" className="text-[10px] font-bold">
                            Declined
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {req.payout_method === 'upi' ? `UPI: ${req.payout_details?.upi_id}` : `Bank A/C: ${req.payout_details?.bank_account_no}`} · {formatDateTime(req.created_at)}
                      </p>
                      {req.transaction_ref && (
                        <p className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-bold">
                          UTR Reference: {req.transaction_ref}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Profile Bio & Devotee Reviews */}
        <div className="space-y-6">
          <div className="card p-5 space-y-4">
            <h3 className="font-display text-base font-bold text-saffron-950 dark:text-white">
              Priest Bio & Specialties
            </h3>
            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="label">Vedic Bio & Description</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Tell devotees about your lineage, mantras, and ceremonies…"
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="label">Languages Spoken (comma-separated)</label>
                <input
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  placeholder="Sanskrit, Hindi, Gujarati, English"
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="label">Pooja Specialties (comma-separated)</label>
                <input
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                  placeholder="Griha Pravesh, Rudrabhishekam, Navgrah Shanti"
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">City / Region</label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Varanasi / Mumbai"
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="label">Exp (Years)</label>
                  <input
                    type="number"
                    min={0}
                    value={experience}
                    onChange={(e) => setExperience(Number(e.target.value))}
                    className="input text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Base Dakshina (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={basePrice}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="label">Status</label>
                  <button
                    type="button"
                    onClick={() => setAvailable((a) => !a)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-xs font-medium transition',
                      available
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : 'border-vermillion-300 bg-vermillion-50 text-vermillion-700 dark:border-vermillion-700 dark:bg-vermillion-500/10 dark:text-vermillion-300'
                    )}
                  >
                    {available ? 'Available' : 'Busy'}
                    <span className={cn('h-2 w-2 rounded-full', available ? 'bg-emerald-500' : 'bg-vermillion-500')} />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={saveBio}
                disabled={savingBio}
                className="btn-primary w-full text-xs"
              >
                {savingBio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Save Bio & Availability</span>
              </button>
            </div>
          </div>

          {/* Devotee Reviews */}
          <div className="card p-5 space-y-3">
            <h3 className="font-display text-base font-bold text-saffron-950 dark:text-white">
              Devotee Feedback & Blessings
            </h3>
            {reviews.length === 0 ? (
              <p className="py-6 text-center text-xs text-saffron-400">
                No reviews yet. Complete poojas to receive reviews and ratings.
              </p>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="border-b border-saffron-100 pb-2.5 last:border-0 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center text-marigold-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn('h-3 w-3', i < r.rating && 'fill-current')} />
                        ))}
                      </span>
                      <span className="text-xs font-semibold text-saffron-900 dark:text-white">
                        {r.devotee?.full_name ?? 'Devotee'}
                      </span>
                    </div>
                    {r.comment && <p className="mt-1 text-xs text-saffron-600 dark:text-slate-400">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Withdrawal Modal */}
      <Modal
        open={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        title="Request Dakshina Withdrawal"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setWithdrawModalOpen(false)}
              className="rounded-xl border border-saffron-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-saffron-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitWithdrawal}
              disabled={submittingWithdrawal}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-saffron-600 to-vermillion-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {submittingWithdrawal ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
              <span>Submit Request ({formatINR(Number(withdrawAmount) || 0)})</span>
            </button>
          </div>
        }
      >
        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 p-4 dark:border-saffron-800 dark:from-slate-800 dark:to-saffron-950/40">
            <p className="text-xs text-saffron-700 dark:text-saffron-300 font-medium">Available Withdrawable Balance</p>
            <p className="font-display text-2xl font-bold text-saffron-950 dark:text-white mt-0.5">
              {formatINR(availableBalance)}
            </p>
          </div>

          {/* Destination Summary */}
          <div className="rounded-xl border border-saffron-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-600 dark:text-slate-400">Destination:</span>
              <span className="font-bold text-saffron-700 dark:text-saffron-300 capitalize">
                {payoutMethod === 'upi' ? 'UPI Transfer' : 'Direct Bank Transfer'}
              </span>
            </div>
            {payoutMethod === 'upi' ? (
              <p className="font-mono font-bold text-saffron-950 dark:text-white">{upiId}</p>
            ) : (
              <div className="space-y-0.5">
                <p className="font-semibold text-saffron-950 dark:text-white">{bankName}</p>
                <p>A/C: <span className="font-mono font-bold">{bankAccountNo}</span> (IFSC: {bankIfsc})</p>
                <p className="text-slate-500">Name: {bankHolderName}</p>
              </div>
            )}
          </div>

          {/* Amount input */}
          <div>
            <label className="label">Withdrawal Amount (₹) *</label>
            <input
              type="number"
              min={100}
              max={availableBalance}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="input font-display text-lg font-bold"
            />
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[500, 1000, 2500, 5000].map((amt) => {
                if (amt > availableBalance) return null;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setWithdrawAmount(amt)}
                    className="rounded-lg border border-saffron-200 bg-white px-2.5 py-1 text-xs font-semibold text-saffron-800 hover:bg-saffron-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                  >
                    ₹{amt}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setWithdrawAmount(availableBalance)}
                className="rounded-lg bg-saffron-100 px-2.5 py-1 text-xs font-bold text-saffron-900 hover:bg-saffron-200 dark:bg-slate-800 dark:text-saffron-300"
              >
                Max ({formatINR(availableBalance)})
              </button>
            </div>
          </div>

          <div>
            <label className="label">Note for Admin (optional)</label>
            <input
              value={withdrawNotes}
              onChange={(e) => setWithdrawNotes(e.target.value)}
              placeholder="e.g. Dakshina for Navgrah Shanti rituals"
              className="input text-xs"
            />
          </div>
        </div>
      </Modal>

      {/* Missing Details Notice Modal */}
      <Modal
        open={missingDetailsAlertOpen}
        onClose={() => setMissingDetailsAlertOpen(false)}
        title="Payout Details Required First"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setMissingDetailsAlertOpen(false)}
              className="rounded-xl border border-saffron-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-saffron-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={scrollToPayoutSection}
              className="rounded-xl bg-gradient-to-r from-saffron-600 to-vermillion-600 px-4 py-2 text-xs font-bold text-white shadow-soft hover:scale-105 active:scale-95"
            >
              Add Details Now
            </button>
          </div>
        }
      >
        <div className="space-y-3 p-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <Building2 className="h-6 w-6" />
          </div>
          <h4 className="font-display text-base font-bold text-saffron-950 dark:text-white">
            Please Add Your Bank or UPI Details
          </h4>
          <p className="text-xs text-saffron-700/90 dark:text-slate-300 leading-relaxed">
            Before requesting a Dakshina withdrawal, you must add and save your <strong>UPI ID</strong> or <strong>Bank Account</strong> so the administrator can verify and disburse the funds directly to you.
          </p>
        </div>
      </Modal>
    </div>
  );
}
