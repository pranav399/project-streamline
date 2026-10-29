import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Flame,
  ShieldCheck,
  CalendarHeart,
  Users,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  RotateCcw,
  CheckCircle2,
  Languages,
  Clock,
  IndianRupee,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { Role } from '../lib/firebase';
import { cn } from '../lib/utils';

interface PresetData {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  // Pandit specific
  specialties?: string[];
  languages?: string;
  experienceYears?: number;
  basePrice?: number;
  bio?: string;
  // Devotee specific
  gotra?: string;
  preferredDeity?: string;
  // Admin specific
  department?: string;
}

const ROLE_PRESETS: Record<Role, PresetData> = {
  devotee: {
    fullName: 'Aarav Sharma',
    email: 'devotee@example.com',
    phone: '+91 98765 43210',
    city: 'New Delhi, Delhi',
    gotra: 'Kashyap',
    preferredDeity: 'Lord Shiva & Lord Ganesha',
  },
  pandit: {
    fullName: 'Pandit Rajesh Shastri',
    email: 'pandit@example.com',
    phone: '+91 98123 45678',
    city: 'Varanasi, Uttar Pradesh',
    specialties: ['Satyanarayan Katha', 'Rudrabhishek', 'Griha Pravesh', 'Navagraha Shanti', 'Maha Mrityunjaya'],
    languages: 'Sanskrit, Hindi, Bhojpuri, English',
    experienceYears: 12,
    basePrice: 2100,
    bio: 'Acharya in Shukla Yajurveda & Vedic rituals from Sampurnanand Sanskrit Vishwavidyalaya, Varanasi with 12+ years of Vedic ritual expertise.',
  },
  admin: {
    fullName: 'Siddharth Verma',
    email: 'admin@example.com',
    phone: '+91 99887 76655',
    city: 'Bengaluru, Karnataka',
    department: 'Operations, Pandit Verification & Finance',
  },
};

const AVAILABLE_SPECIALTIES = [
  'Satyanarayan Katha',
  'Rudrabhishek',
  'Griha Pravesh',
  'Navagraha Shanti',
  'Maha Mrityunjaya',
  'Vastu Shanti',
  'Vivah Sanskar',
  'Havan & Yajna',
  'Sundarkand Path',
  'Ganesh Pooja',
];

export function DemoAccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { demoLogin } = useAuth();
  const { success, error: toastError } = useToast();

  const initialRoleParam = searchParams.get('role');
  const initialRole: Role =
    initialRoleParam === 'pandit' || initialRoleParam === 'admin' ? initialRoleParam : 'devotee';

  const [role, setRole] = useState<Role>(initialRole);
  const [fullName, setFullName] = useState(ROLE_PRESETS[initialRole].fullName);
  const [email, setEmail] = useState(ROLE_PRESETS[initialRole].email);
  const [phone, setPhone] = useState(ROLE_PRESETS[initialRole].phone);
  const [city, setCity] = useState(ROLE_PRESETS[initialRole].city);

  // Pandit fields
  const [specialties, setSpecialties] = useState<string[]>(ROLE_PRESETS.pandit.specialties || []);
  const [languages, setLanguages] = useState(ROLE_PRESETS.pandit.languages || '');
  const [experienceYears, setExperienceYears] = useState(ROLE_PRESETS.pandit.experienceYears || 10);
  const [basePrice, setBasePrice] = useState(ROLE_PRESETS.pandit.basePrice || 2100);
  const [bio, setBio] = useState(ROLE_PRESETS.pandit.bio || '');

  // Devotee fields
  const [gotra, setGotra] = useState(ROLE_PRESETS.devotee.gotra || '');
  const [preferredDeity, setPreferredDeity] = useState(ROLE_PRESETS.devotee.preferredDeity || '');

  // Admin fields
  const [department, setDepartment] = useState(ROLE_PRESETS.admin.department || '');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync role change with default values if user clicks a tab
  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setError(null);
    const preset = ROLE_PRESETS[newRole];
    setFullName(preset.fullName);
    setEmail(preset.email);
    setPhone(preset.phone);
    setCity(preset.city);
    if (newRole === 'pandit') {
      setSpecialties(preset.specialties || []);
      setLanguages(preset.languages || '');
      setExperienceYears(preset.experienceYears || 10);
      setBasePrice(preset.basePrice || 2100);
      setBio(preset.bio || '');
    } else if (newRole === 'devotee') {
      setGotra(preset.gotra || '');
      setPreferredDeity(preset.preferredDeity || '');
    } else if (newRole === 'admin') {
      setDepartment(preset.department || '');
    }
  };

  const handleReset = () => {
    handleRoleChange(role);
  };

  const toggleSpecialty = (item: string) => {
    if (specialties.includes(item)) {
      setSpecialties(specialties.filter((s) => s !== item));
    } else {
      setSpecialties([...specialties, item]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      const msg = 'Please enter your full name.';
      setError(msg);
      toastError('Name Required', msg);
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      const msg = 'Please enter a valid email address.';
      setError(msg);
      toastError('Valid Email Required', msg);
      return;
    }

    setBusy(true);

    const panditDetails =
      role === 'pandit'
        ? {
            bio: bio.trim(),
            specialties: specialties.length > 0 ? specialties : ['General Pooja'],
            languages: languages
              .split(',')
              .map((l) => l.trim())
              .filter(Boolean),
            experience_years: Number(experienceYears) || 5,
            base_price: Number(basePrice) || 1100,
            city: city.trim() || 'Varanasi',
          }
        : undefined;

    const res = await demoLogin({
      role,
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      city: city.trim(),
      panditDetails,
    });

    setBusy(false);

    if (res.error) {
      setError(res.error);
      toastError('Demo Access Failed', res.error);
      return;
    }

    success(
      'Demo Access Granted!',
      `Logged in as ${fullName.trim()} (${role === 'devotee' ? 'Devotee' : role === 'pandit' ? 'Vedic Pandit' : 'Administrator'}).`,
      {
        label: 'Open Dashboard',
        href: '/app',
      }
    );
    navigate('/app');
  };

  return (
    <div className="min-h-screen bg-sacred-radial from-amber-50/70 via-orange-50/40 to-saffron-100/30 px-4 py-8 dark:from-slate-950 dark:via-slate-900 dark:to-saffron-950/20 sm:py-12">
      <div className="mx-auto max-w-3xl">
        {/* Top Back Navigation with distinct page links */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-saffron-700 transition hover:text-saffron-900 dark:text-saffron-400 dark:hover:text-saffron-300"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Devotee & Pandit Login</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <Link
              to="/admin-login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 transition hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
            >
              <ShieldCheck className="h-4 w-4 text-purple-600" />
              <span>Admin Login Portal</span>
            </Link>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-saffron-300/80 bg-white/90 px-3 py-1 text-[11px] font-semibold text-saffron-800 shadow-sm backdrop-blur dark:border-saffron-700/60 dark:bg-slate-900/90 dark:text-saffron-300">
            <Sparkles className="h-3.5 w-3.5 text-saffron-500" />
            Custom Demo Access
          </span>
        </div>

        {/* Main Card */}
        <div className="overflow-hidden rounded-2xl border border-saffron-200/80 bg-white/95 shadow-xl shadow-saffron-500/5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          {/* Header Banner */}
          <div className="border-b border-saffron-100 bg-gradient-to-r from-saffron-500/10 via-amber-500/5 to-transparent px-6 py-6 dark:border-slate-800 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-saffron-500 to-vermillion-600 text-white shadow-soft">
                <Flame className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-saffron-950 dark:text-white sm:text-2xl">
                  Configure Demo Experience
                </h1>
                <p className="mt-0.5 text-xs text-saffron-600 dark:text-slate-400 sm:text-sm">
                  Customize your profile details before entering the PoojaConnect portal.
                </p>
              </div>
            </div>

            {/* Role Selection Tabs */}
            <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <button
                type="button"
                id="role-tab-devotee"
                onClick={() => handleRoleChange('devotee')}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 text-left transition',
                  role === 'devotee'
                    ? 'border-saffron-500 bg-white shadow-sm ring-2 ring-saffron-500/20 dark:border-saffron-400 dark:bg-slate-800'
                    : 'border-saffron-200/70 bg-white/60 hover:bg-white dark:border-slate-800 dark:bg-slate-900/50'
                )}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    role === 'devotee'
                      ? 'bg-saffron-500 text-white'
                      : 'bg-saffron-100 text-saffron-700 dark:bg-slate-800 dark:text-saffron-400'
                  )}
                >
                  <CalendarHeart className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Devotee</span>
                    {role === 'devotee' && <CheckCircle2 className="h-3.5 w-3.5 text-saffron-500" />}
                  </div>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">Pooja Seeker</p>
                </div>
              </button>

              <button
                type="button"
                id="role-tab-pandit"
                onClick={() => handleRoleChange('pandit')}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 text-left transition',
                  role === 'pandit'
                    ? 'border-saffron-500 bg-white shadow-sm ring-2 ring-saffron-500/20 dark:border-saffron-400 dark:bg-slate-800'
                    : 'border-saffron-200/70 bg-white/60 hover:bg-white dark:border-slate-800 dark:bg-slate-900/50'
                )}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    role === 'pandit'
                      ? 'bg-saffron-500 text-white'
                      : 'bg-saffron-100 text-saffron-700 dark:bg-slate-800 dark:text-saffron-400'
                  )}
                >
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Vedic Pandit</span>
                    {role === 'pandit' && <CheckCircle2 className="h-3.5 w-3.5 text-saffron-500" />}
                  </div>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">Acharya & Priest</p>
                </div>
              </button>

              <button
                type="button"
                id="role-tab-admin"
                onClick={() => handleRoleChange('admin')}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 text-left transition',
                  role === 'admin'
                    ? 'border-saffron-500 bg-white shadow-sm ring-2 ring-saffron-500/20 dark:border-saffron-400 dark:bg-slate-800'
                    : 'border-saffron-200/70 bg-white/60 hover:bg-white dark:border-slate-800 dark:bg-slate-900/50'
                )}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    role === 'admin'
                      ? 'bg-saffron-500 text-white'
                      : 'bg-saffron-100 text-saffron-700 dark:bg-slate-800 dark:text-saffron-400'
                  )}
                >
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Admin</span>
                    {role === 'admin' && <CheckCircle2 className="h-3.5 w-3.5 text-saffron-500" />}
                  </div>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">Platform Control</p>
                </div>
              </button>
            </div>
          </div>

          {/* Form Area */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            )}

            {/* General Information Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Profile Details
                </h2>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs text-saffron-600 hover:text-saffron-800 dark:text-saffron-400 dark:hover:text-saffron-300"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Load {role} Preset
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="demo-name">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
                    <input
                      id="demo-name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="input pl-9"
                      placeholder="e.g. Pandit Rajesh Shastri"
                    />
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="demo-email">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
                    <input
                      id="demo-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input pl-9"
                      placeholder="e.g. pandit@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="demo-phone">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
                    <input
                      id="demo-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="input pl-9"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="demo-city">
                    City / Location
                  </label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-saffron-400" />
                    <input
                      id="demo-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="input pl-9"
                      placeholder="e.g. Varanasi, Uttar Pradesh"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Role Specific Configuration */}
            {role === 'pandit' && (
              <div className="space-y-4 rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                    Vedic Priest Attributes
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="label" htmlFor="pandit-experience">
                      Experience (Years)
                    </label>
                    <div className="relative">
                      <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500" />
                      <input
                        id="pandit-experience"
                        type="number"
                        min={1}
                        max={60}
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(Number(e.target.value))}
                        className="input pl-9"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label" htmlFor="pandit-price">
                      Base Dakshina (₹)
                    </label>
                    <div className="relative">
                      <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500" />
                      <input
                        id="pandit-price"
                        type="number"
                        min={500}
                        step={100}
                        value={basePrice}
                        onChange={(e) => setBasePrice(Number(e.target.value))}
                        className="input pl-9"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label" htmlFor="pandit-languages">
                      Languages Spoken
                    </label>
                    <div className="relative">
                      <Languages className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500" />
                      <input
                        id="pandit-languages"
                        value={languages}
                        onChange={(e) => setLanguages(e.target.value)}
                        className="input pl-9"
                        placeholder="Sanskrit, Hindi, English"
                      />
                    </div>
                  </div>
                </div>

                {/* Specialties Tag Selector */}
                <div>
                  <label className="label">Specialized Poojas & Rituals</label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {AVAILABLE_SPECIALTIES.map((spec) => {
                      const selected = specialties.includes(spec);
                      return (
                        <button
                          key={spec}
                          type="button"
                          onClick={() => toggleSpecialty(spec)}
                          className={cn(
                            'rounded-lg px-2.5 py-1 text-xs font-medium transition',
                            selected
                              ? 'bg-amber-600 text-white shadow-sm dark:bg-amber-500'
                              : 'bg-white border border-amber-200 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-slate-800 dark:text-amber-200'
                          )}
                        >
                          {selected ? '✓ ' : '+ '}
                          {spec}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="pandit-bio">
                    Vedic Lineage & Bio
                  </label>
                  <div className="relative">
                    <textarea
                      id="pandit-bio"
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="input py-2"
                      placeholder="Describe your Vedic education, Acharya degrees, and ritual specializations..."
                    />
                  </div>
                </div>
              </div>
            )}

            {role === 'devotee' && (
              <div className="space-y-4 rounded-xl border border-saffron-200/80 bg-saffron-50/40 p-4 dark:border-saffron-900/30 dark:bg-saffron-950/20">
                <div className="flex items-center gap-2">
                  <CalendarHeart className="h-4 w-4 text-saffron-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-saffron-900 dark:text-saffron-300">
                    Devotee Preferences
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="devotee-gotra">
                      Family Gotra (Optional)
                    </label>
                    <input
                      id="devotee-gotra"
                      value={gotra}
                      onChange={(e) => setGotra(e.target.value)}
                      className="input"
                      placeholder="e.g. Kashyap, Bharadwaj, Vashistha"
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor="devotee-deity">
                      Ishta Devata / Preferred Deity
                    </label>
                    <input
                      id="devotee-deity"
                      value={preferredDeity}
                      onChange={(e) => setPreferredDeity(e.target.value)}
                      className="input"
                      placeholder="e.g. Lord Shiva, Maa Durga, Lord Ganesha"
                    />
                  </div>
                </div>
              </div>
            )}

            {role === 'admin' && (
              <div className="space-y-4 rounded-xl border border-purple-200/80 bg-purple-50/40 p-4 dark:border-purple-900/30 dark:bg-purple-950/20">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
                    Administration Scope
                  </h3>
                </div>

                <div>
                  <label className="label" htmlFor="admin-department">
                    Department / Responsibilities
                  </label>
                  <input
                    id="admin-department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="input"
                    placeholder="e.g. Platform Operations & Pandit Verification"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-purple-800 dark:text-purple-300">
                  <CheckCircle2 className="h-4 w-4 text-purple-600" />
                  <span>Full access granted for managing Pandits, Service Catalog, Users, and Order transactions.</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
              <Link
                to="/login"
                className="btn-secondary order-2 sm:order-1 text-center py-2.5"
              >
                Cancel
              </Link>
              <button
                type="submit"
                id="submit-demo-login"
                disabled={busy}
                className="btn-primary order-1 sm:order-2 flex items-center justify-center gap-2 py-2.5"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Preparing Demo Session…</span>
                  </>
                ) : (
                  <>
                    <span>Enter Workspace as {role === 'devotee' ? 'Devotee' : role === 'pandit' ? 'Pandit' : 'Admin'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
