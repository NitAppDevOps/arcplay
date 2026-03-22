import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';
import { useAuthStore } from '@store/authStore';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

/** Supabase client instance — single instance used across the entire app */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Initialises auth state from persisted session and listens for changes */
export const initSupabaseAuth = (): (() => void) => {
  const { setSession, setLoading } = useAuthStore.getState();

  setLoading(true);

  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
  });

  // Listen for auth state changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setSession(session);
    }
  );

  // Return cleanup function
  return () => subscription.unsubscribe();
};

/** Signs up a new user with email and password */
export const signUpWithEmail = async (
  email: string,
  password: string,
  fullName: string,
  username: string
): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username,
        },
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: 'An unexpected error occurred. Please try again.' };
  }
};

/** Signs in an existing user with email and password */
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: 'An unexpected error occurred. Please try again.' };
  }
};

/** Signs in with Google OAuth */
export const signInWithGoogle = async (): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'arcplay://auth/callback',
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: 'An unexpected error occurred. Please try again.' };
  }
};

/** Signs out the current user */
export const signOut = async (): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { error: error.message };
    useAuthStore.getState().clearAuth();
    return { error: null };
  } catch (err) {
    return { error: 'An unexpected error occurred. Please try again.' };
  }
};