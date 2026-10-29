import { useState, useEffect, type FormEvent } from 'react';
import { User, Phone, MapPin, Globe, Sparkles, Check, Loader2, X, Flame } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { firebaseClient, type Profile } from '../../lib/firebase';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../ui/Modal';
import { cn } from '../../lib/utils';

const LANGUAGES = [
  'Hindi',
  'Sanskrit',
  'Tamil',
  'Telugu',
  'Marathi',
  'Gujarati',
  'Bengali',
  'Kannada',
  'Malayalam',
  'Odia',
  'English',
];

const MAJOR_CITIES = [
  'Varanasi',
  'Ayodhya',
  'Haridwar',
  'Rishikesh',
  'Mathura',
  'Ujjain',
  'Delhi NCR',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Pune',
  'Ahmedabad',
  'Jaipur',
  'Lucknow',
];

export function ProfileUpdatePromptModal() {
  const { profile, refreshProfile } = useAuth();
  const { success, error: toastError } = useToast();

  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('Hindi');
  const [gotra, setGotra] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;

    // Check if user just signed up with Google or if profile is missing phone number
    const askedSession = sessionStorage.getItem('profile_prompt_dismissed');
    const justSignedUpGoogle = sessionStorage.getItem('ask_profile_update') === 'true';
    const isProfileIncomplete = !profile.phone || profile.phone.trim() === '';

    if ((justSignedUpGoogle || isProfileIncomplete) && !askedSession) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setOpen(true);
    }
  }, [profile]);

  const handleDismiss = () => {
    sessionStorage.removeItem('ask_profile_update');
    sessionStorage.setItem('profile_prompt_dismissed', 'true');
    setOpen(false);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!phone || phone.trim().length < 10) {
      toastError('Phone Required', 'Please enter a valid 10-digit phone number for ceremony coordination.');
      return;
    }

    setSaving(true);
    try {
      const updates: Partial<Profile> & { city?: string; language?: string; gotra?: string } = {
        full_name: fullName.trim() || profile.full_name,
        phone: phone.trim(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await firebaseClient
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) {
        toastError('Update Error', error.message);
        setSaving(false);
        return;
      }

      await refreshProfile();
      sessionStorage.removeItem('ask_profile_update');
      sessionStorage.setItem('profile_prompt_dismissed', 'true');
      setOpen(false);
      success(
        'Profile Updated Successfully! 🙏',
        'Your contact and spiritual details are saved for all upcoming pooja bookings.',
        {
          label: 'Book a Pooja',
          href: '/app/services',
        }
      );
    } catch (err: any) {
      toastError('Save Failed', err.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !profile) return null;

  return (
    <Modal
      open={open}
      onClose={handleDismiss}
      title="Complete Your Profile"
      size="md"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs text-saffron-600 hover:text-saffron-800 dark:text-saffron-400 font-medium"
          >
            I'll complete later
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="btn-secondary text-xs"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-xs"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save & Continue
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Welcome Banner */}
        <div className="rounded-xl border border-saffron-200/80 bg-gradient-to-r from-saffron-50 via-marigold-50 to-saffron-100/50 p-3.5 dark:border-saffron-900/40 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-saffron-500 to-vermillion-500 text-white shadow-soft">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-display text-sm font-bold text-saffron-900 dark:text-saffron-200">
                Welcome to PoojaConnect!
              </h4>
              <p className="mt-0.5 text-xs text-saffron-700 dark:text-slate-300 leading-relaxed">
                Thank you for signing in with Google. Please update your phone number and city so verified Pandits can coordinate your sankalp and pooja timings smoothly.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5">
          {/* Full Name */}
          <div>
            <label className="label">Full Name</label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="input pl-9 text-sm"
                required
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">
                Contact Phone / WhatsApp Number <span className="text-vermillion-500">*</span>
              </label>
              <span className="text-[10.5px] font-medium text-emerald-600 dark:text-emerald-400">
                For Pandit & Muhurat SMS
              </span>
            </div>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="input pl-9 text-sm font-mono"
                required
              />
            </div>
          </div>

          {/* City / State */}
          <div>
            <label className="label">Your City / Location</label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Varanasi, Bengaluru, Delhi, Mumbai"
                list="city-suggestions"
                className="input pl-9 text-sm"
              />
              <datalist id="city-suggestions">
                {MAJOR_CITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Preferred Language for Chanting / Vidhi */}
          <div>
            <label className="label">Preferred Language for Rituals & Mantras</label>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.slice(0, 6).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSelectedLanguage(lang)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1.5 text-xs font-medium transition text-center',
                    selectedLanguage === lang
                      ? 'border-saffron-500 bg-saffron-50 text-saffron-800 dark:bg-saffron-950/40 dark:text-saffron-200 ring-1 ring-saffron-500'
                      : 'border-saffron-200 bg-white text-slate-700 hover:bg-saffron-50/50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                  )}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Gotra for Sankalp */}
          {profile.role === 'devotee' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Gotra (Optional for Sankalp)</label>
                <span className="text-[10px] text-slate-400">e.g. Kashyap, Bharadwaj, Vashishta</span>
              </div>
              <input
                type="text"
                value={gotra}
                onChange={(e) => setGotra(e.target.value)}
                placeholder="Enter family gotra if known"
                className="input text-sm"
              />
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
}
