import { z } from 'zod'

// Constants
export const USER_ROLES = {
  STUDENT: 'STUDENT',
  LECTURER: 'LECTURER',
  ADMIN: 'ADMIN'
} as const

export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  SUSPENDED: 'SUSPENDED',
  REJECTED: 'REJECTED'
} as const

export const DOCUMENT_TYPES = {
  STUDENT_ID: 'STUDENT_ID',
  STAFF_ID: 'STAFF_ID',
  NATIONAL_ID: 'NATIONAL_ID',
  PASSPORT: 'PASSPORT',
  DRIVING_LICENSE: 'DRIVING_LICENSE'
} as const

// Common validation patterns
const emailSchema = z.string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(255, 'Email must be less than 255 characters')

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')

const phoneSchema = z.string()
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
  .min(10, 'Phone number must be at least 10 digits')
  .max(20, 'Phone number must be less than 20 characters')

const nameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s\-\.\']+$/, 'Name can only contain letters, spaces, hyphens, dots, and apostrophes')

// Authentication Schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
})

export const registerStep1Schema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  role: z.enum([USER_ROLES.STUDENT, USER_ROLES.LECTURER], {
    required_error: 'Role is required',
    invalid_type_error: 'Invalid role selected'
  }),
  studentId: z.string().optional(),
  employeeId: z.string().optional(),
  password: passwordSchema,
  confirmPassword: z.string(),
  agreeToTerms: z.boolean()
    .refine((val) => val === true, 'You must agree to the terms and conditions'),
  agreeToPrivacy: z.boolean()
    .refine((val) => val === true, 'You must agree to the privacy policy'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.role === USER_ROLES.STUDENT) {
    return data.studentId && data.studentId.length > 0
  }
  if (data.role === USER_ROLES.LECTURER) {
    return data.employeeId && data.employeeId.length > 0
  }
  return true
}, {
  message: "Student ID is required for students",
  path: ["studentId"],
})

export const createUserSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  role: z.enum([USER_ROLES.STUDENT, USER_ROLES.LECTURER, USER_ROLES.ADMIN]),
  studentId: z.string().optional(),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  password: passwordSchema.optional(),
  isActive: z.boolean().default(true),
  // Profile fields
  dateOfBirth: z.date().optional(),
  address: z.string().max(500, 'Address too long').optional(),
  emergencyContact: z.string().max(100, 'Emergency contact too long').optional(),
  bio: z.string().max(1000, 'Bio too long').optional(),
})

export const updateUserSchema = createUserSchema.partial().omit({ password: true })

// Document validation schemas
export const documentUploadSchema = z.object({
  type: z.enum([
    DOCUMENT_TYPES.STUDENT_ID,
    DOCUMENT_TYPES.STAFF_ID,
    DOCUMENT_TYPES.NATIONAL_ID,
    DOCUMENT_TYPES.PASSPORT,
    DOCUMENT_TYPES.DRIVING_LICENSE
  ]),
  file: z.any().refine((file) => file instanceof File, 'Valid file is required'),
  description: z.string().optional(),
})

export const validateDocumentSchema = z.object({
  documentType: z.enum([
    DOCUMENT_TYPES.STUDENT_ID,
    DOCUMENT_TYPES.STAFF_ID,
    DOCUMENT_TYPES.NATIONAL_ID,
    DOCUMENT_TYPES.PASSPORT,
    DOCUMENT_TYPES.DRIVING_LICENSE
  ]),
  documentNumber: z.string().min(1, 'Document number is required'),
  expiryDate: z.date().nullable().optional(),
})

export const faceProfileSchema = z.object({
  images: z.array(z.any()).min(3, 'At least 3 face images are required').max(5, 'Maximum 5 images allowed'),
  userId: z.string().uuid('Invalid user ID'),
})

// Class management schemas
export const createClassSchema = z.object({
  name: z.string().min(1, 'Class name is required').max(200, 'Name too long'),
  code: z.string().min(1, 'Class code is required').max(20, 'Code too long'),
  description: z.string().optional(),
  department: z.string().min(1, 'Department is required'),
  semester: z.string().min(1, 'Semester is required'),
  academicYear: z.string().min(1, 'Academic year is required'),
  credits: z.number().int().min(1, 'Credits must be at least 1').max(10, 'Credits too high'),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(1000, 'Capacity too large'),
  lecturerId: z.string().uuid('Invalid lecturer ID'),
  locationId: z.string().uuid('Invalid location ID'),
  schedule: z.object({
    dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    duration: z.number().int().min(30, 'Duration must be at least 30 minutes').max(480, 'Duration too long').optional(),
  }),
})

export const updateClassSchema = createClassSchema.partial()

// Location management schemas
export const createLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required').max(200, 'Name too long'),
  building: z.string().min(1, 'Building name is required').max(200, 'Building name too long'),
  floor: z.string().min(1, 'Floor is required').max(50, 'Floor too long'),
  room: z.string().min(1, 'Room is required').max(50, 'Room too long'),
  wifiSsid: z.string().min(1, 'WiFi SSID is required').max(100, 'SSID too long'),
  wifiSecurity: z.string().optional(),
  gpsCoordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }).optional(),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(1000, 'Capacity too large'),
  additionalInfo: z.record(z.any()).optional(),
  isActive: z.boolean().default(true),
})

export const updateLocationSchema = createLocationSchema.partial()

// Attendance schemas
export const checkInSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  locationId: z.string().uuid('Invalid location ID'),
  faceImage: z.any().refine((file) => file instanceof File, 'Face image is required'),
  method: z.enum(['FACE_RECOGNITION', 'QR_CODE']).default('FACE_RECOGNITION'),
  timestamp: z.date().default(() => new Date()),
  wifiSsid: z.string().optional(),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().optional(),
  }).optional(),
})

export const manualAttendanceSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  classId: z.string().uuid('Invalid class ID'),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
  date: z.date().default(() => new Date()),
  notes: z.string().optional(),
})

// QR Code generation schema
export const generateQRCodeSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  sessionDuration: z.number().int().min(1).max(480).default(60), // minutes
  expiresIn: z.number().int().min(60).max(3600).default(300), // seconds
})

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// Report schemas
export const attendanceReportSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  classIds: z.array(z.string().uuid()).optional(),
  studentIds: z.array(z.string().uuid()).optional(),
  format: z.enum(['PDF', 'CSV', 'EXCEL']).default('PDF'),
})

// Profile update schema
export const profileUpdateSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phone: phoneSchema.optional(),
  currentPassword: z.string().optional(),
  newPassword: passwordSchema.optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.newPassword) {
    return data.currentPassword && data.confirmPassword
  }
  return true
}, {
  message: "Current password and confirmation are required when changing password",
  path: ["currentPassword"],
}).refine((data) => {
  if (data.newPassword && data.confirmPassword) {
    return data.newPassword === data.confirmPassword
  }
  return true
}, {
  message: "New passwords don't match",
  path: ["confirmPassword"],
})

// Password reset schemas
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
})

export const passwordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Email verification schema
export const emailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
})

// System configuration schema
export const systemConfigSchema = z.object({
  siteName: z.string().min(1, 'Site name is required'),
  siteDescription: z.string().optional(),
  allowSelfRegistration: z.boolean().default(true),
  requireEmailVerification: z.boolean().default(true),
  requireDocumentUpload: z.boolean().default(true),
  attendanceGracePeriod: z.number().int().min(0).max(60).default(15), // minutes
  faceRecognitionThreshold: z.number().min(0).max(1).default(0.6),
  locationRadius: z.number().min(1).max(1000).default(100), // meters
  sessionTimeout: z.number().int().min(300).max(86400).default(3600), // seconds
})

// Type exports
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterStep1Input = z.infer<typeof registerStep1Schema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type CreateClassInput = z.infer<typeof createClassSchema>
export type UpdateClassInput = z.infer<typeof updateClassSchema>
export type CreateLocationInput = z.infer<typeof createLocationSchema>
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>
export type CheckInInput = z.infer<typeof checkInSchema>
export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>
export type GenerateQRCodeInput = z.infer<typeof generateQRCodeSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
export type AttendanceReportInput = z.infer<typeof attendanceReportSchema>
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>
export type PasswordResetInput = z.infer<typeof passwordResetSchema>
export type EmailVerificationInput = z.infer<typeof emailVerificationSchema>
export type SystemConfigInput = z.infer<typeof systemConfigSchema>