// Shared auth check for API route handlers.
// Extracts the Supabase access token from the Authorization header and
// validates it. Returns the authenticated user or null.

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest } from 'next';
import type { User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Validate the request's Authorization header against Supabase.
 * Returns the authenticated User, or null if the token is missing/invalid.
 */
export async function getAuthUser(req: NextApiRequest): Promise<User | null> {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;

  // Create a per-request client so the global singleton isn't mutated
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
