/**
 * Shared API types and interfaces
 */

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  details?: any
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// User types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'STUDENT' | 'LECTURER' | 'ADMIN'
  studentId?: string
  employeeId?: string
  isActive: boolean
  emailVerified: boolean
  createdAt: string
  updatedAt: string
}

// Class types
export interface ClassSchedule {
  id: string
  dayOfWeek: number // 0 = Sunday, 6 = Saturday
  startTime: string
  endTime: string
}

export interface Location {
  id: string
  name: string
  building?: string
  address: string
  latitude: number
  longitude: number
  radius: number
  wifiSSID: string
  isActive: boolean
}

export interface AvailableClass {
  id: string
  name: string
  code: string
  lecturer: {
    name: string
  }
  location: {
    id: string
    name: string
    building?: string
    wifiSSID: string
  }
  schedule: {
    startTime: string
    endTime: string
    dayOfWeek: number
  }
  canCheckIn: boolean
  isInSession: boolean
  hasCheckedIn?: boolean
  timeUntilStart?: number // minutes
  timeUntilEnd?: number // minutes
  attendance?: {
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
    checkInTime?: string
  }
}

// Attendance types
export interface AttendanceRecord {
  id: string
  studentId: string
  classId: string
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
  checkInTime?: string
  date: string
  method: 'FACE_RECOGNITION' | 'QR_CODE' | 'MANUAL'
  confidence?: number
  location?: string
  notes?: string
}

export interface CheckInData {
  classId: string
  locationId: string
  faceImage?: File
  method: 'FACE_RECOGNITION' | 'QR_CODE'
  wifiSSID?: string
  coordinates?: {
    latitude: number
    longitude: number
    accuracy?: number
  }
}

// Face recognition types
export interface FaceProfile {
  id: string
  userId: string
  images: string[]
  descriptors: number[]
  status: 'INCOMPLETE' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
  createdAt: string
  lastUpdated: string
}

export interface FaceVerificationResult {
  isMatch: boolean
  confidence: number
  distance: number
  quality: {
    isValid: boolean
    score: number
    issues: string[]
  }
}

// Document types
export interface Document {
  id: string
  userId: string
  type: 'ID_CARD' | 'STUDENT_CARD' | 'TRANSCRIPT' | 'CERTIFICATE'
  number: string
  url: string
  expiryDate?: string
  extractedText?: string
  ocrConfidence?: number
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | 'NEEDS_REVIEW'
  uploadedAt: string
  verifiedAt?: string
  verifiedBy?: string
  verificationNotes?: string
}

// Statistics types
export interface StudentStats {
  totalClasses: number
  attendanceRate: number
  presentCount: number
  lateCount: number
  absentCount: number
  excusedCount: number
  currentStreak: number
  longestStreak: number
}

export interface ClassStats {
  totalStudents: number
  averageAttendanceRate: number
  sessionsHeld: number
  totalSessions: number
}

// Error types
export interface ApiError extends Error {
  code?: string
  status?: number
  details?: any
}

// Form data types
export interface LoginFormData {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: 'STUDENT' | 'LECTURER'
  studentId?: string
  employeeId?: string
  password: string
  confirmPassword: string
  agreeToTerms: boolean
  agreeToPrivacy: boolean
}

// WiFi validation types
export interface WifiValidationResult {
  isValid: boolean
  confidence: number
  distance?: number
  message: string
}

export interface LocationCoordinates {
  latitude: number
  longitude: number
  accuracy?: number
}

// QR Code types
export interface QRCodeData {
  classId: string
  sessionId: string
  expiresAt: string
  locationId: string
  timestamp: string
}