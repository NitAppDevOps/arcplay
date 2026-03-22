import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

/** Authentication state shape */
interface IAuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
}

/** Global auth store — holds Supabase session and user state */
export const useAuthStore = create<IAuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,

  /** Sets the active session and derives user and isAuthenticated from it */
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      isAuthenticated: session !== null,
      isLoading: false,
    }),

  /** Sets the loading state */
  setLoading: (isLoading) => set({ isLoading }),

  /** Clears all auth state on sign out */
  clearAuth: () =>
    set({
      session: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}));