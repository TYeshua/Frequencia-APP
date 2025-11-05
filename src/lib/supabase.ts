import { createClient } from '@supabase/supabase-js';

// --- ESTA LINHA É A CORREÇÃO ---
// O nome do arquivo deve ser exatamente './database.types.ts' (minúsculo)
// para corresponder ao nome do seu arquivo.
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// O <Database> aqui injeta os tipos no cliente 'supabase'
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});