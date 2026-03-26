import { createClient, SupabaseClient } from '@supabase/supabase-js';

// This is the single place where the Supabase client is constructed.
// All repositories receive this client via dependency injection.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
