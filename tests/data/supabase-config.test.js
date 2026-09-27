import { describe, expect, it } from 'vitest';
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from '../../src/data/supabase/config.js';

describe('supabase config', () => {
  it('should be configured only when url and anon key are both set', () => {
    expect(isSupabaseConfigured()).toBe(Boolean(getSupabaseUrl() && getSupabaseAnonKey()));
  });
});
