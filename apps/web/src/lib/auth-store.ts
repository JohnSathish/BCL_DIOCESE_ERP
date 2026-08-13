'use client';

import { create } from 'zustand';
import type { AuthUser } from '@bcl/types';
import { getStoredUser, clearAuth } from '@bcl/auth-client';

interface AuthState {
  user: AuthUser | null;
  hydrated: boolean;
  setUser: (user: AuthUser | null) => void;
  hydrate: () => void;
  logoutLocal: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  setUser: (user) => set({ user }),
  hydrate: () => set({ user: getStoredUser(), hydrated: true }),
  logoutLocal: () => {
    clearAuth();
    set({ user: null });
  },
}));
