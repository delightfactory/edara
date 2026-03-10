import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Check .env.local file.')
}

/**
 * Supabase client.
 * We intentionally skip the Database generic to avoid strict type inference
 * issues with the v2 client's Insert/Update type inference engine.
 * Type safety is enforced at the service layer via explicit return casts.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
})
