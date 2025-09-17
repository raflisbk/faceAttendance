import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
)

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/health',
  '/manifest.json',
  '/sw.js',
  '/favicon.ico',
]

// Admin-only routes
const adminRoutes = [
  '/admin',
]

// Lecturer routes
const lecturerRoutes = [
  '/lecturer',
]

// Student routes
const studentRoutes = [
  '/student',
]

// API routes that require specific roles
const roleBasedApiRoutes = {
  admin: [
    '/api/admin',
    '/api/users',
    '/api/classes',
    '/api/locations',
  ],
  lecturer: [
    '/api/lecturer',
    '/api/classes',
    '/api/attendance/qr-code/generate',
  ],
  student: [
    '/api/student',
    '/api/attendance/check-in',
    '/api/attendance/history',
  ]
}

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => {
    if (route === '/') return pathname === '/'
    return pathname.startsWith(route)
  })
}

function getRequiredRole(pathname: string): string | null {
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    return 'ADMIN'
  }
  if (lecturerRoutes.some(route => pathname.startsWith(route))) {
    return 'LECTURER'
  }
  if (studentRoutes.some(route => pathname.startsWith(route))) {
    return 'STUDENT'
  }
  
  // Check API routes
  for (const [role, routes] of Object.entries(roleBasedApiRoutes)) {
    if (routes.some(route => pathname.startsWith(route))) {
      return role.toUpperCase()
    }
  }
  
  return null
}

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch (error) {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for static files and API routes that don't need auth
  if (
    pathname.includes('/_next/') ||
    pathname.includes('/api/_') ||
    pathname.includes('.') ||
    isPublicRoute(pathname)
  ) {
    return NextResponse.next()
  }

  // Get token from cookie
  const token = request.cookies.get('auth-token')?.value

  // If no token, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Verify token
  const payload = await verifyToken(token)
  if (!payload) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('auth-token')
    return response
  }

  const userRole = payload.role as string
  const userId = payload.userId as string

  // Check role-based access
  const requiredRole = getRequiredRole(pathname)
  if (requiredRole && userRole !== requiredRole) {
    // Redirect to appropriate dashboard based on user role
    let redirectPath = '/'
    switch (userRole) {
      case 'ADMIN':
        redirectPath = '/admin/dashboard'
        break
      case 'LECTURER':
        redirectPath = '/lecturer/dashboard'
        break
      case 'STUDENT':
        redirectPath = '/student/dashboard'
        break
    }
    return NextResponse.redirect(new URL(redirectPath, request.url))
  }

  // Add user info to headers for API routes
  if (pathname.startsWith('/api/')) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', userId)
    requestHeaders.set('x-user-role', userRole)
    requestHeaders.set('x-user-email', payload.email as string)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // Handle root path redirect based on role
  if (pathname === '/') {
    let redirectPath = '/login'
    switch (userRole) {
      case 'ADMIN':
        redirectPath = '/admin/dashboard'
        break
      case 'LECTURER':
        redirectPath = '/lecturer/dashboard'
        break
      case 'STUDENT':
        redirectPath = '/student/dashboard'
        break
    }
    return NextResponse.redirect(new URL(redirectPath, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}