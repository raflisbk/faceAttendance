import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

export interface ApiError {
  message: string
  code: string
  status: number
  details?: any
}

export class AppError extends Error {
  public readonly code: string
  public readonly status: number
  public readonly details?: any

  constructor(message: string, code: string, status: number = 500, details?: any) {
    super(message)
    this.code = code
    this.status = status
    this.details = details
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error)

  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors
      },
      { status: 400 }
    )
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return NextResponse.json(
          {
            error: 'Unique constraint violation',
            code: 'DUPLICATE_ENTRY',
            details: error.meta
          },
          { status: 409 }
        )
      case 'P2025':
        return NextResponse.json(
          {
            error: 'Record not found',
            code: 'NOT_FOUND',
            details: error.meta
          },
          { status: 404 }
        )
      default:
        return NextResponse.json(
          {
            error: 'Database error',
            code: 'DATABASE_ERROR',
            details: error.message
          },
          { status: 500 }
        )
    }
  }

  // Custom app errors
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details
      },
      { status: error.status }
    )
  }

  // Generic errors
  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: error.message,
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }

  // Unknown errors
  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR'
    },
    { status: 500 }
  )
}

export function createSuccessResponse(data: any, message?: string, status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      message: message || 'Operation successful'
    },
    { status }
  )
}

export function createErrorResponse(message: string, code: string, status: number = 400, details?: any) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code,
      details
    },
    { status }
  )
}