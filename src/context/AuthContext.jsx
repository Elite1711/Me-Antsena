import { createContext, useContext, useEffect, useMemo, useState } from 'react';
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

  const loadProfile = async (authUser) => {
    if (!authUser) { setUser(null); return null; }
    const { data, error } = await supabase.from('profiles').select('id,first_name,last_name,email,phone,role,status').eq('id', authUser.id).single();
    if (error) { setUser(null); return null; }
    if (data.status !== 'active') { await supabase.auth.signOut(); setUser(null); return null; }
    const mapped = mapUser(data);
    setUser(mapped);
    return mapped;
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => { if (mounted) await loadProfile(data.session?.user ?? null); if (mounted) setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => { if (mounted) await loadProfile(session?.user ?? null); });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  const login = async ({ email, password }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect' : error.message);
      return await loadProfile(data.user);
    } finally { setLoading(false); }
  };

  const register = async (form) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(), password: form.password,
        options: { data: { first_name: form.firstName.trim(), last_name: form.lastName.trim(), phone: form.phone?.trim() || '' } }
      });
      if (error) throw new Error(error.message);
      if (!data.session) throw new Error('Compte créé. Vérifiez votre email pour confirmer votre compte avant de vous connecter.');
      await loadProfile(data.user);
    } finally { setLoading(false); }
  };

  const updateProfile = async (patch) => {
    const [firstName, ...rest] = (patch.name || user.name || '').trim().split(' ');
    const { data, error } = await supabase.from('profiles').update({ first_name: firstName || user.firstName, last_name: rest.join(' ') || user.lastName, phone: patch.phone ?? user.phone }).eq('id', user.id).select('id,first_name,last_name,email,phone,role,status').single();
    if (error) throw new Error(error.message);
    const next = mapUser(data); setUser(next); return next;
  };

  const logout = async () => { await supabase.auth.signOut(); setUser(null); };
  const value = useMemo(() => ({ user, loading, login, register, updateProfile, logout, isAuthenticated: !!user, isAdmin: user?.role === 'admin' }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
