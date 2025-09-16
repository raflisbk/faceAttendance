// face_attendance/lib/api-routes.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { ErrorUtils } from './utils'
import { ERROR_CODES } from './constants'

export interface APIContext {
  user?: {
    id: string
    email: string
    role: string
    status: string
  }
  session?: any
  ip: string
  userAgent: string
}

export interface APIError {
  code: string
  message: string
  details?: any
  status: number
}

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: APIError
  meta?: {
    timestamp: string
    requestId: string
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

export type APIHandler<T = any> = (
  request: NextRequest,
  context: APIContext
) => Promise<NextResponse<APIResponse<T>>>

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface RouteConfig {
  methods: HTTPMethod[]
  requireAuth?: boolean | undefined
  requiredRoles?: string[] | undefined
  rateLimit?: {
    requests: number
    windowMs: number
  } | undefined
  validation?: {
    body?: z.ZodSchema | undefined
    query?: z.ZodSchema | undefined
    params?: z.ZodSchema | undefined
  } | undefined
}

/**
 * API Route Builder and Middleware Handler
 */
export class APIRouteBuilder {
  private handlers = new Map<HTTPMethod, APIHandler>()
  private config: RouteConfig = {
    methods: ['GET'],
    requireAuth: false
  }
  private static rateLimitStore = new Map<string, { count: number; resetTime: number }>()

  /**
   * Set route configuration
   */
  configure(config: Partial<RouteConfig>): APIRouteBuilder {
    this.config = { ...this.config, ...config }
    return this
  }

  /**
   * Add GET handler
   */
  get(handler: APIHandler): APIRouteBuilder {
    this.handlers.set('GET', handler)
    if (!this.config.methods.includes('GET')) {
      this.config.methods.push('GET')
    }
    return this
  }

  /**
   * Add POST handler
   */
  post(handler: APIHandler): APIRouteBuilder {
    this.handlers.set('POST', handler)
    if (!this.config.methods.includes('POST')) {
      this.config.methods.push('POST')
    }
    return this
  }

  /**
   * Add PUT handler
   */
  put(handler: APIHandler): APIRouteBuilder {
    this.handlers.set('PUT', handler)
    if (!this.config.methods.includes('PUT')) {
      this.config.methods.push('PUT')
    }
    return this
  }

  /**
   * Add PATCH handler
   */
  patch(handler: APIHandler): APIRouteBuilder {
    this.handlers.set('PATCH', handler)
    if (!this.config.methods.includes('PATCH')) {
      this.config.methods.push('PATCH')
    }
    return this
  }

  /**
   * Add DELETE handler
   */
  delete(handler: APIHandler): APIRouteBuilder {
    this.handlers.set('DELETE', handler)
    if (!this.config.methods.includes('DELETE')) {
      this.config.methods.push('DELETE')
    }
    return this
  }

  /**
   * Build the final route handler
   */
  build(): (request: NextRequest, context?: any) => Promise<NextResponse> {
    return async (request: NextRequest, context?: any) => {
      const requestId = crypto.randomUUID()
      const startTime = Date.now()

      try {
        // Method validation
        const method = request.method as HTTPMethod
        if (!this.config.methods.includes(method)) {
          return this.createErrorResponse({
            code: 'METHOD_NOT_ALLOWED',
            message: `Method ${method} not allowed`,
            status: 405
          }, requestId)
        }

        // Get client info
        const ip = this.getClientIP(request)
        const userAgent = request.headers.get('user-agent') || 'Unknown'

        // Rate limiting (simplified implementation)
        if (this.config.rateLimit) {
          const rateLimitResult = this.checkRateLimit(
            ip,
            `api:${request.nextUrl.pathname}`,
            this.config.rateLimit.requests,
            this.config.rateLimit.windowMs
          )

          if (!rateLimitResult.allowed) {
            return this.createErrorResponse({
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests',
              status: 429,
              details: {
                resetTime: rateLimitResult.resetTime
              }
            }, requestId)
          }
        }

        // Authentication
        let apiContext: APIContext = { ip, userAgent }
        
        if (this.config.requireAuth) {
          const session = await getServerSession()
          
          if (!session || !session.user) {
            return this.createErrorResponse({
              code: ERROR_CODES.UNAUTHORIZED,
              message: 'Authentication required',
              status: 401
            }, requestId)
          }

          apiContext.user = session.user as any
          apiContext.session = session
        }

        // Role validation
        if (this.config.requiredRoles && this.config.requiredRoles.length > 0) {
          if (!apiContext.user || !this.config.requiredRoles.includes(apiContext.user.role)) {
            return this.createErrorResponse({
              code: ERROR_CODES.UNAUTHORIZED,
              message: 'Insufficient permissions',
              status: 403
            }, requestId)
          }
        }

        // Request validation
        if (this.config.validation) {
          const validationResult = await this.validateRequest(request, context)
          if (!validationResult.success) {
            return this.createErrorResponse({
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed',
              status: 400,
              details: validationResult.errors
            }, requestId)
          }
        }

        // Execute handler
        const handler = this.handlers.get(method)
        if (!handler) {
          return this.createErrorResponse({
            code: 'HANDLER_NOT_FOUND',
            message: `No handler for ${method}`,
            status: 500
          }, requestId)
        }

        const response = await handler(request, apiContext)
        
        // Add performance headers
        const processingTime = Date.now() - startTime
        response.headers.set('X-Processing-Time', `${processingTime}ms`)
        response.headers.set('X-Request-ID', requestId)

        return response

      } catch (error) {
        console.error('API Route Error:', error)
        
        return this.createErrorResponse({
          code: 'INTERNAL_SERVER_ERROR',
          message: process.env.NODE_ENV === 'development' 
            ? ErrorUtils.getUserFriendlyMessage(error)
            : 'Internal server error',
          status: 500,
          details: process.env.NODE_ENV === 'development' ? error : undefined
        }, requestId)
      }
    }
  }

  /**
   * Validate request data
   */
  private async validateRequest(
    request: NextRequest,
    context?: any
  ): Promise<{ success: boolean; errors?: any }> {
    const errors: any = {}

    try {
      // Validate body
      if (this.config.validation?.body && (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH')) {
        try {
          const body = await request.json()
          this.config.validation.body.parse(body)
        } catch (error) {
          errors.body = error instanceof z.ZodError ? error.errors : 'Invalid body format'
        }
      }

      // Validate query parameters
      if (this.config.validation?.query) {
        try {
          const url = new URL(request.url)
          const query = Object.fromEntries(url.searchParams.entries())
          this.config.validation.query.parse(query)
        } catch (error) {
          errors.query = error instanceof z.ZodError ? error.errors : 'Invalid query parameters'
        }
      }

      // Validate path parameters
      if (this.config.validation?.params && context?.params) {
        try {
          this.config.validation.params.parse(context.params)
        } catch (error) {
          errors.params = error instanceof z.ZodError ? error.errors : 'Invalid path parameters'
        }
      }

      return {
        success: Object.keys(errors).length === 0,
        errors: Object.keys(errors).length > 0 ? errors : undefined
      }
    } catch (error) {
      return {
        success: false,
        errors: { general: 'Validation failed' }
      }
    }
  }

  /**
   * Simple rate limiting implementation
   */
  private checkRateLimit(
    key: string,
    endpoint: string,
    requests: number,
    windowMs: number
  ): { allowed: boolean; resetTime?: number } {
    const rateLimitKey = `${key}:${endpoint}`
    const now = Date.now()
    const rateLimitData = APIRouteBuilder.rateLimitStore.get(rateLimitKey)

    if (!rateLimitData || now > rateLimitData.resetTime) {
      // First request or window expired
      APIRouteBuilder.rateLimitStore.set(rateLimitKey, {
        count: 1,
        resetTime: now + windowMs
      })
      return { allowed: true }
    }

    if (rateLimitData.count >= requests) {
      return { allowed: false, resetTime: rateLimitData.resetTime }
    }

    // Increment count
    rateLimitData.count++
    return { allowed: true }
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    
    if (forwarded) {
      const firstIp = forwarded.split(',')[0]
      return firstIp ? firstIp.trim() : 'unknown'
    }
    
    if (realIP) {
      return realIP
    }
    
    return 'unknown'
  }

  /**
   * Create error response
   */
  private createErrorResponse(error: APIError, requestId: string): NextResponse<APIResponse> {
    const response: APIResponse = {
      success: false,
      error,
      meta: {
        timestamp: new Date().toISOString(),
        requestId
      }
    }

    return NextResponse.json(response, { status: error.status })
  }
}

/**
 * Helper functions for common API patterns
 */
export class APIHelpers {
  /**
   * Create success response
   */
  static success<T>(
    data: T,
    meta?: {
      pagination?: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    }
  ): NextResponse<APIResponse<T>> {
    const response: APIResponse<T> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        ...meta
      }
    }

    return NextResponse.json(response)
  }

  /**
   * Create error response
   */
  static error(
    message: string,
    code: string = 'GENERIC_ERROR',
    status: number = 400,
    details?: any
  ): NextResponse<APIResponse> {
    const response: APIResponse = {
      success: false,
      error: {
        code,
        message,
        details,
        status
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    }

    return NextResponse.json(response, { status })
  }

  /**
   * Parse request body safely
   */
  static async parseBody<T>(request: NextRequest): Promise<T | null> {
    try {
      return await request.json()
    } catch (error) {
      return null
    }
  }

  /**
   * Parse query parameters
   */
  static parseQuery(request: NextRequest): Record<string, string> {
    const url = new URL(request.url)
    return Object.fromEntries(url.searchParams.entries())
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(query: Record<string, string>): {
    page: number
    limit: number
    offset: number
  } {
    const page = Math.max(1, parseInt(query.page || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10')))
    const offset = (page - 1) * limit

    return { page, limit, offset }
  }

  /**
   * Create pagination metadata
   */
  static createPaginationMeta(
    page: number,
    limit: number,
    total: number
  ): {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  } {
    const totalPages = Math.ceil(total / limit)
    
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(
    file: File,
    options: {
      maxSize?: number // in bytes
      allowedTypes?: string[]
      allowedExtensions?: string[]
    } = {}
  ): { valid: boolean; error?: string } {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
      allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp']
    } = options

    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum limit of ${Math.round(maxSize / 1024 / 1024)}MB`
      }
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}`
      }
    }

    // Check file extension
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    if (!allowedExtensions.includes(fileExtension)) {
      return {
        valid: false,
        error: `File extension ${fileExtension} not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`
      }
    }

    return { valid: true }
  }

  /**
   * Generate API key
   */
  static generateAPIKey(prefix: string = 'fka'): string {
    const timestamp = Date.now().toString(36)
    const randomBytes = crypto.getRandomValues(new Uint8Array(16))
    const randomString = Array.from(randomBytes, byte => byte.toString(36)).join('')
    
    return `${prefix}_${timestamp}_${randomString}`
  }

  /**
   * Hash API key for storage
   */
  static async hashAPIKey(apiKey: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(apiKey)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Verify API key
   */
  static async verifyAPIKey(apiKey: string, hashedKey: string): Promise<boolean> {
    const hashedInput = await this.hashAPIKey(apiKey)
    return hashedInput === hashedKey
  }
}

/**
 * Common validation schemas
 */
export const ValidationSchemas = {
  // Pagination
  pagination: z.object({
    page: z.string().optional().transform(val => parseInt(val || '1')),
    limit: z.string().optional().transform(val => parseInt(val || '10')),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
  }),

  // User registration
  userRegistration: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().min(10).max(15).optional(),
    password: z.string().min(8),
    confirmPassword: z.string(),
    role: z.enum(['STUDENT', 'LECTURER']),
    studentId: z.string().optional(),
    employeeId: z.string().optional(),
    agreeToTerms: z.boolean().refine(val => val === true),
    agreeToPrivacy: z.boolean().refine(val => val === true)
  }).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  }),

  // User login
  userLogin: z.object({
    email: z.string().email(),
    password: z.string().min(1),
    rememberMe: z.boolean().optional().default(false)
  }),

  // Password reset
  passwordReset: z.object({
    token: z.string().min(1),
    password: z.string().min(8),
    confirmPassword: z.string()
  }).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  }),

  // Class creation
  classCreation: z.object({
    name: z.string().min(3).max(100),
    code: z.string().min(3).max(10),
    description: z.string().optional(),
    lecturerId: z.string().uuid(),
    locationId: z.string().uuid(),
    schedule: z.object({
      dayOfWeek: z.number().min(0).max(6),
      startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    }),
    capacity: z.number().min(1).max(500),
    semester: z.string().min(1),
    credits: z.number().min(1).max(10)
  }),

  // Attendance check-in
  attendanceCheckIn: z.object({
    classId: z.string().uuid(),
    method: z.enum(['FACE_RECOGNITION', 'QR_CODE', 'MANUAL']),
    faceData: z.object({
      confidence: z.number().min(0).max(1).optional(),
      descriptor: z.array(z.number()).optional(),
      image: z.string().optional()
    }).optional(),
    location: z.object({
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      wifiSSID: z.string().optional()
    }).optional()
  }),

  // Face enrollment
  faceEnrollment: z.object({
    images: z.array(z.string()).min(3).max(5), // Base64 encoded images
    quality: z.object({
      averageScore: z.number().min(0).max(1),
      allPassed: z.boolean()
    })
  }),

  // OTP verification
  otpVerification: z.object({
    otpId: z.string().uuid(),
    code: z.string().min(4).max(8),
    identifier: z.string().optional()
  }),

  // Report generation
  reportGeneration: z.object({
    type: z.enum(['student', 'class', 'system']),
    format: z.enum(['pdf', 'excel', 'csv', 'json']),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }),
    filters: z.record(z.any()).optional()
  })
}

/**
 * Middleware functions
 */
export class APIMiddleware {
  /**
   * CORS middleware
   */
  static cors(origins: string[] = ['*']) {
    return (request: NextRequest) => {
      const origin = request.headers.get('origin')
      
      if (origins.includes('*') || (origin && origins.includes(origin))) {
        return {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      }
      
      return {}
    }
  }

  /**
   * Security headers middleware
   */
  static securityHeaders() {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    }
  }

  /**
   * Request logging middleware
   */
  static requestLogger() {
    return (request: NextRequest, context: APIContext) => {
      const timestamp = new Date().toISOString()
      const method = request.method
      const url = request.nextUrl.pathname
      const userAgent = request.headers.get('user-agent')
      const ip = context.ip
      
      console.log(`[${timestamp}] ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent}`)
    }
  }

  /**
   * API versioning middleware
   */
  static apiVersioning(supportedVersions: string[] = ['v1']) {
    return (request: NextRequest) => {
      const version = request.headers.get('API-Version') || 'v1'
      
      if (!supportedVersions.includes(version)) {
        throw new Error(`API version ${version} not supported. Supported versions: ${supportedVersions.join(', ')}`)
      }
      
      return { version }
    }
  }
}

/**
 * Route factory for common patterns
 */
export class RouteFactory {
  /**
   * Create CRUD routes for a resource
   */
  static createCRUDRoutes(config: {
    resource: string
    createSchema?: z.ZodSchema
    updateSchema?: z.ZodSchema
    querySchema?: z.ZodSchema
    requireAuth?: boolean
    requiredRoles?: string[]
    rateLimit?: { requests: number; windowMs: number }
  }) {
    const baseConfig = {
      requireAuth: config.requireAuth ?? true,
      requiredRoles: config.requiredRoles,
      rateLimit: config.rateLimit ?? { requests: 100, windowMs: 15 * 60 * 1000 }
    }

    return {
      // GET /api/resource - List resources
      list: new APIRouteBuilder()
        .configure({
          ...baseConfig,
          methods: ['GET'],
          validation: { query: config.querySchema }
        })
        .get(async (_request, _context) => {
          // Implementation would be provided by consumer
          throw new Error('List handler not implemented')
        })
        .build(),

      // GET /api/resource/[id] - Get single resource
      get: new APIRouteBuilder()
        .configure({
          ...baseConfig,
          methods: ['GET']
        })
        .get(async (_request, _context) => {
          throw new Error('Get handler not implemented')
        })
        .build(),

      // POST /api/resource - Create resource
      create: new APIRouteBuilder()
        .configure({
          ...baseConfig,
          methods: ['POST'],
          validation: { body: config.createSchema }
        })
        .post(async (_request, _context) => {
          throw new Error('Create handler not implemented')
        })
        .build(),

      // PUT /api/resource/[id] - Update resource
      update: new APIRouteBuilder()
        .configure({
          ...baseConfig,
          methods: ['PUT'],
          validation: { body: config.updateSchema }
        })
        .put(async (_request, _context) => {
          throw new Error('Update handler not implemented')
        })
        .build(),

      // DELETE /api/resource/[id] - Delete resource
      delete: new APIRouteBuilder()
        .configure({
          ...baseConfig,
          methods: ['DELETE']
        })
        .delete(async (_request, _context) => {
          throw new Error('Delete handler not implemented')
        })
        .build()
    }
  }

  /**
   * Create auth routes
   */
  static createAuthRoutes() {
    return {
      login: new APIRouteBuilder()
        .configure({
          methods: ['POST'],
          requireAuth: false,
          validation: { body: ValidationSchemas.userLogin },
          rateLimit: { requests: 5, windowMs: 15 * 60 * 1000 }
        })
        .post(async (_request, _context) => {
          throw new Error('Login handler not implemented')
        })
        .build(),

      register: new APIRouteBuilder()
        .configure({
          methods: ['POST'],
          requireAuth: false,
          validation: { body: ValidationSchemas.userRegistration },
          rateLimit: { requests: 3, windowMs: 60 * 60 * 1000 }
        })
        .post(async (_request, _context) => {
          throw new Error('Register handler not implemented')
        })
        .build(),

      logout: new APIRouteBuilder()
        .configure({
          methods: ['POST'],
          requireAuth: true
        })
        .post(async (_request, _context) => {
          throw new Error('Logout handler not implemented')
        })
        .build()
    }
  }

  /**
   * Create file upload route
   */
  static createFileUploadRoute(config: {
    maxSize?: number
    allowedTypes?: string[]
    allowedExtensions?: string[]
    requireAuth?: boolean
    requiredRoles?: string[]
  }) {
    return new APIRouteBuilder()
      .configure({
        methods: ['POST'],
        requireAuth: config.requireAuth ?? true,
        requiredRoles: config.requiredRoles,
        rateLimit: { requests: 10, windowMs: 60 * 1000 }
      })
      .post(async (request, _context) => {
        const formData = await request.formData()
        const file = formData.get('file') as File
        
        if (!file) {
          return APIHelpers.error('No file provided', 'FILE_REQUIRED', 400)
        }

        const validation = APIHelpers.validateFileUpload(file, config)
        if (!validation.valid) {
          return APIHelpers.error(validation.error!, 'FILE_VALIDATION_FAILED', 400)
        }

        // Implementation would handle file processing
        throw new Error('File upload handler not implemented')
      })
      .build()
  }
}