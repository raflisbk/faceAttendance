/**
 * Authentication Utilities and Session Management
 * Handles token management, session persistence, and authentication state
 */

import { JWTManager } from '@/lib/encryption';
import { AUTH_CONSTANTS, USER_ROLES } from '@/lib/constants';

export interface User {
  id: string;
  email: string;
  name: string;
  role: keyof typeof USER_ROLES;
  status: string;
  avatar?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  registrationStep: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface TokenPair {
  token: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Token Storage Management
 */
export class TokenManager {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private static readonly USER_KEY = 'auth_user';
  private static readonly REMEMBER_ME_KEY = 'remember_me';

  /**
   * Store authentication tokens
   */
  static storeTokens(tokenPair: TokenPair, rememberMe: boolean = false): void {
    const storage = rememberMe ? localStorage : sessionStorage;
    
    storage.setItem(this.TOKEN_KEY, tokenPair.token);
    storage.setItem(this.REFRESH_TOKEN_KEY, tokenPair.refreshToken);
    storage.setItem(this.REMEMBER_ME_KEY, rememberMe.toString());
    
    // Set expiration time
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    storage.setItem('token_expires_at', expiresAt.toString());
  }

  /**
   * Get stored token
   */
  static getToken(): string | null {
    // Try localStorage first (for remembered sessions)
    let token = localStorage.getItem(this.TOKEN_KEY);
    if (token && this.isTokenValid(token)) {
      return token;
    }

    // Try sessionStorage
    token = sessionStorage.getItem(this.TOKEN_KEY);
    if (token && this.isTokenValid(token)) {
      return token;
    }

    return null;
  }

  /**
   * Get stored refresh token
   */
  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY) || 
           sessionStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Get stored user data
   */
  static getStoredUser(): User | null {
    const userString = localStorage.getItem(this.USER_KEY) || 
                       sessionStorage.getItem(this.USER_KEY);
    
    if (userString) {
      try {
        return JSON.parse(userString);
      } catch {
        this.clearStoredUser();
      }
    }
    return null;
  }

  /**
   * Store user data
   */
  static storeUser(user: User): void {
    const storage = this.isRememberMeEnabled() ? localStorage : sessionStorage;
    storage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Clear all stored authentication data
   */
  static clearAll(): void {
    [localStorage, sessionStorage].forEach(storage => {
      storage.removeItem(this.TOKEN_KEY);
      storage.removeItem(this.REFRESH_TOKEN_KEY);
      storage.removeItem(this.USER_KEY);
      storage.removeItem(this.REMEMBER_ME_KEY);
      storage.removeItem('token_expires_at');
    });
  }

  /**
   * Clear stored user data
   */
  static clearStoredUser(): void {
    [localStorage, sessionStorage].forEach(storage => {
      storage.removeItem(this.USER_KEY);
    });
  }

  /**
   * Check if remember me is enabled
   */
  static isRememberMeEnabled(): boolean {
    return localStorage.getItem(this.REMEMBER_ME_KEY) === 'true';
  }

  /**
   * Check if token is valid and not expired
   */
  static isTokenValid(token: string): boolean {
    try {
      const decoded = JWTManager.decodeToken(token);
      if (!decoded || !decoded.exp) return false;

      const currentTime = Date.now() / 1000;
      return decoded.exp > currentTime;
    } catch {
      return false;
    }
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(): Date | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const decoded = JWTManager.decodeToken(token);
      if (decoded?.exp) {
        return new Date(decoded.exp * 1000);
      }
    } catch {
      // Token is invalid
    }
    return null;
  }

  /**
   * Check if token will expire soon
   */
  static willTokenExpireSoon(minutesBefore: number = 5): boolean {
    const expiration = this.getTokenExpiration();
    if (!expiration) return true;

    const warningTime = new Date(expiration.getTime() - (minutesBefore * 60 * 1000));
    return new Date() > warningTime;
  }
}

/**
 * Session Management
 */
export class SessionManager {
  private static sessionCheckInterval: NodeJS.Timeout | null = null;
  private static listeners: Array<(isAuthenticated: boolean) => void> = [];

  /**
   * Initialize session monitoring
   */
  static initialize(): void {
    // Check session validity periodically
    this.sessionCheckInterval = setInterval(() => {
      this.checkSession();
    }, 60000); // Check every minute

    // Listen for storage changes (multi-tab synchronization)
    window.addEventListener('storage', (e) => {
      if (e.key === TokenManager['TOKEN_KEY'] || e.key === TokenManager['USER_KEY']) {
        this.notifyListeners();
      }
    });

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkSession();
      }
    });
  }

  /**
   * Cleanup session monitoring
   */
  static cleanup(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  /**
   * Add session state listener
   */
  static addListener(callback: (isAuthenticated: boolean) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Remove session state listener
   */
  static removeListener(callback: (isAuthenticated: boolean) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * Check current session validity
   */
  static checkSession(): boolean {
    const token = TokenManager.getToken();
    const user = TokenManager.getStoredUser();
    const isValid = token && user && TokenManager.isTokenValid(token);

    if (!isValid) {
      this.clearSession();
      this.notifyListeners();
      return false;
    }

    // Check if token needs refresh
    if (TokenManager.willTokenExpireSoon()) {
      this.refreshTokenSilently().catch(() => {
        this.clearSession();
        this.notifyListeners();
      });
    }

    return true;
  }

  /**
   * Clear current session
   */
  static clearSession(): void {
    TokenManager.clearAll();
    
    // Clear any cached data
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  /**
   * Refresh token silently
   */
  private static async refreshTokenSilently(): Promise<void> {
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      if (data.success && data.data.token) {
        const tokenPair = {
          token: data.data.token,
          refreshToken: data.data.refreshToken || refreshToken,
          expiresAt: Date.now() + (24 * 60 * 60 * 1000),
        };

        TokenManager.storeTokens(tokenPair, TokenManager.isRememberMeEnabled());
      }
    } catch (error) {
      console.error('Silent token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Notify all listeners of session changes
   */
  private static notifyListeners(): void {
    const isAuthenticated = this.isAuthenticated();
    this.listeners.forEach(callback => callback(isAuthenticated));
  }

  /**
   * Check if user is currently authenticated
   */
  static isAuthenticated(): boolean {
    return TokenManager.getToken() !== null && TokenManager.getStoredUser() !== null;
  }

  /**
   * Get current user
   */
  static getCurrentUser(): User | null {
    return TokenManager.getStoredUser();
  }

  /**
   * Update current user data
   */
  static updateUser(userData: Partial<User>): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      TokenManager.storeUser(updatedUser);
      this.notifyListeners();
    }
  }
}

/**
 * Permission and Role Management
 */
export class PermissionManager {
  /**
   * Check if user has specific role
   */
  static hasRole(user: User | null, role: keyof typeof USER_ROLES): boolean {
    return user?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  static hasAnyRole(user: User | null, roles: Array<keyof typeof USER_ROLES>): boolean {
    return user ? roles.includes(user.role) : false;
  }

  /**
   * Check if user is admin
   */
  static isAdmin(user: User | null): boolean {
    return this.hasRole(user, 'ADMIN');
  }

  /**
   * Check if user is lecturer
   */
  static isLecturer(user: User | null): boolean {
    return this.hasRole(user, 'LECTURER');
  }

  /**
   * Check if user is student
   */
  static isStudent(user: User | null): boolean {
    return this.hasRole(user, 'STUDENT');
  }

  /**
   * Check if user can access admin features
   */
  static canAccessAdmin(user: User | null): boolean {
    return this.isAdmin(user);
  }

  /**
   * Check if user can manage classes
   */
  static canManageClasses(user: User | null): boolean {
    return this.hasAnyRole(user, ['ADMIN', 'LECTURER']);
  }

  /**
   * Check if user can view attendance reports
   */
  static canViewAttendanceReports(user: User | null): boolean {
    return this.hasAnyRole(user, ['ADMIN', 'LECTURER']);
  }

  /**
   * Check if user can approve other users
   */
  static canApproveUsers(user: User | null): boolean {
    return this.isAdmin(user);
  }

  /**
   * Check if user's registration is complete
   */
  static isRegistrationComplete(user: User | null): boolean {
    return user ? user.registrationStep >= 4 && user.status === 'APPROVED' : false;
  }

  /**
   * Check if user needs to complete registration
   */
  static needsRegistrationCompletion(user: User | null): boolean {
    return user ? user.registrationStep < 4 || user.status === 'PENDING' : true;
  }
}

/**
 * Authentication Hooks for React Components
 */
export class AuthHooks {
  /**
   * Get authentication state for React components
   */
  static useAuthState(): AuthState {
    const user = SessionManager.getCurrentUser();
    const token = TokenManager.getToken();
    const refreshToken = TokenManager.getRefreshToken();

    return {
      user,
      token,
      refreshToken,
      isAuthenticated: SessionManager.isAuthenticated(),
      isLoading: false,
      error: null,
    };
  }

  /**
   * Create auth state listener for React components
   */
  static createAuthStateListener(
    callback: (state: AuthState) => void
  ): () => void {
    const listener = (isAuthenticated: boolean) => {
      const state = this.useAuthState();
      callback(state);
    };

    SessionManager.addListener(listener);

    // Return cleanup function
    return () => {
      SessionManager.removeListener(listener);
    };
  }
}

/**
 * Route Protection Utilities
 */
export class RouteGuard {
  /**
   * Check if route requires authentication
   */
  static requiresAuth(path: string): boolean {
    const publicRoutes = [
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/verify-email',
      '/',
      '/about',
      '/contact',
      '/privacy',
      '/terms'
    ];

    return !publicRoutes.some(route => path.startsWith(route));
  }

  /**
   * Check if user can access specific route
   */
  static canAccessRoute(path: string, user: User | null): boolean {
    // Public routes - everyone can access
    if (!this.requiresAuth(path)) {
      return true;
    }

    // Authentication required
    if (!user) {
      return false;
    }

    // Check registration completion for most routes
    if (!PermissionManager.isRegistrationComplete(user) && 
        !path.startsWith('/register') && 
        !path.startsWith('/profile')) {
      return false;
    }

    // Admin routes
    if (path.startsWith('/admin')) {
      return PermissionManager.canAccessAdmin(user);
    }

    // Lecturer routes
    if (path.startsWith('/lecturer') || path.startsWith('/classes')) {
      return PermissionManager.canManageClasses(user);
    }

    // Student routes
    if (path.startsWith('/student') || path.startsWith('/attendance')) {
      return PermissionManager.isStudent(user) || PermissionManager.canManageClasses(user);
    }

    // Default: authenticated users can access
    return true;
  }

  /**
   * Get redirect path for unauthorized access
   */
  static getRedirectPath(path: string, user: User | null): string {
    // Not authenticated - redirect to login
    if (!user) {
      return `/login?redirect=${encodeURIComponent(path)}`;
    }

    // Registration incomplete - redirect to appropriate step
    if (!PermissionManager.isRegistrationComplete(user)) {
      if (user.status === 'PENDING') {
        return '/register/pending';
      }
      if (user.registrationStep < 4) {
        return `/register/step-${user.registrationStep + 1}`;
      }
    }

    // Role-based redirects
    if (path.startsWith('/admin') && !PermissionManager.isAdmin(user)) {
      return '/dashboard';
    }

    if (path.startsWith('/lecturer') && !PermissionManager.isLecturer(user)) {
      return '/dashboard';
    }

    // Default redirect
    return '/dashboard';
  }

  /**
   * Get appropriate dashboard route for user
   */
  static getDashboardRoute(user: User | null): string {
    if (!user) return '/login';

    if (!PermissionManager.isRegistrationComplete(user)) {
      if (user.status === 'PENDING') return '/register/pending';
      return `/register/step-${user.registrationStep + 1}`;
    }

    switch (user.role) {
      case 'ADMIN':
        return '/admin';
      case 'LECTURER':
        return '/lecturer';
      case 'STUDENT':
        return '/student';
      default:
        return '/dashboard';
    }
  }
}

/**
 * Login/Logout Utilities
 */
export class AuthActions {
  /**
   * Handle successful login
   */
  static handleLoginSuccess(tokenPair: TokenPair, user: User, rememberMe: boolean = false): void {
    TokenManager.storeTokens(tokenPair, rememberMe);
    TokenManager.storeUser(user);
    SessionManager.checkSession();
  }

  /**
   * Handle logout
   */
  static async handleLogout(serverLogout: boolean = true): Promise<void> {
    try {
      // Call server logout endpoint if requested
      if (serverLogout) {
        const token = TokenManager.getToken();
        if (token) {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        }
      }
    } catch (error) {
      console.error('Server logout failed:', error);
    } finally {
      // Always clear local session
      SessionManager.clearSession();
    }
  }

  /**
   * Handle registration step completion
   */
  static handleRegistrationStepComplete(step: number, userData?: Partial<User>): void {
    const currentUser = SessionManager.getCurrentUser();
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        registrationStep: Math.max(currentUser.registrationStep, step),
        ...userData
      };
      SessionManager.updateUser(updatedUser);
    }
  }

  /**
   * Handle profile update
   */
  static handleProfileUpdate(updatedData: Partial<User>): void {
    SessionManager.updateUser(updatedData);
  }
}

/**
 * Password Strength Checker
 */
export class PasswordStrengthChecker {
  /**
   * Check password strength with detailed feedback
   */
  static checkStrength(password: string): {
    score: number;
    strength: 'weak' | 'fair' | 'good' | 'strong';
    feedback: string[];
    requirements: {
      length: boolean;
      uppercase: boolean;
      lowercase: boolean;
      numbers: boolean;
      symbols: boolean;
    };
  } {
    const requirements = {
      length: password.length >= AUTH_CONSTANTS.PASSWORD_MIN_LENGTH,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password),
    };

    const feedback: string[] = [];
    let score = 0;

    // Length scoring
    if (requirements.length) {
      score += 20;
    } else {
      feedback.push(`Must be at least ${AUTH_CONSTANTS.PASSWORD_MIN_LENGTH} characters long`);
    }

    // Character variety scoring
    if (requirements.uppercase) score += 15;
    else feedback.push('Include uppercase letters (A-Z)');

    if (requirements.lowercase) score += 15;
    else feedback.push('Include lowercase letters (a-z)');

    if (requirements.numbers) score += 20;
    else feedback.push('Include numbers (0-9)');

    if (requirements.symbols) score += 20;
    else feedback.push('Include special characters (!@#$%^&*)');

    // Bonus points for length
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    // Penalty for common patterns
    if (/(.)\1{2,}/.test(password)) {
      score -= 10;
      feedback.push('Avoid repeating characters');
    }

    if (/123|abc|qwe|password/i.test(password)) {
      score -= 15;
      feedback.push('Avoid common patterns or words');
    }

    // Determine strength
    let strength: 'weak' | 'fair' | 'good' | 'strong';
    if (score < 40) strength = 'weak';
    else if (score < 60) strength = 'fair';
    else if (score < 80) strength = 'good';
    else strength = 'strong';

    return {
      score: Math.max(0, Math.min(100, score)),
      strength,
      feedback,
      requirements,
    };
  }

  /**
   * Get password strength color
   */
  static getStrengthColor(strength: 'weak' | 'fair' | 'good' | 'strong'): string {
    switch (strength) {
      case 'weak': return '#ef4444'; // red
      case 'fair': return '#f59e0b'; // orange
      case 'good': return '#3b82f6'; // blue
      case 'strong': return '#10b981'; // green
      default: return '#6b7280'; // gray
    }
  }
}

/**
 * Device Detection and Security
 */
export class DeviceSecurity {
  /**
   * Generate device fingerprint
   */
  static generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      !!window.sessionStorage,
      !!window.localStorage,
      canvas.toDataURL()
    ].join('|');

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return hash.toString(36);
  }

  /**
   * Detect if user is on mobile device
   */
  static isMobileDevice(): boolean {
    return /Mobi|Android/i.test(navigator.userAgent);
  }

  /**
   * Get browser info
   */
  static getBrowserInfo(): {
    name: string;
    version: string;
    platform: string;
  } {
    const ua = navigator.userAgent;
    let name = 'Unknown';
    let version = 'Unknown';

    if (ua.includes('Chrome')) {
      name = 'Chrome';
      version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Firefox')) {
      name = 'Firefox';
      version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Safari')) {
      name = 'Safari';
      version = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Edge')) {
      name = 'Edge';
      version = ua.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
    }

    return {
      name,
      version,
      platform: navigator.platform,
    };
  }
}

/**
 * Utility Functions
 */

/**
 * Format authentication error messages
 */
export function formatAuthError(error: any): string {
  if (typeof error === 'string') return error;
  
  if (error?.message) return error.message;
  
  if (error?.code) {
    switch (error.code) {
      case 'INVALID_CREDENTIALS':
        return 'Invalid email or password';
      case 'ACCOUNT_LOCKED':
        return 'Account temporarily locked due to multiple failed login attempts';
      case 'EMAIL_NOT_VERIFIED':
        return 'Please verify your email address before logging in';
      case 'ACCOUNT_SUSPENDED':
        return 'Your account has been suspended. Please contact support';
      case 'REGISTRATION_INCOMPLETE':
        return 'Please complete your registration process';
      default:
        return 'Authentication failed. Please try again';
    }
  }
  
  return 'An unexpected error occurred';
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get user display name
 */
export function getUserDisplayName(user: User | null): string {
  if (!user) return 'Guest';
  return user.name || user.email || 'User';
}

/**
 * Get user avatar URL or fallback
 */
export function getUserAvatarUrl(user: User | null): string {
  if (user?.avatar) return user.avatar;
  
  // Generate initials-based avatar
  const name = getUserDisplayName(user);
  const initials = name.split(' ').map(part => part[0]).join('').toUpperCase();
  
  // Return a placeholder or data URL for initials
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" fill="#6366f1" rx="20"/>
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="white" font-family="Arial" font-size="16">${initials}</text>
    </svg>
  `)}`;
}

/**
 * Check if user needs password change
 */
export function needsPasswordChange(user: User | null): boolean {
  if (!user) return false;
  
  // Check if password was set more than 90 days ago
  const passwordUpdatedAt = new Date(user.updatedAt);
  const ninetyDaysAgo = new Date(Date.now() - (90 * 24 * 60 * 60 * 1000));
  
  return passwordUpdatedAt < ninetyDaysAgo;
}

// Initialize session manager when module loads
if (typeof window !== 'undefined') {
  SessionManager.initialize();
}

// Export all classes and utilities
export {
  TokenManager,
  SessionManager,
  PermissionManager,
  AuthHooks,
  RouteGuard,
  AuthActions,
  PasswordStrengthChecker,
  DeviceSecurity,
};

      '