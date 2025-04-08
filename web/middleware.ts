import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    // Create a Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return request.cookies.get(name)?.value
          },
          set(name, value, options) {
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name, options) {
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // Get session (needed for middleware)
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError.message);
      return response;
    }
    
    const session = sessionData.session;

    // Also get user for better security
    let authenticatedUser = null;
    if (session) {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userError) {
        authenticatedUser = userData.user;
      } else {
        console.error('User verification error:', userError.message);
        // If user verification fails, treat as not authenticated
        return response;
      }
    }
    
    // Protected routes check
    if (!authenticatedUser) {
      // User is not authenticated and trying to access protected route
      if (request.nextUrl.pathname.startsWith('/review') || request.nextUrl.pathname === '/sessions') {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/login'
        redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
      }
    } else {
      // User is authenticated but trying to access auth routes
      if (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup')) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/'
        return NextResponse.redirect(redirectUrl)
      }
    }

    return response
  } catch (e) {
    console.error('Unexpected error in middleware:', e)
    return response
  }
}

export const config = {
  matcher: ['/review/:path*', '/sessions', '/login', '/signup'],
} 