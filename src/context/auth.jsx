import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, onSessionExpired } from '../api/index.js';
import { allowed } from '../lib/permissions.js';

const Ctx = createContext(null);

/**
 * Session state comes from GET /auth/me (cookies hold the tokens; nothing is kept in localStorage).
 * `permissions` is the server's effective list, so what the UI shows always matches what the API will allow.
 */
export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [state, setState] = useState({ status: 'loading', user: null, permissions: [] });

  const load = useCallback(async () => {
    try {
      const { data } = await api.auth.me();
      setState({ status: 'authenticated', user: data.user, permissions: data.permissions });
      return data;
    } catch {
      setState({ status: 'anonymous', user: null, permissions: [] });
      return null;
    }
  }, []);

  useEffect(() => { onSessionExpired(() => { qc.clear(); setState({ status: 'anonymous', user: null, permissions: [] }); }); load(); }, [load, qc]);

  const login = useCallback(async (identifier, password) => { await api.auth.login(identifier, password); qc.clear(); return load(); }, [load, qc]);
  const logout = useCallback(async () => { try { await api.auth.logout(); } finally { qc.clear(); setState({ status: 'anonymous', user: null, permissions: [] }); } }, [qc]);
  const can = useCallback((rule) => allowed(rule, { role: state.user?.role, permissions: state.permissions }), [state.user, state.permissions]);

  const value = useMemo(() => ({ ...state, role: state.user?.role, login, logout, reload: load, can }), [state, login, logout, load, can]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
