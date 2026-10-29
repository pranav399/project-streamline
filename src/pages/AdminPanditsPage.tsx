import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Loader2,
  Check,
  X,
  Star,
  MapPin,
  Trash2,
  RotateCcw,
  Clock,
  UserCheck,
  Users,
  UserMinus,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { firebaseClient, type PanditProfile, type Profile, SEED_PANDIT_PROFILES } from '../lib/firebase';
import { formatINR, initials, cn } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../context/ToastContext';

type PanditRow = PanditProfile & { profile: Profile };

export function AdminPanditsPage() {
  const { success, error: toastError, info } = useToast();
  const [pandits, setPandits] = useState<PanditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified'>('all');

  // State for single remove modal
  const [removeTarget, setRemoveTarget] = useState<PanditRow | null>(null);
  const [showRemoveChoiceModal, setShowRemoveChoiceModal] = useState(false);

  // State for bulk remove dialog
  const [showRemoveBothDialog, setShowRemoveBothDialog] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await firebaseClient
      .from('pandit_profiles')
      .select('*, profile:profiles!pandit_profiles_user_id_fkey(*)')
      .order('created_at', { ascending: false });
    setPandits((data as PanditRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const handleSync = () => load();
    window.addEventListener('poojaconnect_firebase_sync', handleSync);
    return () => window.removeEventListener('poojaconnect_firebase_sync', handleSync);
  }, []);

  // Approve a pandit: verified becomes true, button switches to "Remove"
  const handleApprove = async (userId: string) => {
    setBusy(userId);
    const { error } = await firebaseClient
      .from('pandit_profiles')
      .update({ is_verified: true })
      .eq('user_id', userId);
    setBusy(null);

    if (error) {
      toastError('Failed to Approve', error.message);
      return;
    }

    await firebaseClient.from('notifications').insert({
      user_id: userId,
      type: 'verification',
      title: 'Profile Verified! 🌟',
      body: 'Admin has approved your pandit profile. You are now visible to devotees with a gold badge.',
      link: '/app/profile',
      is_read: false,
      created_at: new Date().toISOString(),
    });

    success(
      'Pandit Profile Approved! 🌟',
      'Pandit is now verified and active with a gold trust badge on devotee discovery.',
      {
        label: 'View Pandits',
        href: '/app/pandits',
      }
    );
    load();
  };

  // Revoke approval (set back to pending: switches button back to "Approve")
  const handleRevokeApproval = async (userId: string) => {
    setBusy(userId);
    setShowRemoveChoiceModal(false);
    const { error } = await firebaseClient
      .from('pandit_profiles')
      .update({ is_verified: false })
      .eq('user_id', userId);
    setBusy(null);

    if (error) {
      toastError('Failed to Revoke', error.message);
      return;
    }

    await firebaseClient.from('notifications').insert({
      user_id: userId,
      type: 'verification_revoked',
      title: 'Verification Status Updated',
      body: 'Your pandit profile verification was reset to pending review by admin.',
      link: '/app/profile',
      is_read: false,
      created_at: new Date().toISOString(),
    });

    success('Approval Revoked', 'Pandit profile has been moved back to Pending Approval.');
    load();
  };

  // Completely remove pandit role and delete pandit profile (reverts to devotee in Users section)
  const handleRemovePanditRole = async (userId: string) => {
    setBusy(userId);
    setShowRemoveChoiceModal(false);

    // 1. Revert user role to devotee in profiles so User Management reflects change
    await firebaseClient.from('profiles').update({ role: 'devotee' }).eq('id', userId);

    // 2. Delete the pandit_profile record
    const { error } = await firebaseClient
      .from('pandit_profiles')
      .delete()
      .eq('user_id', userId);
    setBusy(null);

    if (error) {
      toastError('Failed to Remove Pandit', error.message);
      return;
    }

    success(
      'Pandit Role Removed',
      'Pandit profile was deleted and user role was updated to "Devotee". You can re-assign them anytime in User Management.',
      {
        label: 'User Management',
        href: '/app/admin-users',
      }
    );
    load();
  };

  // Reset all demo pandits to pending approval for testing approval flow
  const handleResetToPending = async () => {
    setLoading(true);
    for (const p of pandits) {
      await firebaseClient
        .from('pandit_profiles')
        .update({ is_verified: false })
        .eq('user_id', p.user_id);
    }
    info('Reset Complete', 'All pandit profiles are now Pending Approval with the Approve button.');
    load();
  };

  // Remove both pandits from the platform
  const handleRemoveBoth = async () => {
    setShowRemoveBothDialog(false);
    setLoading(true);
    for (const p of pandits) {
      await firebaseClient.from('profiles').update({ role: 'devotee' }).eq('id', p.user_id);
      await firebaseClient
        .from('pandit_profiles')
        .delete()
        .eq('user_id', p.user_id);
    }
    success('Removed Both Pandits', 'Both pandits have been removed and reverted to Devotee role.');
    load();
  };

  // Restore default seed pandits if deleted
  const handleRestoreDefaults = async () => {
    setLoading(true);
    for (const p of SEED_PANDIT_PROFILES) {
      await firebaseClient.from('profiles').update({ role: 'pandit' }).eq('id', p.user_id);
      await firebaseClient.from('pandit_profiles').upsert({
        ...p,
        is_verified: false,
      });
    }
    success('Pandits Restored', 'Default pandit profiles have been restored as Pending Approval.');
    load();
  };

  const pendingCount = pandits.filter((p) => !p.is_verified).length;
  const verifiedCount = pandits.filter((p) => p.is_verified).length;

  const filteredPandits = pandits.filter((p) => {
    if (filter === 'pending') return !p.is_verified;
    if (filter === 'verified') return p.is_verified;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verify Pandits"
        description="Review and approve pandit profiles. Verify qualified pandits or remove profiles."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleResetToPending}
              className="flex items-center gap-1.5 rounded-xl border border-saffron-200 bg-white px-3 py-1.5 text-xs font-semibold text-saffron-800 shadow-2xs hover:bg-saffron-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              title="Reset all pandits to Pending Approval to test verification flow"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset to Pending</span>
            </button>

            {pandits.length > 0 && (
              <button
                onClick={() => setShowRemoveBothDialog(true)}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-2xs hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
                title="Remove both pandits from the platform"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove Both</span>
              </button>
            )}
          </div>
        }
      />

      {/* Helpful banner explaining the dual action logic */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
        <Sparkles className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <p>
          <strong className="font-bold">Approval Workflow:</strong> Pending pandits show the green{' '}
          <span className="font-bold text-emerald-700 dark:text-emerald-400">Approve</span> button. Once approved, the Approve button disappears and the red{' '}
          <span className="font-bold text-rose-700 dark:text-rose-400">Remove</span> button is shown. You can also assign any user the pandit role in{' '}
          <Link to="/app/admin-users" className="underline font-bold hover:text-saffron-600">
            User Management
          </Link>{' '}
          to verify them here.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-saffron-100 pb-3 dark:border-slate-800">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition',
            filter === 'all'
              ? 'bg-saffron-600 text-white shadow-2xs'
              : 'text-saffron-700 hover:bg-saffron-100 dark:text-slate-300 dark:hover:bg-slate-800'
          )}
        >
          <Users className="h-3.5 w-3.5" />
          <span>All Pandits ({pandits.length})</span>
        </button>

        <button
          onClick={() => setFilter('pending')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition',
            filter === 'pending'
              ? 'bg-amber-500 text-white shadow-2xs'
              : 'text-saffron-700 hover:bg-saffron-100 dark:text-slate-300 dark:hover:bg-slate-800'
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Pending Approval ({pendingCount})</span>
        </button>

        <button
          onClick={() => setFilter('verified')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition',
            filter === 'verified'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'text-saffron-700 hover:bg-saffron-100 dark:text-slate-300 dark:hover:bg-slate-800'
          )}
        >
          <UserCheck className="h-3.5 w-3.5" />
          <span>Verified ({verifiedCount})</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filteredPandits.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <ShieldCheck className="h-10 w-10 text-saffron-300" />
          <p className="font-semibold text-saffron-900 dark:text-white">
            {filter === 'pending'
              ? 'No pandits pending approval'
              : filter === 'verified'
              ? 'No verified pandits yet'
              : 'No pandit profiles found'}
          </p>
          <p className="text-sm text-saffron-500 max-w-sm">
            {pandits.length === 0
              ? 'All pandits have been removed. You can restore default pandits or assign the Pandit role to users in User Management.'
              : 'Try selecting a different filter above.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {pandits.length === 0 && (
              <button
                onClick={handleRestoreDefaults}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-saffron-600 to-vermillion-600 px-4 py-2 text-xs font-bold text-white shadow-soft hover:shadow-pop"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Restore Default Pandits</span>
              </button>
            )}
            <Link
              to="/app/admin-users"
              className="flex items-center gap-1.5 rounded-xl border border-saffron-200 bg-white px-4 py-2 text-xs font-bold text-saffron-800 shadow-2xs hover:bg-saffron-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <Users className="h-4 w-4" />
              <span>Go to User Management</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from(new Map(filteredPandits.map((p) => [p.user_id, p])).values()).map((p, idx) => {
            const isCurrentlyVerified = Boolean(p.is_verified);
            const isRowBusy = busy === p.user_id;

            return (
              <div
                key={p.id ? `pandit-${p.user_id}-${p.id}` : `pandit-${p.user_id}-${idx}`}
                className={cn(
                  'card flex flex-col justify-between p-5 transition shadow-xs hover:shadow-soft',
                  !isCurrentlyVerified && 'ring-2 ring-amber-300/80 bg-gradient-to-b from-amber-50/30 to-white dark:from-amber-950/20 dark:to-slate-900'
                )}
              >
                <div>
                  {/* Card Header with Avatar and Status */}
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-saffron-200 bg-gradient-to-br from-saffron-500 to-vermillion-600 text-sm font-bold text-white shadow-2xs">
                      {p.profile?.avatar_url ? (
                        <img src={p.profile.avatar_url} alt={p.profile.full_name || 'Pandit'} className="h-full w-full object-cover" />
                      ) : (
                        initials(p.profile?.full_name ?? '', p.profile?.email ?? '')
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-saffron-900 dark:text-white">
                        {p.profile?.full_name || 'Pandit'}
                      </p>
                      <p className="truncate text-xs text-saffron-500">{p.profile?.email}</p>
                    </div>

                    {isCurrentlyVerified ? (
                      <Badge variant="green" className="shrink-0">
                        <ShieldCheck className="h-3 w-3" />
                        <span>Verified</span>
                      </Badge>
                    ) : (
                      <Badge variant="amber" className="shrink-0">
                        <Clock className="h-3 w-3" />
                        <span>Pending</span>
                      </Badge>
                    )}
                  </div>

                  {/* Pandit Details */}
                  <div className="mt-4 space-y-2 text-sm">
                    {p.city && (
                      <p className="flex items-center gap-1.5 text-saffron-700 dark:text-slate-300">
                        <MapPin className="h-3.5 w-3.5 text-saffron-500" />
                        <span>{p.city}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-1.5 text-saffron-700 dark:text-slate-300">
                      <Star className="h-3.5 w-3.5 fill-marigold-400 text-marigold-400" />
                      <span>{p.rating > 0 ? p.rating.toFixed(1) : 'New'} · {p.experience_years || 1}y exp</span>
                    </p>
                    <p className="text-saffron-800 dark:text-slate-200">
                      Base: <span className="font-bold text-saffron-900 dark:text-white">{formatINR(p.base_price)}</span>
                    </p>
                    {(p.languages || []).length > 0 && (
                      <p className="text-xs text-saffron-600 dark:text-slate-400">
                        {p.languages.join(', ')}
                      </p>
                    )}
                  </div>

                  {p.bio && (
                    <p className="mt-3 line-clamp-2 text-xs text-saffron-600 dark:text-slate-400">
                      {p.bio}
                    </p>
                  )}
                </div>

                {/* Single State Action Button:
                    - When Pending: Shows only the green "Approve" button
                    - When Verified: Shows only the red "Remove" button (no Approve button) */}
                <div className="mt-5 border-t border-saffron-100 pt-3 dark:border-slate-800">
                  {!isCurrentlyVerified ? (
                    <button
                      type="button"
                      onClick={() => handleApprove(p.user_id)}
                      disabled={isRowBusy}
                      title="Approve pandit profile"
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 px-4 text-xs font-bold text-white shadow-soft transition hover:from-emerald-700 hover:to-teal-700 hover:shadow-pop disabled:opacity-50"
                    >
                      {isRowBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 stroke-[3]" />
                      )}
                      <span>Approve</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setRemoveTarget(p);
                        setShowRemoveChoiceModal(true);
                      }}
                      disabled={isRowBusy}
                      title="Remove verification or delete pandit profile"
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 px-4 text-xs font-bold text-white shadow-soft transition hover:bg-rose-700 hover:shadow-pop disabled:opacity-50"
                    >
                      {isRowBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 stroke-[3]" />
                      )}
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Remove Choice Modal for a Single Pandit */}
      {removeTarget && (
        <Modal
          open={showRemoveChoiceModal}
          onClose={() => setShowRemoveChoiceModal(false)}
          title="Remove Pandit"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-saffron-50/80 p-3 dark:bg-slate-800/80">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-saffron-500 font-bold text-white">
                {initials(removeTarget.profile?.full_name ?? '', removeTarget.profile?.email ?? '')}
              </span>
              <div className="min-w-0">
                <p className="font-bold text-saffron-900 dark:text-white truncate">
                  {removeTarget.profile?.full_name || 'Pandit'}
                </p>
                <p className="text-xs text-saffron-600 dark:text-slate-400 truncate">
                  {removeTarget.profile?.email}
                </p>
              </div>
            </div>

            <p className="text-xs text-saffron-700 dark:text-slate-300">
              Select which action to perform for this pandit:
            </p>

            <div className="space-y-2 pt-1">
              {/* Option 1: Revoke Approval (Sets status back to pending, re-enabling the Approve button) */}
              <button
                type="button"
                onClick={() => handleRevokeApproval(removeTarget.user_id)}
                className="w-full flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-left transition hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40"
              >
                <div>
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Revoke Approval
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    Removes the verified badge and restores the "Approve" button for testing.
                  </p>
                </div>
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 ml-2" />
              </button>

              {/* Option 2: Remove Pandit Role and demote to Devotee in User Management */}
              <button
                type="button"
                onClick={() => handleRemovePanditRole(removeTarget.user_id)}
                className="w-full flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-left transition hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40"
              >
                <div>
                  <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                    Remove Pandit Role (Demote to Devotee)
                  </p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300">
                    Deletes pandit profile and changes role back to Devotee in User Management.
                  </p>
                </div>
                <UserMinus className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 ml-2" />
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-saffron-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowRemoveChoiceModal(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-saffron-700 hover:bg-saffron-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Dialog for "Remove Both" */}
      <ConfirmDialog
        open={showRemoveBothDialog}
        title="Remove Both Pandits?"
        message="Are you sure you want to remove both pandits? Their roles will be updated to Devotee in User Management. You can restore them anytime."
        confirmLabel="Yes, Remove Both"
        variant="danger"
        onConfirm={handleRemoveBoth}
        onCancel={() => setShowRemoveBothDialog(false)}
      />
    </div>
  );
}
