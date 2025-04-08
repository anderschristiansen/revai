import { createBrowserClient } from '@supabase/ssr';
import { type SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validation
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required Supabase environment variables');
}

// Store the client instance for reuse - use global to prevent module re-initialization
// Using interface merging to properly type global browser client
declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    __supabaseClient: SupabaseClient | undefined;
  }
}

/**
 * Get a Supabase client for browser usage with proper SSR support
 */
export function getSupabaseClient() {
  if (typeof window === 'undefined') {
    // Always create a new instance on the server to avoid sharing state
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  
  // Reuse the client instance on the client-side using global window property
  // This prevents multiple instances when module gets re-evaluated
  if (!window.__supabaseClient) {
    window.__supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  
  return window.__supabaseClient;
}

// Export a singleton instance for direct usage
export const supabase = getSupabaseClient();

// For admin operations (server-side only)
export function getSupabaseAdmin() {
  if (typeof window !== 'undefined') {
    console.warn('Admin client should only be used server-side');
  }
  
  if (!supabaseServiceRoleKey) {
    console.error('Missing Supabase Service Role Key');
    throw new Error('Missing admin credentials');
  }
  
  return createBrowserClient(supabaseUrl, supabaseServiceRoleKey);
}

// For backward compatibility
export const supabaseServer = typeof window === 'undefined' 
  ? getSupabaseAdmin() 
  : supabase;
