// app/api/classes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { createClassSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')
    const department = searchParams.get('department')
    const status = searchParams.get('status')
    const lecturerId = searchParams.get('lecturerId')

    const skip = (page - 1) * limit

    // Build cache key
    const cacheKey = `classes:${user.role}:${user.id}:${page}:${limit}:${search || 'none'}:${department || 'all'}:${status || 'all'}:${lecturerId || 'all'}`

    // Try cache first
    const cachedData = await redis.get(cacheKey)
    if (cachedData) {
      return NextResponse.json(JSON.parse(cachedData))
    }

    // Build where clause based on user role
    let whereClause: any = {}

    if (user.role === 'LECTURER') {
      whereClause.lecturerId = user.id
    } else if (user.role === 'STUDENT') {
      whereClause.enrollments = {
        some: {
          studentId: user.id
        }
      }
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (department) {
      whereClause.department = department
    }

    if (status) {
      whereClause.status = status
    }

    if (lecturerId && user.role === 'ADMIN') {
      whereClause.lecturerId = lecturerId
    }

    // Get classes with relations
    const [classes, totalCount] = await Promise.all([
      prisma.class.findMany({
        where: whereClause,
        include: {
          lecturer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          location: {
            select: {
              id: true,
              name: true,
              building: true,
              capacity: true,
              wifiSSID: true
            }
          },
          schedule: true,
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
        },
        orderBy: [
          { status: 'asc' },
          { name: 'asc' }
        ],
        skip,
        take: limit
      }),
      prisma.class.count({ where: whereClause })
    ])

    // Calculate attendance statistics for each class
    const classesWithStats = await Promise.all(
      classes.map(async (classItem: any) => {
        const [totalSessions, attendanceStats] = await Promise.all([
          prisma.attendance.groupBy({
            by: ['date'],
            where: { classId: classItem.id },
            _count: { date: true }
          }),
          prisma.attendance.groupBy({
            by: ['status'],
            where: { classId: classItem.id },
            _count: { status: true }
          })
        ])

        const totalSessionsCount = totalSessions.length
        const presentCount = attendanceStats.find(s => s.status === 'PRESENT')?._count.status || 0
        const lateCount = attendanceStats.find(s => s.status === 'LATE')?._count.status || 0
        const totalAttendances = presentCount + lateCount
        const attendanceRate = classItem._count.enrollments > 0 && totalSessionsCount > 0
          ? (totalAttendances / (classItem._count.enrollments * totalSessionsCount)) * 100
          : 0

        return {
          ...classItem,
          enrollment: {
            current: classItem._count.enrollments,
            capacity: classItem.location.capacity,
            waitlist: 0 // TODO: Implement waitlist
          },
          attendance: {
            averageRate: attendanceRate,
            totalSessions: totalSessionsCount,
            lastSession: totalSessions[0]?.date || null
          }
        }
      })
    )

    const response = {
      success: true,
      data: classesWithStats,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    }

    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(response))

    return NextResponse.json(response)

  } catch (error) {
    console.error('Classes GET error:', error)
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
    const validatedData = createClassSchema.parse(body)

    // Check if class code already exists
    const existingClass = await prisma.class.findUnique({
      where: { code: validatedData.code }
    })

    if (existingClass) {
      return NextResponse.json(
        { error: 'Class code already exists' },
        { status: 400 }
      )
    }

    // Verify lecturer exists
    const lecturer = await prisma.user.findFirst({
      where: {
        id: validatedData.lecturerId,
        role: 'LECTURER',
        status: 'ACTIVE'
      }
    })

    if (!lecturer) {
      return NextResponse.json(
        { error: 'Invalid lecturer ID or lecturer not active' },
        { status: 400 }
      )
    }

    // Verify location exists
    const location = await prisma.location.findUnique({
      where: { id: validatedData.locationId }
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Create class with schedule
    const newClass = await prisma.class.create({
      data: {
        name: validatedData.name,
        code: validatedData.code,
        description: validatedData.description,
        department: validatedData.department,
        semester: validatedData.semester,
        academicYear: validatedData.academicYear,
        credits: validatedData.credits,
        capacity: validatedData.capacity,
        lecturerId: validatedData.lecturerId,
        locationId: validatedData.locationId,
        status: 'ACTIVE',
        schedule: {
          create: {
            dayOfWeek: validatedData.schedule.dayOfWeek,
            startTime: validatedData.schedule.startTime,
            endTime: validatedData.schedule.endTime,
            duration: validatedData.schedule.duration || 120 // 2 hours default
          }
        }
      },
      include: {
        lecturer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        location: true,
        schedule: true
      }
    })

    // Clear related caches
    const cachePatterns = [
      `classes:*`,
      `lecturer_classes:${validatedData.lecturerId}:*`,
      `location_classes:${validatedData.locationId}:*`
    ]

    for (const pattern of cachePatterns) {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    }

    return NextResponse.json({
      success: true,
      data: newClass,
      message: 'Class created successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Class creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}