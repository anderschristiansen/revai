import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables', { 
    urlExists: !!supabaseUrl, 
    keyExists: !!supabaseAnonKey 
  });
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: {
        // This configures Supabase Auth to use cookies instead of localStorage
        getItem: (key) => {
          if (typeof document === 'undefined') return null
          
          const cookieString = document.cookie
            .split('; ')
            .find(row => row.startsWith(`${key}=`))
          
          return cookieString ? cookieString.split('=')[1] : null
        },
        
        setItem: (key, value) => {
          if (typeof document === 'undefined') return
          
          document.cookie = `${key}=${value}; path=/; max-age=2592000; SameSite=Lax; secure`
        },
        
        removeItem: (key) => {
          if (typeof document === 'undefined') return
          
          document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; secure`
        }
      }
    }
  }
); 