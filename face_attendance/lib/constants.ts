/**
 * Application Constants
 * Central location for all constants used across the application
 */

// Database Configuration
export const DB_CONSTANTS = {
  MAX_CONNECTION_POOL: 20,
  CONNECTION_TIMEOUT: 30000,
  STATEMENT_TIMEOUT: 60000,
  QUERY_TIMEOUT: 30000,
} as const;

// Cache Configuration
export const CACHE_CONSTANTS = {
  DEFAULT_TTL: 3600, // 1 hour
  SESSION_TTL: 86400, // 24 hours
  FACE_DESCRIPTOR_TTL: 604800, // 7 days
  USER_PROFILE_TTL: 1800, // 30 minutes
  WIFI_VALIDATION_TTL: 300, // 5 minutes
  ATTENDANCE_CACHE_TTL: 60, // 1 minute
} as const;

// Face Recognition Configuration
export const FACE_RECOGNITION = {
  MIN_CONFIDENCE: 0.6,
  HIGH_CONFIDENCE: 0.8,
  DESCRIPTOR_DISTANCE_THRESHOLD: 0.6,
  MIN_FACE_SIZE: 160,
  MAX_FACE_SIZE: 1024,
  INPUT_SIZE: 416,
  DETECTION_THRESHOLD: 0.5,
  SIMILARITY_THRESHOLD: 0.7,
  DETECTION_OPTIONS: {
    inputSize: 416,
    scoreThreshold: 0.5,
    minFaceSize: 80,
  },
  LANDMARK_MODEL: 'face_landmark_68_model',
  RECOGNITION_MODEL: 'face_recognition_model',
  EXPRESSION_MODEL: 'face_expression_model',
} as const;

// Authentication Configuration
export const AUTH_CONSTANTS = {
  JWT_EXPIRES_IN: '24h',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  OTP_EXPIRES_IN: 300, // 5 minutes
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 900, // 15 minutes
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_RESET_TOKEN_LENGTH: 32,
} as const;

// Registration Steps
export const REGISTRATION_STEPS = {
  BASIC_INFO: 1,
  DOCUMENT_VERIFICATION: 2,
  FACE_ENROLLMENT: 3,
  VERIFICATION_COMPLETE: 4,
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  LECTURER: 'LECTURER',
  STUDENT: 'STUDENT',
} as const;

// User Status
export const USER_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
  INACTIVE: 'INACTIVE',
} as const;

// Document Types
export const DOCUMENT_TYPES = {
  STUDENT_ID: 'STUDENT_ID',
  STAFF_ID: 'STAFF_ID',
  NATIONAL_ID: 'NATIONAL_ID',
  PASSPORT: 'PASSPORT',
} as const;

// Attendance Configuration
export const ATTENDANCE_CONSTANTS = {
  CHECK_IN_WINDOW: 15, // minutes before class starts
  CHECK_OUT_WINDOW: 15, // minutes after class ends
  LATE_THRESHOLD: 10, // minutes
  WIFI_VALIDATION_RADIUS: 100, // meters
  MAX_ATTENDANCE_PER_DAY: 10,
  MIN_FACE_QUALITY_SCORE: 0.7,
} as const;

// File Upload Configuration
export const FILE_UPLOAD = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
  MAX_FACE_IMAGES: 5,
  IMAGE_QUALITY: 0.9,
  MAX_IMAGE_WIDTH: 1920,
  MAX_IMAGE_HEIGHT: 1080,
} as const;

// API Rate Limiting
export const RATE_LIMITS = {
  LOGIN_ATTEMPTS: 5,
  FACE_VERIFICATION: 10,
  DOCUMENT_UPLOAD: 3,
  GENERAL_API: 100,
  ADMIN_API: 200,
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
} as const;

// WebSocket Events
export const WEBSOCKET_EVENTS = {
  ATTENDANCE_UPDATE: 'attendance:update',
  FACE_RECOGNITION_START: 'face:recognition:start',
  FACE_RECOGNITION_SUCCESS: 'face:recognition:success',
  FACE_RECOGNITION_FAILED: 'face:recognition:failed',
  USER_STATUS_CHANGE: 'user:status:change',
  SYSTEM_NOTIFICATION: 'system:notification',
} as const;

// Error Codes
export const ERROR_CODES = {
  // Authentication Errors
  INVALID_CREDENTIALS: 'AUTH_001',
  TOKEN_EXPIRED: 'AUTH_002',
  UNAUTHORIZED: 'AUTH_003',
  ACCOUNT_LOCKED: 'AUTH_004',
  
  // Face Recognition Errors
  NO_FACE_DETECTED: 'FACE_001',
  MULTIPLE_FACES_DETECTED: 'FACE_002',
  LOW_QUALITY_IMAGE: 'FACE_003',
  FACE_NOT_RECOGNIZED: 'FACE_004',
  LIVENESS_CHECK_FAILED: 'FACE_005',
  
  // Validation Errors
  INVALID_INPUT: 'VAL_001',
  MISSING_REQUIRED_FIELD: 'VAL_002',
  INVALID_FILE_TYPE: 'VAL_003',
  FILE_TOO_LARGE: 'VAL_004',
  
  // Database Errors
  DATABASE_CONNECTION_FAILED: 'DB_001',
  RECORD_NOT_FOUND: 'DB_002',
  DUPLICATE_ENTRY: 'DB_003',
  CONSTRAINT_VIOLATION: 'DB_004',
  
  // System Errors
  INTERNAL_SERVER_ERROR: 'SYS_001',
  SERVICE_UNAVAILABLE: 'SYS_002',
  RATE_LIMIT_EXCEEDED: 'SYS_003',
  MAINTENANCE_MODE: 'SYS_004',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  USER_CREATED: 'User account created successfully',
  LOGIN_SUCCESSFUL: 'Login successful',
  FACE_ENROLLED: 'Face profile enrolled successfully',
  ATTENDANCE_RECORDED: 'Attendance recorded successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  DOCUMENT_VERIFIED: 'Document verified successfully',
} as const;

// Email Templates
export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  EMAIL_VERIFICATION: 'email-verification',
  PASSWORD_RESET: 'password-reset',
  ACCOUNT_APPROVED: 'account-approved',
  ACCOUNT_REJECTED: 'account-rejected',
  ATTENDANCE_SUMMARY: 'attendance-summary',
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const;

// Environment Variables
export const ENV_VARS = {
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  EMAIL_SERVICE_API_KEY: process.env.EMAIL_SERVICE_API_KEY,
  SMS_SERVICE_API_KEY: process.env.SMS_SERVICE_API_KEY,
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_FACE_RECOGNITION: process.env.ENABLE_FACE_RECOGNITION !== 'false',
  ENABLE_DOCUMENT_OCR: process.env.ENABLE_DOCUMENT_OCR !== 'false',
  ENABLE_WIFI_VALIDATION: process.env.ENABLE_WIFI_VALIDATION !== 'false',
  ENABLE_GPS_TRACKING: process.env.ENABLE_GPS_TRACKING === 'true',
  ENABLE_EMAIL_NOTIFICATIONS: process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'false',
  ENABLE_SMS_NOTIFICATIONS: process.env.ENABLE_SMS_NOTIFICATIONS === 'true',
  ENABLE_WEBSOCKET: process.env.ENABLE_WEBSOCKET !== 'false',
} as const;

// Time Zones and Localization
export const TIMEZONE_CONSTANTS = {
  DEFAULT_TIMEZONE: 'Asia/Jakarta',
  SUPPORTED_TIMEZONES: [
    'Asia/Jakarta',
    'Asia/Makassar',
    'Asia/Jayapura',
    'UTC',
  ],
  DATE_FORMAT: 'yyyy-MM-dd',
  TIME_FORMAT: 'HH:mm:ss',
  DATETIME_FORMAT: 'yyyy-MM-dd HH:mm:ss',
} as const;

// Application Metadata
export const APP_METADATA = {
  NAME: 'Face Attendance System',
  VERSION: '1.0.0',
  DESCRIPTION: 'Enterprise face recognition attendance system',
  AUTHOR: 'Face Attendance Team',
  SUPPORT_EMAIL: 'support@face-attendance.com',
  COMPANY: 'Face Attendance Inc.',
} as const;

// Export all constants as a single object for easy import
export const CONSTANTS = {
  DB: DB_CONSTANTS,
  CACHE: CACHE_CONSTANTS,
  FACE: FACE_RECOGNITION,
  AUTH: AUTH_CONSTANTS,
  REGISTRATION: REGISTRATION_STEPS,
  ROLES: USER_ROLES,
  STATUS: USER_STATUS,
  DOCUMENTS: DOCUMENT_TYPES,
  ATTENDANCE: ATTENDANCE_CONSTANTS,
  FILES: FILE_UPLOAD,
  LIMITS: RATE_LIMITS,
  WEBSOCKET: WEBSOCKET_EVENTS,
  ERRORS: ERROR_CODES,
  SUCCESS: SUCCESS_MESSAGES,
  EMAILS: EMAIL_TEMPLATES,
  NOTIFICATIONS: NOTIFICATION_TYPES,
  ENV: ENV_VARS,
  FEATURES: FEATURE_FLAGS,
  TIMEZONE: TIMEZONE_CONSTANTS,
  APP: APP_METADATA,
} as const;