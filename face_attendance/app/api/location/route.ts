// app/api/locations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { createLocationSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')
    const building = searchParams.get('building')
    const status = searchParams.get('status')

    const skip = (page - 1) * limit

    // Try cache first
    const cacheKey = `locations:${page}:${limit}:${search || 'all'}:${building || 'all'}:${status || 'all'}`
    const cachedData = await redis.get(cacheKey)
    if (cachedData) {
      return NextResponse.json(JSON.parse(cachedData))
    }

    // Build where clause
    const whereClause: any = {}

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { building: { contains: search, mode: 'insensitive' } },
        { wifiSsid: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (building) {
      whereClause.building = building
    }

    if (status) {
      whereClause.status = status
    }

    const [locations, totalCount] = await Promise.all([
      prisma.location.findMany({
        where: whereClause,
        include: {
          classes: {
            select: {
              id: true,
              name: true,
              code: true,
              isActive: true
            }
          },
          _count: {
            select: {
              classes: true
            }
          }
        },
        orderBy: [
          { building: 'asc' },
          { name: 'asc' }
        ],
        skip,
        take: limit
      }),
      prisma.location.count({ where: whereClause })
    ])

    const response = {
      success: true,
      data: locations,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    }

    // Cache for 10 minutes
    await redis.setex(cacheKey, 600, JSON.stringify(response))

    return NextResponse.json(response)

  } catch (error) {
    console.error('Locations GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = createLocationSchema.parse(body)

    // Check if location name already exists in the same building
    const existingLocation = await prisma.location.findFirst({
      where: {
        name: validatedData.name,
        building: validatedData.building
      }
    })

    if (existingLocation) {
      return NextResponse.json(
        { error: 'Location with this name already exists in the building' },
        { status: 400 }
      )
    }

    // Check if WiFi SSID already exists
    const existingWiFi = await prisma.location.findFirst({
      where: { wifiSsid: validatedData.wifiSsid }
    })

    if (existingWiFi) {
      return NextResponse.json(
        { error: 'WiFi SSID already registered to another location' },
        { status: 400 }
      )
    }

    const newLocation = await prisma.location.create({
      data: {
        ...validatedData,
        isActive: true
      }
    })

    // Clear cache
    await redis.del('locations:*')

    return NextResponse.json({
      success: true,
      data: newLocation,
      message: 'Location created successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Location creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
