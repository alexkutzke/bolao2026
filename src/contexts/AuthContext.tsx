import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile, Bolao } from '../types';

interface AppContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  boloes: Bolao[];
  activeBolao: Bolao | null;
  setActiveBolao: (bolao: Bolao) => void;
  refreshBoloes: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [boloes, setBoloes] = useState<Bolao[]>([]);
  const [activeBolao, setActiveBolaoState] = useState<Bolao | null>(null);

  const fetchBoloes = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('bolao_members')
      .select('bolao_id, boloes(*)')
      .eq('user_id', user.id);
    if (data) {
      const list = data.map((d: unknown) => (d as { boloes: Bolao }).boloes);
      setBoloes(list);
      // Set first bolão as active if none selected
      if (list.length > 0) {
        const currentActive = list.find((b) => b.id === activeBolao?.id);
        if (!currentActive) {
          setActiveBolaoState(list[0]);
        }
      }
    }
  }, [user, activeBolao?.id]);

  useEffect(() => {
    // Handle magic link / password recovery: Supabase auto-detects token on getSession()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        // Clean up hash so HashRouter works normally
        if (window.location.hash.includes('access_token=')) {
          window.location.hash = '/';
        }
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setBoloes([]);
        setActiveBolaoState(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) fetchBoloes();
  }, [user, fetchBoloes]);

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) console.warn('Profile fetch error:', error.message);

    if (!data) {
      const { data: authData } = await supabase.auth.getUser();
      const email = authData.user?.email;
      if (email) {
        const { data: newProfile } = await supabase
          .from('profiles')
          .upsert({ id: userId, email, name: email.split('@')[0], is_admin: false })
          .select()
          .maybeSingle();
        setProfile(newProfile);
        setLoading(false);
        return;
      }
    }

    setProfile(data);
    setLoading(false);
  }

  function setActiveBolao(bolao: Bolao) {
    setActiveBolaoState(bolao);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setBoloes([]);
    setActiveBolaoState(null);
  }

  return (
    <AppContext.Provider value={{ user, profile, loading, signIn, signOut, boloes, activeBolao, setActiveBolao, refreshBoloes: fetchBoloes }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

// Backward-compatible alias
export const useAuth = useApp;
export const AuthProvider = AppProvider;
