import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import crypto from 'crypto';
import { AUTH_CONSTANTS } from './constants';

/**
 * Encryption and Security Utilities
 * Handles password hashing, JWT tokens, data encryption, and security operations
 */

// Environment variables with defaults
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

/**
 * Password Management
 */
export class PasswordManager {
  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate secure random password
   */
  static generateRandomPassword(length: number = 12): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '@$!%*?&';
    
    const allChars = uppercase + lowercase + numbers + symbols;
    
    let password = '';
    // Ensure at least one character from each category
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check password strength
   */
  static checkPasswordStrength(password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 8) score += 25;
    else feedback.push('Password should be at least 8 characters long');

    if (password.length >= 12) score += 10;

    // Character variety checks
    if (/[a-z]/.test(password)) score += 15;
    else feedback.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 15;
    else feedback.push('Include uppercase letters');

    if (/\d/.test(password)) score += 15;
    else feedback.push('Include numbers');

    if (/[@$!%*?&]/.test(password)) score += 20;
    else feedback.push('Include special characters (@$!%*?&)');

    // Common patterns penalty
    if (/(.)\1{2,}/.test(password)) {
      score -= 10;
      feedback.push('Avoid repeating characters');
    }

    if (/123|abc|qwe/i.test(password)) {
      score -= 15;
      feedback.push('Avoid common sequences');
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      feedback,
      isStrong: score >= 80 && feedback.length === 0
    };
  }
}

/**
 * JWT Token Management
 */
export class JWTManager {
  private static secret = new TextEncoder().encode(JWT_SECRET);

  /**
   * Generate JWT token
   */
  static async generateToken(
    payload: Record<string, any>,
    expiresIn: string = AUTH_CONSTANTS.JWT_EXPIRES_IN
  ): Promise<string> {
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(this.secret);

    return jwt;
  }

  /**
   * Verify JWT token
   */
  static async verifyToken(token: string): Promise<{ payload: any; isValid: boolean }> {
    try {
      const { payload } = await jose.jwtVerify(token, this.secret);
      return { payload, isValid: true };
    } catch (error) {
      console.error('JWT verification failed:', error);
      return { payload: null, isValid: false };
    }
  }

  /**
   * Decode JWT token without verification (for debugging)
   */
  static decodeToken(token: string): any {
    try {
      const payload = jose.decodeJwt(token);
      return payload;
    } catch (error) {
      console.error('JWT decode failed:', error);
      return null;
    }
  }

  /**
   * Generate refresh token
   */
  static async generateRefreshToken(userId: string): Promise<string> {
    const payload = { userId, type: 'refresh' };
    return await this.generateToken(payload, AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRES_IN);
  }

  /**
   * Generate password reset token
   */
  static async generatePasswordResetToken(userId: string, email: string): Promise<string> {
    const payload = { userId, email, type: 'password_reset' };
    return await this.generateToken(payload, '1h'); // 1 hour expiry
  }

  /**
   * Generate email verification token
   */
  static async generateEmailVerificationToken(userId: string, email: string): Promise<string> {
    const payload = { userId, email, type: 'email_verification' };
    return await this.generateToken(payload, '24h'); // 24 hours expiry
  }
}

/**
 * Data Encryption/Decryption
 */
export class DataEncryption {
  private static algorithm = 'aes-256-gcm';
  private static key = Buffer.from(ENCRYPTION_KEY, 'hex');

  /**
   * Encrypt sensitive data
   */
  static encrypt(text: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: { encrypted: string; iv: string; tag: string }): string {
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, Buffer.from(encryptedData.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypt face descriptors
   */
  static encryptFaceDescriptor(descriptor: Float32Array): string {
    const descriptorString = Array.from(descriptor).join(',');
    const encrypted = this.encrypt(descriptorString);
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypt face descriptors
   */
  static decryptFaceDescriptor(encryptedDescriptor: string): Float32Array {
    const encryptedData = JSON.parse(encryptedDescriptor);
    const decryptedString = this.decrypt(encryptedData);
    const descriptorArray = decryptedString.split(',').map(Number);
    return new Float32Array(descriptorArray);
  }
}

/**
 * Secure Random Generation
 */
export class SecureRandom {
  /**
   * Generate secure random string
   */
  static generateRandomString(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate secure random number
   */
  static generateRandomNumber(min: number = 100000, max: number = 999999): number {
    return crypto.randomInt(min, max + 1);
  }

  /**
   * Generate OTP (One-Time Password)
   */
  static generateOTP(length: number = 6): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[crypto.randomInt(0, digits.length)];
    }
    return otp;
  }

  /**
   * Generate secure session ID
   */
  static generateSessionId(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate API key
   */
  static generateApiKey(): string {
    const prefix = 'fa_'; // face-attendance prefix
    const key = crypto.randomBytes(24).toString('base64url');
    return prefix + key;
  }
}

/**
 * Hash and Verification Utilities
 */
export class HashManager {
  /**
   * Generate SHA-256 hash
   */
  static sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate MD5 hash (for non-security purposes like file checksums)
   */
  static md5(data: string): string {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Generate HMAC
   */
  static hmac(data: string, key: string = JWT_SECRET): string {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * Verify HMAC
   */
  static verifyHmac(data: string, hash: string, key: string = JWT_SECRET): boolean {
    const computedHash = this.hmac(data, key);
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash));
  }

  /**
   * Generate file checksum
   */
  static async generateFileChecksum(file: Buffer): Promise<string> {
    return crypto.createHash('sha256').update(file).digest('hex');
  }
}

/**
 * Rate Limiting Security
 */
export class SecurityLimiter {
  /**
   * Generate rate limit key
   */
  static generateRateLimitKey(ip: string, action: string): string {
    return `rate_limit:${action}:${this.hashIP(ip)}`;
  }

  /**
   * Hash IP address for privacy
   */
  static hashIP(ip: string): string {
    return crypto.createHash('sha256').update(ip + JWT_SECRET).digest('hex').substring(0, 16);
  }

  /**
   * Generate device fingerprint
   */
  static generateDeviceFingerprint(userAgent: string, ip: string): string {
    const data = `${userAgent}:${ip}:${JWT_SECRET}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Validate request signature
   */
  static validateRequestSignature(
    payload: string,
    signature: string,
    timestamp: number,
    toleranceMs: number = 300000 // 5 minutes
  ): boolean {
    // Check timestamp tolerance
    if (Math.abs(Date.now() - timestamp) > toleranceMs) {
      return false;
    }

    // Generate expected signature
    const expectedSignature = this.generateRequestSignature(payload, timestamp);
    
    // Timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Generate request signature
   */
  static generateRequestSignature(payload: string, timestamp: number): string {
    const data = `${timestamp}.${payload}`;
    return crypto.createHmac('sha256', JWT_SECRET).update(data).digest('hex');
  }
}

/**
 * Audit and Logging Security
 */
export class AuditLogger {
  /**
   * Hash sensitive data for logging
   */
  static hashForAudit(data: string): string {
    // Use first 8 chars for identification while maintaining privacy
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16) + '...';
  }

  /**
   * Generate audit trail hash
   */
  static generateAuditHash(
    userId: string,
    action: string,
    timestamp: number,
    metadata?: Record<string, any>
  ): string {
    const auditData = {
      userId,
      action,
      timestamp,
      metadata: metadata || {}
    };
    
    return crypto.createHash('sha256')
      .update(JSON.stringify(auditData))
      .digest('hex');
  }

  /**
   * Verify audit trail integrity
   */
  static verifyAuditIntegrity(
    auditRecord: any,
    expectedHash: string
  ): boolean {
    const computedHash = this.generateAuditHash(
      auditRecord.userId,
      auditRecord.action,
      auditRecord.timestamp,
      auditRecord.metadata
    );
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedHash),
      Buffer.from(computedHash)
    );
  }
}

/**
 * Face Data Encryption (Specialized for biometric data)
 */
export class BiometricEncryption {
  private static biometricKey = crypto.scryptSync(JWT_SECRET, 'biometric-salt', 32);

  /**
   * Encrypt biometric template (face descriptor)
   */
  static encryptBiometricTemplate(template: Float32Array): {
    encryptedTemplate: string;
    templateHash: string;
    iv: string;
  } {
    const templateArray = Array.from(template);
    const templateJson = JSON.stringify(templateArray);
    
    // Generate IV
    const iv = crypto.randomBytes(16);
    
    // Encrypt template
    const cipher = crypto.createCipheriv('aes-256-gcm', this.biometricKey, iv);
    let encrypted = cipher.update(templateJson, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine encrypted data with auth tag
    const encryptedTemplate = encrypted + ':' + authTag.toString('hex');
    
    // Generate template hash for quick comparison
    const templateHash = crypto.createHash('sha256').update(templateJson).digest('hex');
    
    return {
      encryptedTemplate,
      templateHash,
      iv: iv.toString('hex')
    };
  }

  /**
   * Decrypt biometric template
   */
  static decryptBiometricTemplate(
    encryptedTemplate: string,
    iv: string
  ): Float32Array {
    const [encrypted, authTag] = encryptedTemplate.split(':');
    
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.biometricKey,
      Buffer.from(iv, 'hex')
    ) as crypto.DecipherGCM;
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    const templateArray = JSON.parse(decrypted);
    return new Float32Array(templateArray);
  }

  /**
   * Generate biometric template ID (non-reversible)
   */
  static generateTemplateId(template: Float32Array): string {
    const templateArray = Array.from(template);
    const templateString = templateArray.join(',');
    return crypto.createHash('sha256').update(templateString).digest('hex');
  }

  /**
   * Verify template integrity
   */
  static verifyTemplateIntegrity(
    template: Float32Array,
    expectedHash: string
  ): boolean {
    const templateArray = Array.from(template);
    const templateJson = JSON.stringify(templateArray);
    const computedHash = crypto.createHash('sha256').update(templateJson).digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedHash),
      Buffer.from(computedHash)
    );
  }
}

/**
 * Session Management Security
 */
export class SessionSecurity {
  /**
   * Generate secure session token
   */
  static generateSessionToken(): {
    token: string;
    tokenHash: string;
    expiresAt: Date;
  } {
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 hours
    
    return { token, tokenHash, expiresAt };
  }

  /**
   * Verify session token
   */
  static verifySessionToken(token: string, storedHash: string): boolean {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(tokenHash),
      Buffer.from(storedHash)
    );
  }

  /**
   * Generate CSRF token
   */
  static generateCSRFToken(sessionId: string): string {
    const data = `${sessionId}:${Date.now()}:${JWT_SECRET}`;
    return crypto.createHash('sha256').update(data).digest('base64url');
  }

  /**
   * Verify CSRF token
   */
  static verifyCSRFToken(
    token: string,
    sessionId: string,
    toleranceMs: number = 3600000 // 1 hour
  ): boolean {
    try {
      // Extract timestamp from token (this is a simplified approach)
      const timestamp = Date.now(); // In real implementation, extract from token
      
      if (Math.abs(Date.now() - timestamp) > toleranceMs) {
        return false;
      }
      
      const expectedToken = this.generateCSRFToken(sessionId);
      return crypto.timingSafeEqual(
        Buffer.from(token),
        Buffer.from(expectedToken)
      );
    } catch {
      return false;
    }
  }
}

/**
 * Input Sanitization and Validation
 */
export class InputSecurity {
  /**
   * Sanitize user input to prevent injection attacks
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>&"']/g, (match) => {
        const escapes: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          '"': '&quot;',
          "'": '&#x27;'
        };
        return escapes[match] || match;
      });
  }

  /**
   * Validate and sanitize email
   */
  static sanitizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Validate and sanitize filename
   */
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9\-_.]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255);
  }

  /**
   * Generate safe database identifier
   */
  static generateSafeId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

/**
 * Security Headers and CSP
 */
export class SecurityHeaders {
  /**
   * Generate Content Security Policy header
   */
  static generateCSP(): string {
    const directives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Needed for Next.js
      "style-src 'self' 'unsafe-inline'", // Needed for Tailwind
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss:",
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ];
    
    return directives.join('; ');
  }

  /**
   * Get security headers for API responses
   */
  static getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': this.generateCSP(),
    };
  }
}

/**
 * Utility functions for common security operations
 */
export const SecurityUtils = {
  /**
   * Timing-safe string comparison
   */
  timingSafeEqual: (a: string, b: string): boolean => {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  },

  /**
   * Generate nonce for CSP
   */
  generateNonce: (): string => {
    return crypto.randomBytes(16).toString('base64');
  },

  /**
   * Validate IP address format
   */
  isValidIP: (ip: string): boolean => {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  },

  /**
   * Rate limit key generator
   */
  getRateLimitKey: (identifier: string, action: string): string => {
    return `rate_limit:${action}:${crypto.createHash('md5').update(identifier).digest('hex')}`;
  },

  /**
   * Generate secure random token
   */
  generateSecureToken: (length: number = 32): string => {
    return crypto.randomBytes(length).toString('base64url');
  }
};