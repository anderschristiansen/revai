import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase public environment variables', {
    urlExists: !!supabaseUrl,
    keyExists: !!supabaseAnonKey,
  });
}

if (!supabaseServiceRoleKey && typeof window === 'undefined') {
  console.error('Missing Supabase Service Role Key for server-side');
}

// =============================
// Create public client (frontend)
// =============================
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: {
        getItem: (key) => {
          if (typeof document === 'undefined') return null;

          const cookieString = document.cookie
            .split('; ')
            .find(row => row.startsWith(`${key}=`));

          return cookieString ? cookieString.split('=')[1] : null;
        },
        setItem: (key, value) => {
          if (typeof document === 'undefined') return;
          document.cookie = `${key}=${value}; path=/; max-age=2592000; SameSite=Lax; secure`;
        },
        removeItem: (key) => {
          if (typeof document === 'undefined') return;
          document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; secure`;
        },
      },
    },
  }
);

// =============================
// Create server-side client (backend trusted)
// =============================
export const supabaseServer = createClient(
  supabaseUrl || '',
  supabaseServiceRoleKey || ''
);

// =============================
// Utility: Auto pick client
// =============================
/**
 * Picks the correct Supabase client depending on environment
 * - In the browser (client-side), uses public anon client
 * - In server (API route, cron, edge), uses service role client
 */
export const getSupabase = () => {
  if (typeof window === 'undefined') {
    // Server-side
    return supabaseServer;
  } else {
    // Client-side (browser)
    return supabase;
  }
};
