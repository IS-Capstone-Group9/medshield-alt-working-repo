import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = new Set(['/login'])

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  const path = request.nextUrl.pathname
  const isPublicRoute = PUBLIC_ROUTES.has(path)

  const isConfigured = Boolean(
    supabaseUrl &&
      supabaseKey &&
      supabaseKey.trim() !== '' &&
      !supabaseKey.includes('replace-with')
  )

  if (!isConfigured) {
    const token = request.cookies.get('medshield.accessToken')?.value
    if (!token && !isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    if (token && isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
      },
    },
  })

  // Helper to construct redirect responses that preserve updated/cleared cookies and security headers
  const createRedirectResponse = (targetPath: string) => {
    const url = request.nextUrl.clone()
    url.pathname = targetPath
    const redirectResponse = NextResponse.redirect(url)

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    response.headers.forEach((value, key) => {
      redirectResponse.headers.set(key, value)
    })

    return redirectResponse
  }

  // Check if any Supabase session or auth cookies exist
  const authCookies = request.cookies
    .getAll()
    .filter(
      (c) =>
        c.name.startsWith('sb-') ||
        c.name === 'medshield.accessToken' ||
        c.name.includes('auth-token')
    )
  const hasAuthCookies = authCookies.length > 0

  // 1. Fast path: unauthenticated user on public route (/login)
  if (!hasAuthCookies && isPublicRoute) {
    return response
  }

  // 2. Fast path: unauthenticated user on protected route -> redirect to /login
  if (!hasAuthCookies && !isPublicRoute) {
    return createRedirectResponse('/login')
  }

  // 3. User has auth cookies: validate session and handle potential expired / invalid refresh tokens
  let user = null
  let isAuthInvalid = false

  // Temporarily silence known refresh_token_not_found noise emitted by GoTrueClient background listeners
  const originalConsoleError = console.error
  console.error = (...args: unknown[]) => {
    const first = args[0] as { code?: string; message?: string } | string | undefined
    if (
      (typeof first === 'object' && first !== null && (first.code === 'refresh_token_not_found' || first.message?.includes('Refresh Token Not Found'))) ||
      (typeof first === 'string' && first.includes('Refresh Token Not Found'))
    ) {
      return
    }
    originalConsoleError.apply(console, args)
  }

  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      isAuthInvalid = true
      user = null
    } else {
      user = data?.user ?? null
    }
  } catch (_err) {
    isAuthInvalid = true
    user = null
  } finally {
    console.error = originalConsoleError
  }

  // Clean up stale auth cookies if the session was rejected or missing
  if (isAuthInvalid || !user) {
    authCookies.forEach((cookie) => {
      response.cookies.delete(cookie.name)
    })
  }

  if (!user && !isPublicRoute) {
    const redirect = createRedirectResponse('/login')
    authCookies.forEach((cookie) => {
      redirect.cookies.delete(cookie.name)
    })
    return redirect
  }

  if (user && path === '/login') {
    return createRedirectResponse('/')
  }

  return response
}
