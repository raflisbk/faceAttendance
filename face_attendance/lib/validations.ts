import { z } from 'zod';
import { USER_ROLES, USER_STATUS, DOCUMENT_TYPES, AUTH_CONSTANTS } from './constants';

/**
 * Validation Schemas using Zod
 * Centralized validation for all forms and API endpoints
 */

// Common validation patterns
const emailSchema = z.string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(255, 'Email must be less than 255 characters');

const passwordSchema = z.string()
  .min(AUTH_CONSTANTS.PASSWORD_MIN_LENGTH, `Password must be at least ${AUTH_CONSTANTS.PASSWORD_MIN_LENGTH} characters`)
  .max(128, 'Password must be less than 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');

const phoneSchema = z.string()
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
  .min(10, 'Phone number must be at least 10 digits')
  .max(20, 'Phone number must be less than 20 characters');

const nameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s\-\.\']+$/, 'Name can only contain letters, spaces, hyphens, dots, and apostrophes');

// Authentication Schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

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
    .refine(val => val === true, 'You must agree to terms and conditions'),
  agreeToPrivacy: z.boolean()
    .refine(val => val === true, 'You must agree to privacy policy'),
}).superRefine((data, ctx) => {
  // Password confirmation validation
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Passwords don't match",
      path: ['confirmPassword'],
    });
  }

  // Student ID validation
  if (data.role === USER_ROLES.STUDENT && !data.studentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Student ID is required for students',
      path: ['studentId'],
    });
  }

  if (data.role === USER_ROLES.STUDENT && data.studentId && !/^[A-Z0-9]{6,20}$/.test(data.studentId)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Student ID must be 6-20 characters with only uppercase letters and numbers',
      path: ['studentId'],
    });
  }

  // Employee ID validation
  if (data.role === USER_ROLES.LECTURER && !data.employeeId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Employee ID is required for lecturers',
      path: ['employeeId'],
    });
  }

  if (data.role === USER_ROLES.LECTURER && data.employeeId && !/^[A-Z0-9]{6,20}$/.test(data.employeeId)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Employee ID must be 6-20 characters with only uppercase letters and numbers',
      path: ['employeeId'],
    });
  }
});

export const registerStep2Schema = z.object({
  documentType: z.enum([
    DOCUMENT_TYPES.STUDENT_ID,
    DOCUMENT_TYPES.STAFF_ID,
    DOCUMENT_TYPES.NATIONAL_ID,
    DOCUMENT_TYPES.PASSPORT
  ], {
    required_error: 'Document type is required'
  }),
  documentNumber: z.string()
    .min(5, 'Document number must be at least 5 characters')
    .max(50, 'Document number must be less than 50 characters')
    .regex(/^[A-Z0-9\-]+$/, 'Document number can only contain uppercase letters, numbers, and hyphens'),
  documentFile: z.instanceof(File)
    .refine(file => file.size <= 5 * 1024 * 1024, 'File size must be less than 5MB')
    .refine(
      file => ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type),
      'Only JPEG, PNG, and PDF files are allowed'
    ),
  documentExpiryDate: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      return date > new Date();
    }, 'Document expiry date must be in the future'),
});

export const registerStep3Schema = z.object({
  faceImages: z.array(z.instanceof(File))
    .min(3, 'At least 3 face images are required')
    .max(5, 'Maximum 5 face images allowed')
    .refine(
      files => files.every(file => file.size <= 2 * 1024 * 1024),
      'Each image must be less than 2MB'
    )
    .refine(
      files => files.every(file => ['image/jpeg', 'image/png'].includes(file.type)),
      'Only JPEG and PNG images are allowed'
    ),
  consentToFaceData: z.boolean()
    .refine(val => val === true, 'You must consent to face data processing'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "Passwords don't match",
  path: ['confirmNewPassword'],
}).refine(data => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ['newPassword'],
});

// Profile Management Schemas
export const updateProfileSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  avatar: z.instanceof(File)
    .optional()
    .refine(
      file => !file || file.size <= 2 * 1024 * 1024,
      'Avatar must be less than 2MB'
    )
    .refine(
      file => !file || ['image/jpeg', 'image/png'].includes(file.type),
      'Avatar must be a JPEG or PNG image'
    ),
  bio: z.string()
    .max(500, 'Bio must be less than 500 characters')
    .optional(),
  dateOfBirth: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      return age >= 16 && age <= 100;
    }, 'Age must be between 16 and 100 years'),
});

// Class Management Schemas
export const createClassSchema = z.object({
  name: z.string()
    .min(3, 'Class name must be at least 3 characters')
    .max(100, 'Class name must be less than 100 characters'),
  code: z.string()
    .min(3, 'Class code must be at least 3 characters')
    .max(20, 'Class code must be less than 20 characters')
    .regex(/^[A-Z0-9\-]+$/, 'Class code can only contain uppercase letters, numbers, and hyphens'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  locationId: z.string()
    .uuid('Invalid location ID'),
  lecturerId: z.string()
    .uuid('Invalid lecturer ID'),
  schedule: z.array(z.object({
    dayOfWeek: z.number()
      .min(0, 'Invalid day of week')
      .max(6, 'Invalid day of week'),
    startTime: z.string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    endTime: z.string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  }))
  .min(1, 'At least one schedule is required')
  .refine(
    schedules => schedules.every(s => s.startTime < s.endTime),
    'End time must be after start time'
  ),
  capacity: z.number()
    .min(1, 'Capacity must be at least 1')
    .max(500, 'Capacity cannot exceed 500'),
  isActive: z.boolean().default(true),
});

export const updateClassSchema = createClassSchema.partial().extend({
  id: z.string().uuid('Invalid class ID'),
});

export const enrollStudentSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  studentId: z.string().uuid('Invalid student ID'),
});

// Location Management Schemas
export const createLocationSchema = z.object({
  name: z.string()
    .min(3, 'Location name must be at least 3 characters')
    .max(100, 'Location name must be less than 100 characters'),
  address: z.string()
    .min(10, 'Address must be at least 10 characters')
    .max(255, 'Address must be less than 255 characters'),
  wifiSSID: z.string()
    .min(1, 'WiFi SSID is required')
    .max(32, 'WiFi SSID must be less than 32 characters'),
  wifiPassword: z.string()
    .optional(),
  latitude: z.number()
    .min(-90, 'Invalid latitude')
    .max(90, 'Invalid latitude'),
  longitude: z.number()
    .min(-180, 'Invalid longitude')
    .max(180, 'Invalid longitude'),
  radius: z.number()
    .min(10, 'Radius must be at least 10 meters')
    .max(1000, 'Radius cannot exceed 1000 meters')
    .default(100),
  isActive: z.boolean().default(true),
});

export const updateLocationSchema = createLocationSchema.partial().extend({
  id: z.string().uuid('Invalid location ID'),
});

// Attendance Schemas
export const checkInSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  locationId: z.string().uuid('Invalid location ID'),
  faceImage: z.instanceof(File)
    .refine(file => file.size <= 2 * 1024 * 1024, 'Image must be less than 2MB')
    .refine(
      file => ['image/jpeg', 'image/png'].includes(file.type),
      'Only JPEG and PNG images are allowed'
    ),
  wifiSSID: z.string().optional(),
  coordinates: z.object({
    latitude: z.number()
      .min(-90, 'Invalid latitude')
      .max(90, 'Invalid latitude'),
    longitude: z.number()
      .min(-180, 'Invalid longitude')
      .max(180, 'Invalid longitude'),
    accuracy: z.number().optional(),
  }).optional(),
  timestamp: z.date().default(() => new Date()),
});

export const manualAttendanceSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  studentIds: z.array(z.string().uuid('Invalid student ID'))
    .min(1, 'At least one student must be selected'),
  attendanceDate: z.date(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
  notes: z.string()
    .max(255, 'Notes must be less than 255 characters')
    .optional(),
});

export const attendanceReportSchema = z.object({
  classId: z.string().uuid('Invalid class ID').optional(),
  studentId: z.string().uuid('Invalid student ID').optional(),
  startDate: z.date(),
  endDate: z.date(),
  format: z.enum(['pdf', 'excel', 'csv']).default('pdf'),
}).refine(data => data.startDate <= data.endDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

// Admin Schemas
export const userManagementSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
  status: z.enum([
    USER_STATUS.PENDING,
    USER_STATUS.APPROVED,
    USER_STATUS.REJECTED,
    USER_STATUS.SUSPENDED,
    USER_STATUS.INACTIVE
  ]),
  reason: z.string()
    .min(10, 'Reason must be at least 10 characters')
    .max(255, 'Reason must be less than 255 characters')
    .optional(),
});

export const systemConfigSchema = z.object({
  faceRecognitionThreshold: z.number()
    .min(0.1, 'Threshold must be at least 0.1')
    .max(1.0, 'Threshold cannot exceed 1.0'),
  attendanceWindowMinutes: z.number()
    .min(5, 'Window must be at least 5 minutes')
    .max(60, 'Window cannot exceed 60 minutes'),
  maxLoginAttempts: z.number()
    .min(3, 'Must allow at least 3 attempts')
    .max(10, 'Cannot exceed 10 attempts'),
  sessionTimeoutHours: z.number()
    .min(1, 'Session timeout must be at least 1 hour')
    .max(24, 'Session timeout cannot exceed 24 hours'),
  enableEmailNotifications: z.boolean(),
  enableSMSNotifications: z.boolean(),
  enableGPSValidation: z.boolean(),
  enableWiFiValidation: z.boolean(),
});

// API Schemas
export const paginationSchema = z.object({
  page: z.number().min(1, 'Page must be at least 1').default(1),
  limit: z.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(10),
  search: z.string().optional(),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

// File Upload Schemas
export const singleImageSchema = z.object({
  image: z.instanceof(File)
    .refine(file => file.size <= 5 * 1024 * 1024, 'Image must be less than 5MB')
    .refine(
      file => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      'Only JPEG, PNG, and WebP images are allowed'
    ),
});

export const multipleImagesSchema = z.object({
  images: z.array(z.instanceof(File))
    .min(1, 'At least one image is required')
    .max(10, 'Maximum 10 images allowed')
    .refine(
      files => files.every(file => file.size <= 2 * 1024 * 1024),
      'Each image must be less than 2MB'
    )
    .refine(
      files => files.every(file => ['image/jpeg', 'image/png'].includes(file.type)),
      'Only JPEG and PNG images are allowed'
    ),
});

// Type exports for TypeScript
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterStep1Input = z.infer<typeof registerStep1Schema>;
export type RegisterStep2Input = z.infer<typeof registerStep2Schema>;
export type RegisterStep3Input = z.infer<typeof registerStep3Schema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type EnrollStudentInput = z.infer<typeof enrollStudentSchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>;
export type AttendanceReportInput = z.infer<typeof attendanceReportSchema>;
export type UserManagementInput = z.infer<typeof userManagementSchema>;
export type SystemConfigInput = z.infer<typeof systemConfigSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type IdParamInput = z.infer<typeof idParamSchema>;
export type SingleImageInput = z.infer<typeof singleImageSchema>;
export type MultipleImagesInput = z.infer<typeof multipleImagesSchema>;

// Validation helper functions
export const validateSchema = <T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: z.ZodError } => {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
};

export const validateSchemaAsync = async <T>(schema: z.ZodSchema<T>, data: unknown): Promise<{ success: boolean; data?: T; errors?: z.ZodError }> => {
  try {
    const validatedData = await schema.parseAsync(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
};

export const getValidationErrors = (errors: z.ZodError): Record<string, string> => {
  const errorMap: Record<string, string> = {};
  errors.errors.forEach(error => {
    const path = error.path.join('.');
    errorMap[path] = error.message;
  });
  return errorMap;
};

export const formatValidationError = (errors: z.ZodError): string => {
  return errors.errors.map(error => `${error.path.join('.')}: ${error.message}`).join(', ');
};

// lib/validations.ts - Additional Missing Schemas
import { z } from 'zod'

// Location Management Schemas
export const createLocationSchema = z.object({
  name: z.string()
    .min(2, 'Location name must be at least 2 characters')
    .max(100, 'Location name must be less than 100 characters'),
  building: z.string()
    .min(2, 'Building name must be at least 2 characters')
    .max(50, 'Building name must be less than 50 characters'),
  floor: z.string()
    .min(1, 'Floor is required')
    .max(10, 'Floor must be less than 10 characters'),
  capacity: z.number()
    .min(1, 'Capacity must be at least 1')
    .max(1000, 'Capacity cannot exceed 1000'),
  wifiSSID: z.string()
    .min(3, 'WiFi SSID must be at least 3 characters')
    .max(32, 'WiFi SSID cannot exceed 32 characters')
    .regex(/^[a-zA-Z0-9\-_]+$/, 'WiFi SSID can only contain letters, numbers, hyphens, and underscores'),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }).optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional()
})

export const updateLocationSchema = createLocationSchema.partial()

export const validateDocumentSchema = z.object({
  documentType: z.enum(['STUDENT_ID', 'STAFF_ID', 'NATIONAL_ID', 'PASSPORT'], {
    required_error: 'Document type is required'
  }),
  documentNumber: z.string()
    .min(5, 'Document number must be at least 5 characters')
    .max(50, 'Document number must be less than 50 characters'),
  expiryDate: z.date().optional().refine((date) => {
    if (!date) return true
    return date > new Date()
  }, 'Expiry date must be in the future')
})

// Class Management Schemas
export const createClassSchema = z.object({
  name: z.string()
    .min(3, 'Class name must be at least 3 characters')
    .max(100, 'Class name must be less than 100 characters'),
  code: z.string()
    .min(3, 'Class code must be at least 3 characters')
    .max(20, 'Class code must be less than 20 characters')
    .regex(/^[A-Z0-9\-_]+$/, 'Class code can only contain uppercase letters, numbers, hyphens, and underscores'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  department: z.string()
    .min(2, 'Department is required'),
  semester: z.string()
    .min(1, 'Semester is required'),
  academicYear: z.string()
    .regex(/^\d{4}\/\d{4}$/, 'Academic year must be in format YYYY/YYYY'),
  credits: z.number()
    .min(1, 'Credits must be at least 1')
    .max(10, 'Credits cannot exceed 10'),
  capacity: z.number()
    .min(1, 'Capacity must be at least 1')
    .max(200, 'Capacity cannot exceed 200'),
  lecturerId: z.string().uuid('Invalid lecturer ID'),
  locationId: z.string().uuid('Invalid location ID'),
  schedule: z.object({
    dayOfWeek: z.number().min(0).max(6), // 0 = Sunday, 6 = Saturday
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    duration: z.number().min(30).max(300).optional() // minutes
  })
})

export const updateClassSchema = createClassSchema.partial()

// QR Code Generation Schema
export const generateQRCodeSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  sessionDuration: z.number()
    .min(30, 'Session duration must be at least 30 minutes')
    .max(240, 'Session duration cannot exceed 240 minutes')
    .default(60),
  expiresIn: z.number()
    .min(60, 'QR code must be valid for at least 1 minute')
    .max(3600, 'QR code cannot be valid for more than 1 hour')
    .default(300) // 5 minutes default
})

// Check-in Schema
export const checkInSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  method: z.enum(['FACE_RECOGNITION', 'QR_CODE']).default('FACE_RECOGNITION'),
  faceImageData: z.string().optional(), // Base64 image data
  qrData: z.string().optional(), // QR code data
  wifiSSID: z.string().optional(),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }).optional()
}).refine((data) => {
  if (data.method === 'FACE_RECOGNITION') {
    return !!data.faceImageData
  }
  if (data.method === 'QR_CODE') {
    return !!data.qrData
  }
  return true
}, {
  message: 'Face image data is required for face recognition, QR data is required for QR code method'
})

// User Creation Schema (Admin)
export const createUserSchema = z.object({
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters'),
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters'),
  email: z.string()
    .email('Please enter a valid email address')
    .toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  phoneNumber: z.string()
    .regex(/^(\+62|62|0)[0-9]{8,12}$/, 'Please enter a valid Indonesian phone number'),
  role: z.enum(['ADMIN', 'LECTURER', 'STUDENT']),
  department: z.string().min(2, 'Department is required'),
  studentId: z.string().optional(),
  employeeId: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().max(200, 'Address must be less than 200 characters').optional(),
  emergencyContact: z.string().max(100, 'Emergency contact must be less than 100 characters').optional()
}).superRefine((data, ctx) => {
  // Student ID validation
  if (data.role === 'STUDENT' && !data.studentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Student ID is required for students',
      path: ['studentId']
    })
  }

  // Employee ID validation
  if (data.role === 'LECTURER' && !data.employeeId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Employee ID is required for lecturers',
      path: ['employeeId']
    })
  }
})

// System Configuration Schema
export const systemConfigSchema = z.object({
  faceRecognitionThreshold: z.number()
    .min(0.1, 'Threshold must be at least 0.1')
    .max(1.0, 'Threshold cannot exceed 1.0'),
  attendanceWindowMinutes: z.number()
    .min(5, 'Window must be at least 5 minutes')
    .max(60, 'Window cannot exceed 60 minutes'),
  maxLoginAttempts: z.number()
    .min(3, 'Must allow at least 3 attempts')
    .max(10, 'Cannot exceed 10 attempts'),
  sessionTimeoutHours: z.number()
    .min(1, 'Session timeout must be at least 1 hour')
    .max(24, 'Session timeout cannot exceed 24 hours'),
  enableEmailNotifications: z.boolean(),
  enableSMSNotifications: z.boolean(),
  enableGPSValidation: z.boolean(),
  enableWiFiValidation: z.boolean()
})

// Constants file - lib/constants.ts
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  LECTURER: 'LECTURER', 
  STUDENT: 'STUDENT'
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
  PASSPORT: 'PASSPORT'
} as const

export const ATTENDANCE_STATUS = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  EXCUSED: 'EXCUSED'
} as const

export const ATTENDANCE_METHODS = {
  FACE_RECOGNITION: 'FACE_RECOGNITION',
  QR_CODE: 'QR_CODE',
  MANUAL: 'MANUAL'
} as const

export const CLASS_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  COMPLETED: 'COMPLETED',
  DRAFT: 'DRAFT'
} as const

export const FACE_PROFILE_STATUS = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
} as const

export const DOCUMENT_STATUS = {
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  REUPLOAD_REQUIRED: 'REUPLOAD_REQUIRED'
} as const

export const LOCATION_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  MAINTENANCE: 'MAINTENANCE'
} as const

// Error Codes
export const ERROR_CODES = {
  // Authentication Errors
  UNAUTHORIZED: 'AUTH_001',
  INVALID_CREDENTIALS: 'AUTH_002',
  TOKEN_EXPIRED: 'AUTH_003',
  ACCOUNT_LOCKED: 'AUTH_004',
  EMAIL_NOT_VERIFIED: 'AUTH_005',
  
  // Authorization Errors  
  INSUFFICIENT_PERMISSIONS: 'AUTHZ_001',
  ROLE_REQUIRED: 'AUTHZ_002',
  RESOURCE_ACCESS_DENIED: 'AUTHZ_003',
  
  // Face Recognition Errors
  FACE_NOT_DETECTED: 'FACE_001',
  MULTIPLE_FACES: 'FACE_002', 
  POOR_IMAGE_QUALITY: 'FACE_003',
  FACE_MATCH_FAILED: 'FACE_004',
  LIVENESS_CHECK_FAILED: 'FACE_005',
  
  // Attendance Errors
  CLASS_NOT_IN_SESSION: 'ATT_001',
  ALREADY_CHECKED_IN: 'ATT_002',
  WIFI_VALIDATION_FAILED: 'ATT_003',
  LOCATION_MISMATCH: 'ATT_004',
  CHECK_IN_WINDOW_CLOSED: 'ATT_005',
  
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
  MAINTENANCE_MODE: 'SYS_004'
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  USER_CREATED: 'User account created successfully',
  LOGIN_SUCCESSFUL: 'Login successful',
  FACE_ENROLLED: 'Face profile enrolled successfully',
  ATTENDANCE_RECORDED: 'Attendance recorded successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  DOCUMENT_VERIFIED: 'Document verified successfully',
  CLASS_CREATED: 'Class created successfully',
  LOCATION_CREATED: 'Location created successfully'
} as const

// Email Templates
export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  EMAIL_VERIFICATION: 'email-verification',
  PASSWORD_RESET: 'password-reset',
  ACCOUNT_APPROVED: 'account-approved',
  ACCOUNT_REJECTED: 'account-rejected',
  ATTENDANCE_SUMMARY: 'attendance-summary'
} as const

// Face Recognition Configuration
export const FACE_CONFIG = {
  MIN_RESOLUTION: { width: 480, height: 640 },
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  QUALITY_THRESHOLD: 0.85,
  CONFIDENCE_THRESHOLD: 0.6,
  MAX_FACE_ANGLE: 15, // degrees
  MIN_FACE_SIZE_RATIO: 0.4, // 40% of image
  MAX_FACE_SIZE_RATIO: 0.7, // 70% of image
  BRIGHTNESS_RANGE: { min: 50, max: 200 },
  BLUR_THRESHOLD: 30
} as const

// Attendance Configuration
export const ATTENDANCE_CONFIG = {
  CHECK_IN_WINDOW_BEFORE: 30, // minutes before class starts
  CHECK_IN_WINDOW_AFTER: 15, // minutes after class starts
  LATE_THRESHOLD: 10, // minutes after class starts
  DEFAULT_SESSION_DURATION: 120, // minutes
  QR_CODE_EXPIRY: 300, // 5 minutes
  MAX_DAILY_CHECK_INS: 10
} as const

// Location Configuration  
export const LOCATION_CONFIG = {
  MAX_CAPACITY: 1000,
  MIN_CAPACITY: 1,
  WIFI_SSID_MAX_LENGTH: 32,
  GPS_ACCURACY_THRESHOLD: 100, // meters
  BUILDING_FLOORS: ['B2', 'B1', 'G', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
} as const

// Pagination Configuration
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 5
} as const

// File Upload Configuration
export const UPLOAD_CONFIG = {
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_DOCUMENT_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FACE_IMAGES: 5,
  MIN_FACE_IMAGES: 3
} as const

// Cache Configuration
export const CACHE_CONFIG = {
  USER_PROFILE_TTL: 3600, // 1 hour
  CLASS_LIST_TTL: 300, // 5 minutes  
  ATTENDANCE_STATS_TTL: 900, // 15 minutes
  LOCATION_LIST_TTL: 600, // 10 minutes
  DASHBOARD_STATS_TTL: 300, // 5 minutes
  QR_SESSION_TTL: 300, // 5 minutes
  EMAIL_VERIFICATION_TTL: 3600, // 1 hour
  PHONE_VERIFICATION_TTL: 300, // 5 minutes
  PASSWORD_RESET_TTL: 1800 // 30 minutes
} as const

// Environment Configuration
export const ENV_CONFIG = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL!,
  REDIS_URL: process.env.REDIS_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME!,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY!,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET!,
  EMAIL_SERVICE_API_KEY: process.env.EMAIL_SERVICE_API_KEY,
  SMS_SERVICE_API_KEY: process.env.SMS_SERVICE_API_KEY
} as const

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_FACE_RECOGNITION: true,
  ENABLE_QR_CODE_BACKUP: true,
  ENABLE_GPS_VALIDATION: true,
  ENABLE_WIFI_VALIDATION: true,
  ENABLE_EMAIL_NOTIFICATIONS: true,
  ENABLE_SMS_NOTIFICATIONS: false,
  ENABLE_OFFLINE_MODE: true,
  ENABLE_PWA: true,
  ENABLE_ANALYTICS: true,
  ENABLE_ERROR_TRACKING: true
} as const