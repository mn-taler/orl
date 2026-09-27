import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../../config.public.js';

export function getSupabaseUrl() {
  return String(SUPABASE_URL || '').replace(/\/$/, '');
}

export function getSupabaseAnonKey() {
  return String(SUPABASE_ANON_KEY || '');
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}
