'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/sonner'

type AuthContextType = {
  user: User | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Display toast when error state changes
  useEffect(() => {
    if (error) {
      toast.error(error)
    }
  }, [error])

  useEffect(() => {
    // Initial user fetch - use getUser() which is more secure
    const fetchUser = async () => {
      try {
        // Get authenticated user - this validates with the Supabase Auth server
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          if (!error.message.includes('Auth session missing')) {
            console.error('Error fetching user:', error.message);
          }
          setUser(null);
        } else {
          setUser(user);
        }
      } catch (error) {
        console.error('Error in auth fetch:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Add a small delay to allow cookies to be properly set
        setTimeout(async () => {
          // Fetch the user securely after sign-in or token refresh
          try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) {
              if (!error.message.includes('Auth session missing')) {
                console.error('Error fetching user after auth state change:', error.message);
              }
              setUser(null);
            } else {
              setUser(user);
              // Show success toast on successful login
              toast.success('Successfully signed in');
            }
          } catch (error) {
            console.error('Error in auth state change handler:', error);
            setUser(null);
          } finally {
            setLoading(false);
          }
        }, 300);  // Small delay to allow cookie propagation
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
        // Show success toast on logout
        toast.info('You have been signed out');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const clearError = () => setError(null);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        // Handle specific auth errors
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please confirm your email before logging in.');
        } else {
          setError(`Login failed: ${error.message}`);
        }
        setLoading(false);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setError(`An unexpected error occurred: ${message}`);
      setLoading(false);
    }
  }

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        // Handle specific signup errors
        if (error.message.includes('already registered')) {
          setError('This email is already registered. Try logging in instead.');
        } else if (error.message.includes('password')) {
          setError(`Password issue: ${error.message}`);
        } else {
          setError(`Sign up failed: ${error.message}`);
        }
        setLoading(false);
      } else {
        // Show success toast on successful signup
        toast.success('Account created! Please check your email to confirm your account.');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setError(`An unexpected error occurred: ${message}`);
      setLoading(false);
    }
  }

  const signOut = async () => {
    setError(null);
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setError(`Sign out failed: ${error.message}`);
      }
    } catch (error: unknown) {
      console.error('Error signing out:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setError(`An unexpected error occurred while signing out: ${message}`);
      throw error;
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error,
      signIn, 
      signUp, 
      signOut,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 