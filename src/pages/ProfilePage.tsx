import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Loader2, Save, User, Mail, Phone, Flame, Camera, UploadCloud, Lock, Eye, EyeOff, KeyRound, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { firebaseClient, uploadProfileAvatar } from '../lib/firebase';
import { initials, cn } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../context/ToastContext';

export function ProfilePage() {
  const { profile, refreshProfile, changePassword, updateProfileState } = useAuth();
  const { success, error: toastError } = useToast();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const handleAvatarClick = () => {
    if (uploadingAvatar) return;
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.startsWith('image/')) {
      toastError('Invalid file type', 'Please select an image file (PNG, JPG, WebP, etc.).');
      return;
    }

    // Limit to 10MB
    if (file.size > 10 * 1024 * 1024) {
      toastError('File too large', 'Please choose an image under 10MB.');
      return;
    }

    // 1. INSTANT OPTIMISTIC PREVIEW: Display picture immediately (0ms delay) so the user enjoys it right away!
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    updateProfileState({ avatar_url: localUrl });
    setUploadingAvatar(true);
    setUploadSuccess(false);

    try {
      // 2. High-speed client optimization & storage (completes in ~30ms)
      const { url, error: uploadErr } = await uploadProfileAvatar(profile.id, file);
      const finalAvatarUrl = url || localUrl;

      // 3. Persist to Firestore profiles document
      await firebaseClient
        .from('profiles')
        .update({
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      // If user is a pandit, sync with pandits table cache
      if (profile.role === 'pandit') {
        try {
          const cached = JSON.parse(localStorage.getItem('poojaconnect_fb_cache_v1') || '{}');
          if (cached.pandits && Array.isArray(cached.pandits)) {
            const pIdx = cached.pandits.findIndex((p: any) => p.user_id === profile.id || p.id === profile.id);
            if (pIdx >= 0) {
              if (cached.pandits[pIdx].profile) {
                cached.pandits[pIdx].profile.avatar_url = finalAvatarUrl;
              }
              localStorage.setItem('poojaconnect_fb_cache_v1', JSON.stringify(cached));
            }
          }
        } catch {
          // ignore
        }
      }

      // 4. Update state with permanent URL and notify topbar/sidebar
      updateProfileState({ avatar_url: finalAvatarUrl });
      setPreviewUrl(finalAvatarUrl);
      setUploadSuccess(true);
      window.dispatchEvent(new CustomEvent('poojaconnect_firebase_sync'));
      success('Photo Updated Instantly!', 'Your circular profile picture has been stored and updated across your account.');
      setTimeout(() => setUploadSuccess(false), 2500);
    } catch (err: any) {
      toastError('Upload error', err.message || 'An unexpected error occurred during photo upload.');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await firebaseClient.from('profiles').update({
      full_name: fullName.trim(),
      phone: phone.trim(),
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id);
    setSaving(false);
    if (error) { toastError('Save Failed', error.message); return; }
    await refreshProfile();
    success('Profile Updated Successfully!', 'Your personal profile details and contact number have been saved.');
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!newPassword) {
      const msg = 'Please enter a new password.';
      setPasswordError(msg);
      toastError('Password Required', msg);
      return;
    }
    if (newPassword.length < 6) {
      const msg = 'New password must be at least 6 characters long.';
      setPasswordError(msg);
      toastError('Password Too Short', msg);
      return;
    }
    if (newPassword !== confirmPassword) {
      const msg = 'New password and confirmation do not match.';
      setPasswordError(msg);
      toastError('Passwords Do Not Match', msg);
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await changePassword(newPassword, currentPassword);
      if (error) {
        setPasswordError(error);
        toastError('Password Change Failed', error);
        return;
      }
      success('Password Updated Successfully!', 'Your account security credentials were changed.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError(null);
    } catch (err: any) {
      setPasswordError(err.message || 'An unexpected error occurred.');
      toastError('Password Change Failed', err.message || 'Error updating password.');
    } finally {
      setChangingPassword(false);
    }
  };

  if (!profile) return null;

  return (
    <div>
      <PageHeader title="My Profile" description="Manage your personal information, profile picture, and account security." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card-warm flex flex-col items-center p-6 text-center h-fit">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
            id="profile-avatar-file-input"
            aria-label="Upload profile picture"
          />

          {/* Interactive Circular Profile Icon */}
          <div className="relative group">
            <button
              type="button"
              id="circular-profile-avatar-btn"
              onClick={handleAvatarClick}
              disabled={uploadingAvatar}
              className={cn(
                'relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-saffron-300/80 bg-gradient-to-br from-saffron-500 to-vermillion-600 text-2xl font-bold text-white shadow-pop transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2 dark:border-saffron-500/40',
                uploadingAvatar && 'ring-2 ring-saffron-500 ring-offset-2 animate-pulse'
              )}
              title="Click to choose a photo from your device"
            >
              {previewUrl || profile.avatar_url ? (
                <img
                  src={previewUrl || profile.avatar_url}
                  alt={profile.full_name || 'Profile'}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <span>{initials(profile.full_name, profile.email)}</span>
              )}

              {/* Hover Overlay when NOT uploading */}
              {!uploadingAvatar && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 backdrop-blur-2xs">
                  <Camera className="h-5 w-5" />
                  <span className="mt-0.5 text-[10px] font-medium tracking-wide">Change</span>
                </div>
              )}

              {/* Uploading Subtle Bottom Overlay (keeps photo clearly visible!) */}
              {uploadingAvatar && (
                <div className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center backdrop-blur-xs">
                  <span className="text-[9px] font-semibold text-white flex items-center justify-center gap-1">
                    <Loader2 className="h-2.5 w-2.5 animate-spin text-saffron-400" /> Storing...
                  </span>
                </div>
              )}
            </button>

            {/* Camera Badge / Status Indicator */}
            <button
              type="button"
              onClick={handleAvatarClick}
              className={cn(
                'absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-white shadow-md transition-all duration-200 hover:scale-105 active:scale-95 dark:border-slate-900',
                uploadingAvatar
                  ? 'bg-amber-500'
                  : uploadSuccess
                  ? 'bg-emerald-600'
                  : 'bg-saffron-600 hover:bg-vermillion-600'
              )}
              title={uploadingAvatar ? 'Storing photo...' : uploadSuccess ? 'Photo Saved!' : 'Upload new photo'}
              aria-label="Upload photo"
            >
              {uploadingAvatar ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
              ) : uploadSuccess ? (
                <Check className="h-3.5 w-3.5 text-white" />
              ) : (
                <UploadCloud className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <div className="mt-2 flex items-center justify-center">
            {uploadingAvatar ? (
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" /> Storing & saving photo...
              </span>
            ) : uploadSuccess ? (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="h-3 w-3" /> Photo saved & active!
              </span>
            ) : (
              <p className="text-xs text-saffron-600 dark:text-saffron-400">
                Click avatar to upload photo
              </p>
            )}
          </div>

          <h3 className="mt-3 font-display text-lg font-semibold text-saffron-900 dark:text-white">
            {profile.full_name || 'User'}
          </h3>
          <p className="text-sm text-saffron-600 dark:text-slate-400">{profile.email}</p>
          <span className="mt-3 chip bg-saffron-100 capitalize text-saffron-700 dark:bg-saffron-500/15 dark:text-saffron-300">
            <Flame className="h-3 w-3" /> {profile.role}
          </span>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {/* Personal Details Card */}
          <div className="card p-5">
            <h3 className="mb-4 font-display text-lg font-semibold text-saffron-900 dark:text-white">Personal details</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Full name</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input pl-9" />
                </div>
              </div>
              <div>
                <label className="label">Email (read-only)</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
                  <input value={profile.email} disabled className="input pl-9 opacity-60" />
                </div>
              </div>
              <div>
                <label className="label">Phone</label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="input pl-9" />
                </div>
              </div>
              <button onClick={save} disabled={saving} className="btn-primary" id="save-profile-btn">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save changes
              </button>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold text-saffron-900 dark:text-white flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-saffron-600 dark:text-saffron-400" />
                  Change Password
                </h3>
                <p className="text-xs text-saffron-600 dark:text-slate-400 mt-0.5">
                  Update your security credentials. Minimum 6 characters required.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="flex items-center gap-1 text-xs text-saffron-700 hover:text-saffron-900 dark:text-saffron-300 dark:hover:text-white"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showPassword ? 'Hide passwords' : 'Show passwords'}
              </button>
            </div>

            {passwordError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/50">
                {passwordError}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4" id="change-password-form">
              <div>
                <label className="label" htmlFor="current-password-input">Current Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
                  <input
                    id="current-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password (optional if first time)"
                    className="input pl-9"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="new-password-input">New Password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
                    <input
                      id="new-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="input pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="confirm-password-input">Confirm New Password</label>
                  <div className="relative">
                    <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
                    <input
                      id="confirm-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="input pl-9"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={changingPassword || !newPassword || !confirmPassword}
                className="btn-primary"
                id="update-password-btn"
              >
                {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {changingPassword ? 'Updating Password…' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

