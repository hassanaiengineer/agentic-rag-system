import { create } from 'zustand';
import { AuthUser, fetchMe, loginRequest, registerRequest } from '../services/auth';
import { clearToken, getToken, setToken } from '../services/apiClient';

interface AuthState {
  user: AuthUser | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'loading',

  login: async (email, password) => {
    const res = await loginRequest(email, password);
    setToken(res.access_token);
    set({ user: res.user, status: 'authenticated' });
  },

  register: async (email, password, name) => {
    const res = await registerRequest(email, password, name);
    setToken(res.access_token);
    set({ user: res.user, status: 'authenticated' });
  },

  logout: () => {
    clearToken();
    set({ user: null, status: 'unauthenticated' });
  },

  initialize: async () => {
    if (!getToken()) {
      set({ status: 'unauthenticated' });
      return;
    }
    try {
      const user = await fetchMe();
      set({ user, status: 'authenticated' });
    } catch {
      clearToken();
      set({ user: null, status: 'unauthenticated' });
    }
  },
}));
