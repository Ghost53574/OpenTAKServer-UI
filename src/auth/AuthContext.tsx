import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import axios, { SESSION_EXPIRED_EVENT, setCsrfToken } from '../axios_config';
import { apiRoutes } from '../apiRoutes';

export interface UserRole {
  id?: number;
  name: string;
  description?: string;
}

export interface CurrentUser {
  id: number;
  username: string;
  email: string | null;
  active: boolean;
  roles: UserRole[];
  token: string;
  [key: string]: unknown;
}

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: CurrentUser | null;
  isAdministrator: boolean;
  refresh: () => Promise<CurrentUser | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const legacyAuthenticationKeys = [
  'administrator',
  'email',
  'emailEnabled',
  'loggedIn',
  'token',
  'username',
];

function clearLegacyAuthenticationState() {
  legacyAuthenticationKeys.forEach((key) => localStorage.removeItem(key));
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<CurrentUser | null>(null);

  const clearSession = useCallback(() => {
    clearLegacyAuthenticationState();
    setCsrfToken();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await axios.get<CurrentUser>(apiRoutes.me);
      clearLegacyAuthenticationState();
      setUser(response.data);
      setStatus('authenticated');
      return response.data;
    } catch {
      clearSession();
      return null;
    }
  }, [clearSession]);

  const logout = useCallback(async () => {
    try {
      await axios.post(apiRoutes.logout);
    } finally {
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onSessionExpired = () => clearSession();
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAdministrator: user?.roles.some((role) => role.name === 'administrator') ?? false,
      refresh,
      logout,
    }),
    [logout, refresh, status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
