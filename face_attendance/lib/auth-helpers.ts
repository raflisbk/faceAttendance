import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

export interface AuthenticatedUser {
  id: string
  email: string
  role: string
  name?: string
}

export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // Get token from Authorization header or cookies
    const authHeader = request.headers.get('authorization')
    let token: string | null = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else {
      // Try to get from cookies
      token = request.cookies.get('auth-token')?.value || null
    }

    if (!token) {
      return null
    }

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
    if (!jwtSecret) {
      throw new Error('JWT secret not configured')
    }

    const decoded = jwt.verify(token, jwtSecret) as any

    return {
      id: decoded.sub || decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

export function createAuthToken(user: AuthenticatedUser): string {
  const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
  if (!jwtSecret) {
    throw new Error('JWT secret not configured')
  }

  return jwt.sign(
    {
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    jwtSecret,
    {
      expiresIn: '7d'
    }
  )
}