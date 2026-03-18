// This file sets up the Supabase client with realtime configuration
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY environment variables. Check your .env file.');
}

// In development, route through Vite proxy to bypass DNS resolution issues.
// The SDK appends /rest/v1/... to this base, and the proxy forwards it server-side.
const effectiveUrl = import.meta.env.DEV
  ? `http://localhost:${import.meta.env.VITE_PORT || '8080'}/api/supabase`
  : SUPABASE_URL;

export const supabase = createClient<Database>(effectiveUrl, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
});