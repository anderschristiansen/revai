import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Create a response object that we'll manipulate
  const res = NextResponse.next()
  
  // Create a Supabase client with the request and response
  const supabase = createMiddlewareClient({ req, res })

  try {
    // Get the session, this will also refresh it if needed
    const {
      data: { session },
      error
    } = await supabase.auth.getSession()

    if (error) {
      console.error('Error in middleware auth check:', error.message)
    }

    // Debug log to see if we're getting a session
    console.log(`Middleware path: ${req.nextUrl.pathname}, auth: ${!!session}`)

    // Protected routes check
    if (!session) {
      // User is not authenticated and trying to access protected route
      if (req.nextUrl.pathname.startsWith('/review') || req.nextUrl.pathname === '/sessions') {
        console.log('Redirecting unauthenticated user to login')
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/login'
        redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
      }
    } else {
      // User is authenticated but trying to access auth routes
      if (req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/signup')) {
        console.log('Redirecting authenticated user from auth page')
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/'
        return NextResponse.redirect(redirectUrl)
      }
    }

    return res
  } catch (e) {
    console.error('Unexpected error in middleware:', e)
    return res
  }
}

export const config = {
  matcher: ['/review/:path*', '/sessions', '/login', '/signup'],
} 