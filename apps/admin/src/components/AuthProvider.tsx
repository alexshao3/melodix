'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearAdminToken, getAdminToken, setAdminToken } from '@/lib/api';
import { decodeJwtPayload } from '@/lib/format';

interface AdminIdentity {
  id: string;
  username: string;
}

interface AuthContextValue {
  ready: boolean;
  admin: AdminIdentity | null;
  signIn: (token: string, admin: AdminIdentity) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readIdentityFromStorage(): AdminIdentity | null {
  const token = getAdminToken();
  if (!token) return null;
  const payload = decodeJwtPayload<{
    sub?: string;
    username?: string;
    isAdmin?: boolean;
    exp?: number;
  }>(token);
  if (!payload?.isAdmin || !payload.sub || !payload.username) return null;
  if (payload.exp && payload.exp * 1000 < Date.now()) return null;
  return { id: payload.sub, username: payload.username };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAdmin(readIdentityFromStorage());
    setReady(true);
  }, []);

  const signIn = useCallback((token: string, identity: AdminIdentity) => {
    setAdminToken(token);
    setAdmin(identity);
  }, []);

  const signOut = useCallback(() => {
    clearAdminToken();
    setAdmin(null);
    router.push('/login');
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ ready, admin, signIn, signOut }),
    [ready, admin, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
