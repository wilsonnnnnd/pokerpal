import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { AppState } from 'react-native';
import { auth as firebaseAuth } from '@/firebase/config';
import { getFreshIdToken as sharedGetFreshIdToken, clearCachedToken } from '@/services/authToken';
import type { User as FirebaseUser } from 'firebase/auth';

type TokenEvent = {
  time: string;
  type: string;
  message?: string;
};

export type AuthContextValue = {
  user: FirebaseUser | null;
  loading: boolean;
  getFreshIdToken: (opts?: { force?: boolean }) => Promise<string | null>;
  events: TokenEvent[];
  addEvent: (e: TokenEvent) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  // internal token cache is handled by shared authToken module
  const [events, setEvents] = useState<TokenEvent[]>([]);

  const addEvent = useCallback((e: TokenEvent) => {
    setEvents((s) => [e, ...s].slice(0, 50));
  }, []);

  // get fresh id token; if force true, force refresh
  const getFreshIdToken = useCallback(async (opts?: { force?: boolean }) => {
    try {
      addEvent({ time: new Date().toISOString(), type: 'getIdToken.start', message: String(!!opts?.force) });
      const token = await sharedGetFreshIdToken(opts);
      addEvent({ time: new Date().toISOString(), type: token ? 'getIdToken.ok' : 'getIdToken.no-user', message: opts?.force ? 'forced' : 'fetched' });
      return token;
    } catch (err: any) {
      addEvent({ time: new Date().toISOString(), type: 'getIdToken.err', message: String(err?.message ?? err) });
      return null;
    }
  }, [addEvent]);

  useEffect(() => {
    // subscribe to auth changes
    try {
      const auth = (firebaseAuth as any) ?? null;
      if (!auth) {
        // no auth subsystem
        setLoading(false);
        addEvent({ time: new Date().toISOString(), type: 'auth.init', message: 'no-auth' });
        return;
      }

      const unsubAuth = auth.onAuthStateChanged((u: FirebaseUser | null) => {
        setUser(u);
        setLoading(false);
        addEvent({ time: new Date().toISOString(), type: 'onAuthStateChanged', message: u ? u.uid : 'signed-out' });
      });

      // When id token change is signalled, update user but do NOT fetch token automatically.
      // This makes token retrieval on-demand: callers should call getFreshIdToken() when they need the token.
      const unsubId = auth.onIdTokenChanged((u: FirebaseUser | null) => {
        setUser(u);
        addEvent({ time: new Date().toISOString(), type: 'onIdTokenChanged', message: u ? u.uid : 'signed-out' });
        // Clear shared cache so consumers will fetch explicitly when needed
        clearCachedToken();
      });

      // AppState listener kept only for visibility; do NOT auto-refresh tokens on resume (on-demand)
      const sub = AppState.addEventListener('change', (s) => {
        if (s === 'active') {
          addEvent({ time: new Date().toISOString(), type: 'AppState.active', message: 'foreground-no-refresh' });
        }
      });

      return () => {
        try { unsubAuth(); } catch (e) { /* ignore */ }
        try { unsubId(); } catch (e) { /* ignore */ }
        try { sub.remove(); } catch (e) { /* ignore */ }
      };
    } catch (e) {
      setLoading(false);
      addEvent({ time: new Date().toISOString(), type: 'auth.init.err', message: String(e) });
    }
  }, [addEvent]);

  const value = useMemo(() => ({ user, loading, getFreshIdToken, events, addEvent }), [user, loading, getFreshIdToken, events, addEvent]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
