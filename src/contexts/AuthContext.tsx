// A importação do OfflineService foi REMOVIDA daqui.

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: Profile['role'],
    registrationNumber: string
  ) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Pega a sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Ouve mudanças na autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    // 3. Limpa o listener
    return () => subscription.unsubscribe();
  }, []);

  // `loadProfile` com .maybeSingle()
  const loadProfile = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      
      setProfile(data);
      
      // A chamada ao OfflineService foi REMOVIDA daqui.
      // Ela já está corretamente no StudentDashboard.tsx

    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // --- CORREÇÃO PRINCIPAL ---
  // Esta função agora passa os dados para o Gatilho (Trigger) do Supabase
  // em vez de tentar um 'insert' manual.
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: Profile['role'],
    registrationNumber: string
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Os dados são enviados aqui para o Gatilho
          data: {
            full_name: fullName,
            role: role,
            registration_number: registrationNumber,
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('User creation failed');

      // A etapa "2. Cria o perfil no 'public.profiles'" foi REMOVIDA.
      // O Gatilho no SQL agora cuida disso.

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };
  // --- FIM DA CORREÇÃO ---

  // `signIn` está perfeito.
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // `signOut` está perfeito.
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, session, loading, signUp, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// `useAuth` com verificação de contexto é perfeito.
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}