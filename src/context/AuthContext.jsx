import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

function mapUser(u) {
  if (!u) return null;
  const meta = u.user_metadata || {};
  return {
    id: u.id,
    firstName: u.first_name ?? meta.first_name ?? '',
    lastName: u.last_name ?? meta.last_name ?? '',
    name: `${u.first_name ?? meta.first_name ?? ''} ${u.last_name ?? meta.last_name ?? ''}`.trim(),
    email: u.email,
    phone: u.phone ?? meta.phone ?? '',
    role: u.role ?? 'user',
    status: u.status ?? 'active'
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyUser = useCallback((nextUser) => {
    if (nextUser) {
      setUser(nextUser);
      return nextUser;
    }
    setUser(null);
    return null;
  }, []);

  const loadProfile = useCallback(async (authUser) => {
    if (!authUser) {
      applyUser(null);
      return null;
    }

    try {
      const { data, error } = await supabase.from('profiles').select('id,first_name,last_name,email,phone,role,status').eq('id', authUser.id).single();
      if (error) {
        applyUser(null);
        return null;
      }

      const statusRaw = (data.status || '').toString();
      const statusNorm = statusRaw.trim().toLowerCase();
      const activeValues = new Set(['active', 'actif']);
      if (statusRaw && !activeValues.has(statusNorm)) {
        return { suspended: true, status: data.status };
      }

      const mapped = mapUser(data);
      applyUser(mapped);
      return mapped;
    } catch {
      applyUser(null);
      return null;
    }
  }, [applyUser]);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data.session?.user) {
          const result = await loadProfile(data.session.user);
          if (result && result.suspended) {
            try { await supabase.auth.signOut(); } catch { /* keep the session cleared when the profile is blocked */ }
            applyUser(null);
          }
        } else {
          applyUser(null);
        }
      } catch {
        if (mounted) applyUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    restoreSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        const result = await loadProfile(session.user);
        if (result && result.suspended) {
          try { await supabase.auth.signOut(); } catch { /* keep the blocked account signed out */ }
          applyUser(null);
        }
      } else {
        applyUser(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [applyUser, loadProfile]);

  const login = useCallback(async ({ email, password }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect' : error.message);
      const userProfile = await loadProfile(data.user);
      if (userProfile && userProfile.suspended) {
        try { await supabase.auth.signOut(); } catch { /* silently clear a blocked session */ }
        throw new Error("Votre compte est suspendu. Veuillez contacter l'administrateur pour continuer.");
      }
      if (!userProfile) throw new Error('Session introuvable');
      return userProfile;
    } finally { setLoading(false); }
  }, [loadProfile]);

  const register = useCallback(async (form) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(), password: form.password,
        options: { data: { first_name: form.firstName.trim(), last_name: form.lastName.trim(), phone: form.phone?.trim() || '' } }
      });
      if (error) throw new Error(error.message);
      if (!data.session) throw new Error('Compte créé. Vérifiez votre email pour confirmer votre compte avant de vous connecter.');
      const userProfile = await loadProfile(data.user);
      if (!userProfile) throw new Error('Impossible de restaurer la session');
      return userProfile;
    } finally { setLoading(false); }
  }, [loadProfile]);

  const updateProfile = useCallback(async (patch) => {
    if (!user) return null;
    const [firstName, ...rest] = (patch.name || user.name || '').trim().split(' ');
    const { data, error } = await supabase.from('profiles').update({ first_name: firstName || user.firstName, last_name: rest.join(' ') || user.lastName, phone: patch.phone ?? user.phone }).eq('id', user.id).select('id,first_name,last_name,email,phone,role,status').single();
    if (error) throw new Error(error.message);
    const next = mapUser(data);
    applyUser(next);
    return next;
  }, [applyUser, user]);

  const logout = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch { /* keep the local session state consistent */ }
    applyUser(null);
  }, [applyUser]);

  const value = useMemo(() => ({ user, loading, login, register, updateProfile, logout, isAuthenticated: !!user, isAdmin: user?.role === 'admin' }), [user, loading, login, logout, register, updateProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
