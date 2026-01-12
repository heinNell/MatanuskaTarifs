import { createClient } from '@supabase/supabase-js'

const supabaseUrl: string = (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey: string = (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_SUPABASE_ANON_KEY ?? 'placeholder-key'

if (supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn('Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export default supabase
