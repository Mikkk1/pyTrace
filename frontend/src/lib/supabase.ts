// PyTrace — Supabase client singleton.
// Reads credentials from Vite env vars set at build time.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Lazily-created Supabase client.
 * Returns null when env vars are not configured (e.g., running without Supabase).
 */
let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey) return null;
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseKey);
  }
  return _client;
}
