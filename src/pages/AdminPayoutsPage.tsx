import { useEffect, useState, useMemo } from 'react';
import {
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Smartphone,
  Copy,
  Check,
  User,
  Phone,
  Mail,
  Loader2,
  Sparkles,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { firebaseClient, type PayoutRequest, type PayoutStatus } from '../lib/firebase';
import { formatINR, formatDateTime, cn } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

export function AdminPayoutsPage() {
  const { success, error: toastError, info } = useToast();
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Approval modal state
  const [selectedRequest, setSelectedRequest] = useState<PayoutRequest | null>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  // Rejection modal state
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadRequests = async () => {
    try {
      setLoading(true);
      const { data } = await firebaseClient
        .from('payout_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setRequests(data as PayoutRequest[]);
      }
    } catch (e: any) {
      console.warn('Load payout requests error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();

    const onSync = () => loadRequests();
    window.addEventListener('poojaconnect_firebase_sync', onSync);
    return () => window.removeEventListener('poojaconnect_firebase_sync', onSync);
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    info('Copied to Clipboard', text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openApproveModal = (req: PayoutRequest) => {
    setSelectedRequest(req);
    const generatedUtr = `UTR-VEDIC-${Date.now().toString().slice(-6)}`;
    setTransactionRef(generatedUtr);
    setAdminNotes('Dakshina withdrawal disbursed via ' + (req.payout_method === 'upi' ? 'UPI Transfer' : 'NEFT / IMPS'));
    setApprovalModalOpen(true);
  };

  const handleConfirmApproval = async () => {
    if (!selectedRequest) return;
    setProcessingAction(true);

    try {
      const now = new Date().toISOString();
      const updatedRef = transactionRef.trim() || `UTR-VEDIC-${Date.now().toString().slice(-6)}`;

      // 1. Update payout request in database
      const { error } = await firebaseClient
        .from('payout_requests')
        .update({
          status: 'approved',
          approved_at: now,
          transaction_ref: updatedRef,
          admin_notes: adminNotes.trim(),
          updated_at: now,
        })
        .eq('id', selectedRequest.id);

      if (error) {
        toastError('Approval Failed', error.message);
        setProcessingAction(false);
        return;
      }

      // 2. Notify the Pandit
      await firebaseClient.from('notifications').insert({
        id: `notif_${Date.now()}`,
        user_id: selectedRequest.pandit_id,
        type: 'payout_approved',
        title: 'Withdrawal Approved & Paid! 🪔',
        body: `Your Dakshina withdrawal of ${formatINR(selectedRequest.amount)} has been approved. Ref: ${updatedRef}`,
        link: '/app/earnings',
        is_read: false,
        created_at: now,
      });

      success(
        'Payout Approved & Disbursed',
        `₹${selectedRequest.amount} marked as paid to ${selectedRequest.pandit_name}. Reference: ${updatedRef}`
      );

      setApprovalModalOpen(false);
      setSelectedRequest(null);
      await loadRequests();
    } catch (err: any) {
      toastError('Approval Error', err.message || 'Could not approve payout.');
    } finally {
      setProcessingAction(false);
    }
  };

  const openRejectModal = (req: PayoutRequest) => {
    setSelectedRequest(req);
    setRejectionReason('Bank details mismatch / invalid credentials.');
    setRejectionModalOpen(true);
  };

  const handleConfirmRejection = async () => {
    if (!selectedRequest) return;
    setProcessingAction(true);

    try {
      const now = new Date().toISOString();
      const reason = rejectionReason.trim() || 'Could not process payout with provided details.';

      // 1. Update status
      const { error } = await firebaseClient
        .from('payout_requests')
        .update({
          status: 'rejected',
          admin_notes: reason,
          updated_at: now,
        })
        .eq('id', selectedRequest.id);

      if (error) {
        toastError('Rejection Failed', error.message);
        setProcessingAction(false);
        return;
      }

      // 2. Notify the Pandit
      await firebaseClient.from('notifications').insert({
        id: `notif_${Date.now()}`,
        user_id: selectedRequest.pandit_id,
        type: 'payout_rejected',
        title: 'Withdrawal Request Update',
        body: `Your Dakshina withdrawal of ${formatINR(selectedRequest.amount)} was declined: ${reason}`,
        link: '/app/earnings',
        is_read: false,
        created_at: now,
      });

      info('Payout Request Rejected', `Request from ${selectedRequest.pandit_name} has been rejected.`);
      setRejectionModalOpen(false);
      setSelectedRequest(null);
      await loadRequests();
    } catch (err: any) {
      toastError('Error', err.message || 'Could not reject request.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const pendingList = requests.filter((r) => r.status === 'pending');
    const approvedList = requests.filter((r) => r.status === 'approved');
    const rejectedList = requests.filter((r) => r.status === 'rejected');

    const pendingTotal = pendingList.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const approvedTotal = approvedList.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalVolume = requests.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    return {
      pendingCount: pendingList.length,
      pendingTotal,
      approvedCount: approvedList.length,
      approvedTotal,
      rejectedCount: rejectedList.length,
      totalVolume,
      totalCount: requests.length,
    };
  }, [requests]);

  // Filtered requests
  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!query.trim()) return true;

      const q = query.toLowerCase();
      const name = (r.pandit_name || '').toLowerCase();
      const email = (r.pandit_email || '').toLowerCase();
      const upi = (r.payout_details?.upi_id || '').toLowerCase();
      const bank = (r.payout_details?.bank_name || '').toLowerCase();
      const acc = (r.payout_details?.bank_account_no || '').toLowerCase();
      return name.includes(q) || email.includes(q) || upi.includes(q) || bank.includes(q) || acc.includes(q);
    });
  }, [requests, statusFilter, query]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pandit Payment Requests"
        description="Review, verify payout details, and approve Dakshina withdrawal requests submitted by Vedic priests."
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-warm p-4 sm:p-5 relative overflow-hidden transition hover:shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Pending Approval
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl font-bold text-amber-950 dark:text-white">
              {formatINR(metrics.pendingTotal)}
            </span>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
              ({metrics.pendingCount} req)
            </span>
          </div>
          <p className="mt-1 text-xs text-saffron-600 dark:text-slate-400">Awaiting your approval</p>
        </div>

        <div className="card-warm p-4 sm:p-5 relative overflow-hidden transition hover:shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Disbursed & Paid
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl font-bold text-emerald-950 dark:text-white">
              {formatINR(metrics.approvedTotal)}
            </span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              ({metrics.approvedCount} paid)
            </span>
          </div>
          <p className="mt-1 text-xs text-saffron-600 dark:text-slate-400">Successfully completed payouts</p>
        </div>

        <div className="card-warm p-4 sm:p-5 relative overflow-hidden transition hover:shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-saffron-700 dark:text-saffron-400">
              Total Requested
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-saffron-100 text-saffron-700 dark:bg-saffron-950/60 dark:text-saffron-300">
              <Wallet className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl font-bold text-saffron-950 dark:text-white">
              {formatINR(metrics.totalVolume)}
            </span>
          </div>
          <p className="mt-1 text-xs text-saffron-600 dark:text-slate-400">All-time withdrawal requests</p>
        </div>

        <div className="card-warm p-4 sm:p-5 relative overflow-hidden transition hover:shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Declined
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              <XCircle className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl font-bold text-rose-950 dark:text-white">
              {metrics.rejectedCount}
            </span>
            <span className="text-xs font-medium text-slate-500">requests</span>
          </div>
          <p className="mt-1 text-xs text-saffron-600 dark:text-slate-400">Rejected or mismatched details</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by priest name, UPI ID, or bank account…"
            className="input pl-9 text-xs sm:text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-saffron-200 bg-white p-1 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-bold transition capitalize flex items-center gap-1.5',
                statusFilter === s
                  ? 'bg-gradient-to-r from-saffron-600 to-vermillion-600 text-white shadow-soft'
                  : 'text-saffron-700 hover:bg-saffron-50 dark:text-slate-300 dark:hover:bg-slate-800'
              )}
            >
              <span>{s === 'all' ? 'All Requests' : s}</span>
              {s === 'pending' && metrics.pendingCount > 0 && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
                  statusFilter === s ? 'bg-white text-saffron-900' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                )}>
                  {metrics.pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-saffron-100 text-saffron-600 dark:bg-slate-800 dark:text-saffron-400">
            <Wallet className="h-7 w-7" />
          </div>
          <h3 className="mt-4 font-display text-base font-bold text-saffron-950 dark:text-white">
            No Payout Requests Found
          </h3>
          <p className="mt-1 text-xs text-saffron-600 dark:text-slate-400 max-w-sm">
            {query || statusFilter !== 'all'
              ? 'No withdrawal requests match your search or filter criteria.'
              : 'Priests will appear here when they request to withdraw their Dakshina earnings.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => {
            const isPending = r.status === 'pending';
            const isApproved = r.status === 'approved';
            const isRejected = r.status === 'rejected';

            return (
              <div
                key={r.id}
                className={cn(
                  'card overflow-hidden p-5 transition-all duration-200 hover:shadow-soft',
                  isPending && 'border-amber-300/80 bg-gradient-to-r from-amber-50/20 via-white to-white dark:border-amber-800/60 dark:from-amber-950/20 dark:to-slate-900'
                )}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  {/* Left: Pandit Info & Request Details */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-saffron-500 to-vermillion-600 font-bold text-white shadow-soft text-base">
                      {r.pandit_name ? r.pandit_name.substring(0, 2).toUpperCase() : 'PT'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-display text-base font-bold text-saffron-950 dark:text-white">
                          {r.pandit_name}
                        </h4>
                        <span className="rounded-full bg-saffron-100 dark:bg-saffron-950/60 px-2 py-0.5 text-[10px] font-bold text-saffron-700 dark:text-saffron-300 border border-saffron-200/60 dark:border-saffron-800/60">
                          Pandit Ji
                        </span>
                        {isPending ? (
                          <Badge variant="amber" className="flex items-center gap-1 font-bold">
                            <Clock className="h-3 w-3" /> Pending Approval
                          </Badge>
                        ) : isApproved ? (
                          <Badge variant="green" className="flex items-center gap-1 font-bold">
                            <CheckCircle2 className="h-3 w-3" /> Approved & Paid
                          </Badge>
                        ) : (
                          <Badge variant="red" className="flex items-center gap-1 font-bold">
                            <XCircle className="h-3 w-3" /> Rejected
                          </Badge>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-saffron-600 dark:text-slate-400">
                        {r.pandit_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-saffron-400" /> {r.pandit_email}
                          </span>
                        )}
                        {r.pandit_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-saffron-400" /> {r.pandit_phone}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          Requested: {formatDateTime(r.created_at)}
                        </span>
                      </div>

                      {r.notes && (
                        <p className="mt-2 text-xs italic text-slate-600 dark:text-slate-300 bg-saffron-50/60 dark:bg-slate-800/60 p-2 rounded-lg border border-saffron-100 dark:border-slate-800">
                          "{r.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Middle: Amount & Destination */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-saffron-50/40 p-3.5 rounded-2xl border border-saffron-200/60 dark:bg-slate-800/50 dark:border-slate-800 shrink-0">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-saffron-600 dark:text-slate-400">
                        Withdrawal Amount
                      </p>
                      <p className="font-display text-2xl font-bold text-saffron-950 dark:text-white">
                        {formatINR(r.amount)}
                      </p>
                    </div>

                    <div className="h-8 w-px bg-saffron-200 dark:bg-slate-700 hidden sm:block" />

                    {/* Destination details */}
                    <div className="min-w-[200px]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-saffron-600 dark:text-slate-400 flex items-center gap-1">
                        {r.payout_method === 'upi' ? (
                          <>
                            <Smartphone className="h-3 w-3 text-saffron-600" /> UPI Transfer Destination
                          </>
                        ) : (
                          <>
                            <Building2 className="h-3 w-3 text-saffron-600" /> Bank Account Destination
                          </>
                        )}
                      </p>

                      {r.payout_method === 'upi' ? (
                        <div className="mt-1 flex items-center gap-2">
                          <code className="rounded bg-white px-2 py-0.5 text-xs font-bold text-saffron-900 border border-saffron-200 dark:bg-slate-900 dark:text-saffron-300 dark:border-slate-700">
                            {r.payout_details?.upi_id || 'UPI Not Provided'}
                          </code>
                          {r.payout_details?.upi_id && (
                            <button
                              type="button"
                              onClick={() => handleCopy(r.payout_details.upi_id!, `upi-${r.id}`)}
                              className="rounded p-1 text-saffron-600 hover:bg-saffron-100 transition"
                              title="Copy UPI ID"
                            >
                              {copiedId === `upi-${r.id}` ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="mt-0.5 text-xs space-y-0.5">
                          <p className="font-semibold text-saffron-900 dark:text-white">
                            {r.payout_details?.bank_name || 'Bank Transfer'}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              A/C: {r.payout_details?.bank_account_no}
                            </span>
                            {r.payout_details?.bank_account_no && (
                              <button
                                type="button"
                                onClick={() => handleCopy(r.payout_details.bank_account_no!, `acc-${r.id}`)}
                                className="rounded p-0.5 text-saffron-600 hover:bg-saffron-100 transition"
                                title="Copy Account Number"
                              >
                                {copiedId === `acc-${r.id}` ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            IFSC: <span className="font-mono font-semibold">{r.payout_details?.bank_ifsc}</span> · Holder: {r.payout_details?.bank_holder_name}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isPending ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openApproveModal(r)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:scale-105 hover:shadow-soft active:scale-95"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Approve & Pay</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openRejectModal(r)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3 py-2.5 text-xs font-semibold text-rose-700 shadow-2xs hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-800 dark:text-rose-400 transition"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Decline</span>
                        </button>
                      </>
                    ) : isApproved ? (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" /> Disbursed
                        </span>
                        {r.transaction_ref && (
                          <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                            Ref: {r.transaction_ref}
                          </p>
                        )}
                        {r.approved_at && (
                          <p className="text-[10px] text-slate-400">
                            {formatDateTime(r.approved_at)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                          <XCircle className="h-4 w-4" /> Declined
                        </span>
                        {r.admin_notes && (
                          <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs">
                            Reason: {r.admin_notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approve Modal */}
      <Modal
        open={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        title="Approve & Mark Payout as Disbursed"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setApprovalModalOpen(false)}
              className="rounded-xl border border-saffron-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-saffron-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmApproval}
              disabled={processingAction}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2 text-xs font-bold text-white shadow-md hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {processingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>Confirm & Mark Paid</span>
            </button>
          </div>
        }
      >
        {selectedRequest && (
          <div className="space-y-4 p-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                You are approving Dakshina disbursement for:
              </p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-display text-lg font-bold text-emerald-950 dark:text-white">
                  {selectedRequest.pandit_name}
                </span>
                <span className="font-display text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {formatINR(selectedRequest.amount)}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-saffron-200/80 bg-saffron-50/40 p-3.5 dark:border-slate-800 dark:bg-slate-800/40 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-saffron-700 dark:text-saffron-300">
                Destination: {selectedRequest.payout_method === 'upi' ? 'UPI Handle' : 'Bank Account'}
              </p>
              {selectedRequest.payout_method === 'upi' ? (
                <div className="flex items-center gap-2">
                  <code className="font-bold text-xs font-mono text-saffron-900 dark:text-white">
                    {selectedRequest.payout_details?.upi_id}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedRequest.payout_details?.upi_id || '', 'modal-upi')}
                    className="rounded p-1 text-saffron-600 hover:bg-saffron-100"
                  >
                    {copiedId === 'modal-upi' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              ) : (
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-saffron-900 dark:text-white">{selectedRequest.payout_details?.bank_name}</p>
                  <p>A/C: <span className="font-mono font-bold">{selectedRequest.payout_details?.bank_account_no}</span></p>
                  <p>IFSC: <span className="font-mono">{selectedRequest.payout_details?.bank_ifsc}</span> · Name: {selectedRequest.payout_details?.bank_holder_name}</p>
                </div>
              )}
            </div>

            <div>
              <label className="label">Transaction Reference / UTR Number</label>
              <input
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. UTR-SBIN-92847192"
                className="input font-mono text-xs"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Bank transaction reference or IMPS/UPI UTR ID for record keeping.
              </p>
            </div>

            <div>
              <label className="label">Admin Notes / Settlement Remark</label>
              <input
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="e.g. Transferred via HDFC net banking"
                className="input text-xs"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={rejectionModalOpen}
        onClose={() => setRejectionModalOpen(false)}
        title="Decline Payout Request"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setRejectionModalOpen(false)}
              className="rounded-xl border border-saffron-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-saffron-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmRejection}
              disabled={processingAction}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-700 active:scale-95 disabled:opacity-50"
            >
              {processingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              <span>Confirm Decline</span>
            </button>
          </div>
        }
      >
        {selectedRequest && (
          <div className="space-y-4 p-5">
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
              <p className="text-xs text-rose-800 dark:text-rose-300 font-medium">
                Decline request for {selectedRequest.pandit_name} ({formatINR(selectedRequest.amount)})
              </p>
            </div>

            <div>
              <label className="label">Reason for Decline (will be sent to the priest)</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="Explain why this request is declined (e.g. invalid IFSC, account name mismatch)..."
                className="input text-xs"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
