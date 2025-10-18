import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { auth as firebaseAuth } from '@/firebase/config';
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
  lastToken?: string | null;
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
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [events, setEvents] = useState<TokenEvent[]>([]);

  const addEvent = useCallback((e: TokenEvent) => {
    setEvents((s) => [e, ...s].slice(0, 50));
  }, []);

  // get fresh id token; if force true, force refresh
  const getFreshIdToken = useCallback(async (opts?: { force?: boolean }) => {
    try {
      const auth = (firebaseAuth as any) ?? null;
      const current = auth?.currentUser ?? null;
      if (!current) {
        addEvent({ time: new Date().toISOString(), type: 'getIdToken', message: 'no-user' });
        return null;
      }

      addEvent({ time: new Date().toISOString(), type: 'getIdToken.start', message: String(!!opts?.force) });
      const token = await current.getIdToken(!!opts?.force);
      setLastToken(token);
      addEvent({ time: new Date().toISOString(), type: 'getIdToken.ok', message: opts?.force ? 'forced' : 'cached' });
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

      const unsubId = auth.onIdTokenChanged(async (u: FirebaseUser | null) => {
        setUser(u);
        addEvent({ time: new Date().toISOString(), type: 'onIdTokenChanged', message: u ? u.uid : 'signed-out' });
        if (u) {
          try {
            const token = await u.getIdToken();
            setLastToken(token);
            addEvent({ time: new Date().toISOString(), type: 'token.update', message: 'updated' });
          } catch (e: any) {
            addEvent({ time: new Date().toISOString(), type: 'token.update.err', message: String(e?.message ?? e) });
          }
        } else {
          setLastToken(null);
        }
      });

      // AppState listener for silent refresh on resume
      const sub = AppState.addEventListener('change', (s) => {
        if (s === 'active') {
          // try to refresh token when app comes to foreground
          (async () => {
            try {
              const auth = (firebaseAuth as any) ?? null;
              const u = auth?.currentUser ?? null;
              if (u) {
                addEvent({ time: new Date().toISOString(), type: 'AppState.active', message: 'refreshing' });
                await u.getIdToken(true);
                addEvent({ time: new Date().toISOString(), type: 'AppState.active', message: 'refresh.ok' });
              }
            } catch (e: any) {
              addEvent({ time: new Date().toISOString(), type: 'AppState.active.err', message: String(e?.message ?? e) });
            }
          })();
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

  const value = useMemo(() => ({ user, loading, getFreshIdToken, lastToken, events, addEvent }), [user, loading, getFreshIdToken, lastToken, events, addEvent]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
