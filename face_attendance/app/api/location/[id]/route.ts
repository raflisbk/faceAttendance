// app/api/location/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { updateLocationSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { z } from 'zod'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await authMiddleware(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const locationId = params.id

    // Try cache first
    const cacheKey = `location:${locationId}`
    const cachedData = await redis.get(cacheKey)
    if (cachedData) {
      return NextResponse.json(JSON.parse(cachedData))
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        classes: {
          include: {
            lecturer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            enrollments: {
              include: {
                student: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    studentId: true
                  }
                }
              }
            },
            _count: {
              select: {
                enrollments: true,
                attendances: true
              }
            }
          }
        },
        _count: {
          select: {
            classes: true
          }
        }
      }
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    const response = {
      success: true,
      data: location
    }

    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(response))

    return NextResponse.json(response)

  } catch (error) {
    console.error('Location GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await authMiddleware(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const locationId = params.id
    const body = await request.json()
    const validatedData = updateLocationSchema.parse(body)

    // Check if location exists
    const existingLocation = await prisma.location.findUnique({
      where: { id: locationId }
    })

    if (!existingLocation) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Check if location name already exists in the same building (excluding current location)
    if (validatedData.name && validatedData.building) {
      const duplicateLocation = await prisma.location.findFirst({
        where: {
          name: validatedData.name,
          building: validatedData.building,
          id: { not: locationId }
        }
      })

      if (duplicateLocation) {
        return NextResponse.json(
          { error: 'Location with this name already exists in the building' },
          { status: 400 }
        )
      }
    }

    // Check if WiFi SSID already exists (excluding current location)
    if (validatedData.wifiSSID) {
      const duplicateWiFi = await prisma.location.findFirst({
        where: {
          wifiSSID: validatedData.wifiSSID,
          id: { not: locationId }
        }
      })

      if (duplicateWiFi) {
        return NextResponse.json(
          { error: 'WiFi SSID already registered to another location' },
          { status: 400 }
        )
      }
    }

    const updatedLocation = await prisma.location.update({
      where: { id: locationId },
      data: {
        ...validatedData,
        updatedAt: new Date()
      },
      include: {
        classes: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true
          }
        },
        _count: {
          select: {
            classes: true
          }
        }
      }
    })

    // Clear related caches
    const cachePatterns = [
      `location:${locationId}`,
      'locations:*'
    ]

    for (const pattern of cachePatterns) {
      if (pattern.includes('*')) {
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
          await redis.del(...keys)
        }
      } else {
        await redis.del(pattern)
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedLocation,
      message: 'Location updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Location update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await authMiddleware(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const locationId = params.id

    // Check if location exists
    const existingLocation = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        _count: {
          select: {
            classes: true
          }
        }
      }
    })

    if (!existingLocation) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Check if location has active classes
    if (existingLocation._count.classes > 0) {
      return NextResponse.json(
        { error: 'Cannot delete location with active classes. Please reassign or delete classes first.' },
        { status: 400 }
      )
    }

    // Delete the location
    await prisma.location.delete({
      where: { id: locationId }
    })

    // Clear related caches
    const cachePatterns = [
      `location:${locationId}`,
      'locations:*'
    ]

    for (const pattern of cachePatterns) {
      if (pattern.includes('*')) {
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
          await redis.del(...keys)
        }
      } else {
        await redis.del(pattern)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Location deleted successfully'
    })

  } catch (error) {
    console.error('Location deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}