import { NextRequest } from 'next/server'
import { z, ZodSchema } from 'zod'
import { AppError } from './api-error-handler'

export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json()
    return schema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(
        'Invalid request data',
        'VALIDATION_ERROR',
        400,
        error.errors
      )
    }
    throw new AppError(
      'Invalid JSON in request body',
      'INVALID_JSON',
      400
    )
  }
}

export async function validateFormData<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const formData = await request.formData()
    const data: Record<string, any> = {}

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        data[key] = value
      } else {
        // Try to parse as JSON for complex types, otherwise use as string
        try {
          data[key] = JSON.parse(value as string)
        } catch {
          data[key] = value
        }
      }
    }

    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(
        'Invalid form data',
        'VALIDATION_ERROR',
        400,
        error.errors
      )
    }
    throw new AppError(
      'Invalid form data format',
      'INVALID_FORM_DATA',
      400
    )
  }
}

export function validateQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): T {
  try {
    const { searchParams } = new URL(request.url)
    const params: Record<string, any> = {}

    for (const [key, value] of searchParams.entries()) {
      // Try to parse numbers and booleans
      if (value === 'true') params[key] = true
      else if (value === 'false') params[key] = false
      else if (!isNaN(Number(value))) params[key] = Number(value)
      else params[key] = value
    }

    return schema.parse(params)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(
        'Invalid query parameters',
        'VALIDATION_ERROR',
        400,
        error.errors
      )
    }
    throw error
  }
}

export function validatePathParams<T>(
  params: Record<string, string | string[]>,
  schema: ZodSchema<T>
): T {
  try {
    return schema.parse(params)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(
        'Invalid path parameters',
        'VALIDATION_ERROR',
        400,
        error.errors
      )
    }
    throw error
  }
}

// Common validation schemas
export const commonSchemas = {
  id: z.object({
    id: z.string().uuid('Invalid ID format')
  }),

  pagination: z.object({
    page: z.number().int().min(1).optional().default(1),
    limit: z.number().int().min(1).max(100).optional().default(10),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
  }),

  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  })
}