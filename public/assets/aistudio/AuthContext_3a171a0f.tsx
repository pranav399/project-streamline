import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { firebaseClient, type Profile, type Role, type PanditProfile } from '../lib/firebase';

export interface UserSession {
  user: {
    id: string;
    email: string;
  };
  access_token: string;
}

interface AuthState {
  session: UserSession | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password?: string) => Promise<{ error: string | null }>;
  signInWithGoogle: (preferredRole?: Role) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role: Role, phone?: string) => Promise<{ error: string | null }>;
  demoLogin: (params: {
    role: Role;
    fullName: string;
    email: string;
    phone?: string;
    city?: string;
    panditDetails?: Partial<PanditProfile>;
  }) => Promise<{ error: string | null }>;
  sendOTP: (email: string) => Promise<{ success: boolean; message: string; simulated?: boolean; simulatedOtp?: string }>;
  verifyOTP: (email: string, otp: string) => Promise<{ success: boolean; message: string }>;
  changePassword: (newPassword: string, oldPassword?: string) => Promise<{ error: string | null }>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; message: string; simulatedOtp?: string }>;
  resetPasswordWithOtp: (email: string, otp: string, newPass: string) => Promise<{ success: boolean; message: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string, userEmail?: string) => {
    let { data } = await firebaseClient
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (!data && userEmail) {
      const { data: byEmail } = await firebaseClient
        .from('profiles')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle();
      data = byEmail;
    }

    if (data) {
      setProfile(data as Profile);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    firebaseClient.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id, data.session.user.email).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = firebaseClient.auth.onAuthStateChange((_event, sess) => {
      (async () => {
        setSession(sess);
        setProfile(null);
        if (sess?.user) {
          await loadProfile(sess.user.id, sess.user.email);
        }
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password?: string) => {
    const { error } = await firebaseClient.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  }, []);

  const signInWithGoogle = useCallback(async (preferredRole: Role = 'devotee') => {
    const { error } = await firebaseClient.auth.signInWithGoogle(undefined, preferredRole);
    return { error: error ? error.message : null };
  }, []);

  const sendOTP = useCallback(async (email: string) => {
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, message: data.message || 'Failed to send OTP email.' };
      }
      return {
        success: true,
        message: data.message,
        simulated: data.simulated,
        simulatedOtp: data.simulatedOtp,
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error while requesting OTP.' };
    }
  }, []);

  const verifyOTP = useCallback(async (email: string, otp: string) => {
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, message: data.message || 'OTP verification failed.' };
      }

      // Automatically sign in the user upon successful OTP verification
      const loginRes = await signIn(email);
      if (loginRes.error) {
        return { success: false, message: loginRes.error };
      }

      return { success: true, message: 'OTP verified and logged in successfully!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error during verification.' };
    }
  }, [signIn]);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string, role: Role, phone = '') => {
      const { data, error } = await firebaseClient.auth.signUp({
        email,
        password,
        options: { 
          data: { 
            full_name: fullName, 
            role, 
            phone 
          } 
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (!data.user) {
        return { error: 'Account created, but user details could not be retrieved.' };
      }

      // Upsert profile in Firestore
      const { error: profileError } = await firebaseClient.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        phone,
        role,
        updated_at: new Date().toISOString()
      });

      if (profileError) {
        console.warn('Profile upsert warning:', profileError.message);
      }

      // If user registered as pandit, create initial pandit profile
      if (role === 'pandit') {
        await firebaseClient.from('pandit_profiles').upsert({
          user_id: data.user.id,
          bio: '',
          languages: ['Hindi', 'English'],
          specialties: ['General Pooja'],
          experience_years: 1,
          city: '',
          base_price: 1100,
          rating: 5.0,
          review_count: 0,
          is_verified: false,
          is_available: true,
          total_earnings: 0,
          completed_bookings: 0
        });
      }

      return { error: null };
    },
    []
  );

  const demoLogin = useCallback(
    async (params: {
      role: Role;
      fullName: string;
      email: string;
      phone?: string;
      city?: string;
      panditDetails?: Partial<PanditProfile>;
    }) => {
      const { data, error } = await firebaseClient.auth.demoSignInWithCustomDetails(params);
      if (error) {
        return { error: error.message };
      }
      if (data?.profile) {
        setProfile(data.profile);
        setSession(data.session);
        setLoading(false);
      } else if (data?.user?.id) {
        await loadProfile(data.user.id, data.user.email);
        setLoading(false);
      }
      return { error: null };
    },
    [loadProfile]
  );

  const changePassword = useCallback(async (newPassword: string, oldPassword?: string) => {
    const { error } = await firebaseClient.auth.updatePassword(newPassword, oldPassword);
    return { error: error ? error.message : null };
  }, []);

  const signOut = useCallback(async () => {
    await firebaseClient.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, signIn, signInWithGoogle, signUp, demoLogin, sendOTP, verifyOTP, changePassword, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
