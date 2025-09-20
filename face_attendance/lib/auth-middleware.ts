import { NextRequest } from 'next/server'
import { JWTManager } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'

/**
 * Authentication middleware for API routes
 * Validates JWT tokens and returns authenticated user
 */

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'LECTURER' | 'STUDENT' | 'SUPER_ADMIN';
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  registrationStep: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Extract and validate JWT token from request
 */
export async function authMiddleware(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate and decode JWT token
    const decoded = JWTManager.decodeToken(token);
    if (!decoded || !decoded.userId) {
      return null;
    }

    // Check token expiration
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return null;
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        registrationStep: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      return null;
    }

    // Check if user account is active
    if (user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
      return null;
    }

    return {
      ...user,
      emailVerified: !!user.emailVerified,
      phoneVerified: !!user.phoneVerified,
    };

  } catch (error) {
    console.error('Authentication middleware error:', error);
    return null;
  }
}

/**
 * Middleware to require specific role
 */
export async function requireRole(
  request: NextRequest,
  requiredRole: 'ADMIN' | 'LECTURER' | 'STUDENT' | 'SUPER_ADMIN'
): Promise<AuthenticatedUser | null> {
  const user = await authMiddleware(request);

  if (!user || user.role !== requiredRole) {
    return null;
  }

  return user;
}

/**
 * Middleware to require admin role
 */
export async function requireAdmin(request: NextRequest): Promise<AuthenticatedUser | null> {
  return requireRole(request, 'ADMIN');
}

/**
 * Middleware to require lecturer role
 */
export async function requireLecturer(request: NextRequest): Promise<AuthenticatedUser | null> {
  return requireRole(request, 'LECTURER');
}

/**
 * Middleware to require student role
 */
export async function requireStudent(request: NextRequest): Promise<AuthenticatedUser | null> {
  return requireRole(request, 'STUDENT');
}

/**
 * Middleware to allow multiple roles
 */
export async function requireAnyRole(
  request: NextRequest,
  allowedRoles: Array<'ADMIN' | 'LECTURER' | 'STUDENT' | 'SUPER_ADMIN'>
): Promise<AuthenticatedUser | null> {
  const user = await authMiddleware(request);

  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }

  return user;
}

/**
 * Middleware to check if user has completed registration
 */
export async function requireCompleteRegistration(request: NextRequest): Promise<AuthenticatedUser | null> {
  const user = await authMiddleware(request);

  if (!user || user.registrationStep < 4 || user.status !== 'APPROVED') {
    return null;
  }

  return user;
}

/**
 * Get user ID from token without full validation (for less critical operations)
 */
export function getUserIdFromToken(request: NextRequest): string | null {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = JWTManager.decodeToken(token);

    return decoded?.userId || null;
  } catch {
    return null;
  }
}

/**
 * Check if request has valid token (without database lookup)
 */
export function hasValidToken(request: NextRequest): boolean {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.substring(7);
    const decoded = JWTManager.decodeToken(token);

    if (!decoded || !decoded.userId) {
      return false;
    }

    // Check token expiration
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Extract IP address from request
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }

  if (real) {
    return real.trim();
  }

  return 'unknown';
}

/**
 * Rate limiting helper (basic implementation)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function isRateLimited(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): boolean {
  const now = Date.now();
  const current = requestCounts.get(identifier);

  if (!current || now > current.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (current.count >= maxRequests) {
    return true;
  }

  current.count++;
  return false;
}

/**
 * Clear expired rate limit entries (should be called periodically)
 */
export function cleanupRateLimit(): void {
  const now = Date.now();
  for (const [key, value] of requestCounts) {
    if (now > value.resetTime) {
      requestCounts.delete(key);
    }
  }
}

// Clean up rate limit entries every 30 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimit, 30 * 60 * 1000);
}