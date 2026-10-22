import { create } from 'zustand';
import { User, Company, UserRole, MembershipPermissions } from '../types/index.js';
import { authApi } from '../api/index.js';

interface AuthState {
  user: User | null;
  company: Company | null;
  role: UserRole | null;
  permissions: MembershipPermissions | null;
  availableCompanies: Array<{ id: string; name: string; slug: string; role: UserRole }>;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (data: {
    user: User;
    company: Company;
    role: UserRole;
    permissions: MembershipPermissions;
    accessToken: string;
    refreshToken?: string;
    availableCompanies?: any[];
  }) => void;
  updateCompany: (company: Company) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  company: null,
  role: null,
  permissions: null,
  availableCompanies: [],
  accessToken: localStorage.getItem('auth_access_token'),
  isAuthenticated: !!localStorage.getItem('auth_access_token'),
  isLoading: true,

  setAuth: (data) => {
    localStorage.setItem('auth_access_token', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('auth_refresh_token', data.refreshToken);
    }
    set({
      user: data.user,
      company: data.company,
      role: data.role,
      permissions: data.permissions,
      availableCompanies: data.availableCompanies || [],
      accessToken: data.accessToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  updateCompany: (company) => set({ company }),
  updateUser: (updated) =>
    set((state) => ({ user: state.user ? { ...state.user, ...updated } : null })),

  logout: async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // Ignore network errors on logout
    }
    localStorage.removeItem('auth_access_token');
    localStorage.removeItem('auth_refresh_token');
    set({
      user: null,
      company: null,
      role: null,
      permissions: null,
      availableCompanies: [],
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
    window.location.href = '/login';
  },

  initAuth: async () => {
    const token = localStorage.getItem('auth_access_token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const res = await authApi.getMe();
      const { user, company, role, permissions, availableCompanies } = res.data.data;
      set({
        user,
        company,
        role,
        permissions,
        availableCompanies: availableCompanies || [],
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      localStorage.removeItem('auth_access_token');
      localStorage.removeItem('auth_refresh_token');
      set({
        user: null,
        company: null,
        role: null,
        permissions: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
