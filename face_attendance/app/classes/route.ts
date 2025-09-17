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
      classes.map(async (classItem) => {
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

// app/api/classes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { updateClassSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const classId = params.id

    // Try cache first
    const cacheKey = `class:${classId}:details`
    const cachedData = await redis.get(cacheKey)
    if (cachedData) {
      return NextResponse.json(JSON.parse(cachedData))
    }

    // Build where clause based on user role
    let whereClause: any = { id: classId }

    if (user.role === 'LECTURER') {
      whereClause.lecturerId = user.id
    } else if (user.role === 'STUDENT') {
      // Student can only see classes they're enrolled in
      const enrollment = await prisma.classEnrollment.findFirst({
        where: {
          classId: classId,
          studentId: user.id
        }
      })

      if (!enrollment) {
        return NextResponse.json(
          { error: 'Class not found or access denied' },
          { status: 404 }
        )
      }
    }

    const classData = await prisma.class.findFirst({
      where: whereClause,
      include: {
        lecturer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profile: {
              select: {
                bio: true,
                avatar: true
              }
            }
          }
        },
        location: true,
        schedule: true,
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                studentId: true,
                email: true
              }
            }
          },
          orderBy: {
            enrolledAt: 'asc'
          }
        },
        attendances: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                studentId: true
              }
            }
          },
          orderBy: {
            date: 'desc'
          },
          take: 10 // Latest 10 attendance records
        }
      }
    })

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Calculate attendance statistics
    const [attendanceStats, sessionStats] = await Promise.all([
      prisma.attendance.groupBy({
        by: ['status'],
        where: { classId: classId },
        _count: { status: true }
      }),
      prisma.attendance.groupBy({
        by: ['date'],
        where: { classId: classId },
        _count: { date: true }
      })
    ])

    const totalSessions = sessionStats.length
    const presentCount = attendanceStats.find(s => s.status === 'PRESENT')?._count.status || 0
    const lateCount = attendanceStats.find(s => s.status === 'LATE')?._count.status || 0
    const absentCount = attendanceStats.find(s => s.status === 'ABSENT')?._count.status || 0
    const totalAttendances = presentCount + lateCount
    const attendanceRate = classData.enrollments.length > 0 && totalSessions > 0
      ? (totalAttendances / (classData.enrollments.length * totalSessions)) * 100
      : 0

    const enrichedClass = {
      ...classData,
      enrollment: {
        current: classData.enrollments.length,
        capacity: classData.capacity,
        waitlist: 0
      },
      attendance: {
        averageRate: attendanceRate,
        totalSessions,
        presentCount,
        lateCount,
        absentCount,
        recentAttendances: classData.attendances
      }
    }

    const response = {
      success: true,
      data: enrichedClass
    }

    // Cache for 10 minutes
    await redis.setex(cacheKey, 600, JSON.stringify(response))

    return NextResponse.json(response)

  } catch (error) {
    console.error('Class GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authMiddleware(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const classId = params.id
    const body = await request.json()
    const validatedData = updateClassSchema.parse(body)

    // Check if class exists and user has permission
    const existingClass = await prisma.class.findFirst({
      where: {
        id: classId,
        ...(user.role === 'LECTURER' ? { lecturerId: user.id } : {})
      }
    })

    if (!existingClass) {
      return NextResponse.json(
        { error: 'Class not found or access denied' },
        { status: 404 }
      )
    }

    // If updating class code, check for duplicates
    if (validatedData.code && validatedData.code !== existingClass.code) {
      const codeExists = await prisma.class.findFirst({
        where: {
          code: validatedData.code,
          id: { not: classId }
        }
      })

      if (codeExists) {
        return NextResponse.json(
          { error: 'Class code already exists' },
          { status: 400 }
        )
      }
    }

    // Update class
    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: {
        ...validatedData,
        updatedAt: new Date()
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
      `class:${classId}:*`,
      `classes:*`,
      `lecturer_classes:${updatedClass.lecturerId}:*`
    ]

    for (const pattern of cachePatterns) {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedClass,
      message: 'Class updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Class update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authMiddleware(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const classId = params.id

    // Check if class exists
    const existingClass = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        enrollments: true,
        attendances: true
      }
    })

    if (!existingClass) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Check if class has enrollments or attendance records
    if (existingClass.enrollments.length > 0 || existingClass.attendances.length > 0) {
      // Soft delete - mark as inactive instead of deleting
      await prisma.class.update({
        where: { id: classId },
        data: {
          status: 'INACTIVE',
          updatedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Class marked as inactive due to existing enrollments/attendance records'
      })
    }

    // Hard delete if no enrollments or attendance
    await prisma.$transaction([
      prisma.classSchedule.deleteMany({ where: { classId } }),
      prisma.class.delete({ where: { id: classId } })
    ])

    // Clear related caches
    const cachePatterns = [
      `class:${classId}:*`,
      `classes:*`,
      `lecturer_classes:${existingClass.lecturerId}:*`
    ]

    for (const pattern of cachePatterns) {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Class deleted successfully'
    })

  } catch (error) {
    console.error('Class deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// app/api/classes/[id]/enroll/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const classId = params.id
    const { studentIds } = await request.json()

    // For students enrolling themselves
    if (user.role === 'STUDENT') {
      // Check if class exists and is active
      const classData = await prisma.class.findFirst({
        where: {
          id: classId,
          status: 'ACTIVE'
        },
        include: {
          enrollments: true
        }
      })

      if (!classData) {
        return NextResponse.json(
          { error: 'Class not found or not available for enrollment' },
          { status: 404 }
        )
      }

      // Check capacity
      if (classData.enrollments.length >= classData.capacity) {
        return NextResponse.json(
          { error: 'Class is full. Please contact administrator.' },
          { status: 400 }
        )
      }

      // Check if already enrolled
      const existingEnrollment = await prisma.classEnrollment.findFirst({
        where: {
          classId,
          studentId: user.id
        }
      })

      if (existingEnrollment) {
        return NextResponse.json(
          { error: 'You are already enrolled in this class' },
          { status: 400 }
        )
      }

      // Create enrollment
      const enrollment = await prisma.classEnrollment.create({
        data: {
          classId,
          studentId: user.id,
          enrolledAt: new Date(),
          status: 'ACTIVE'
        },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentId: true,
              email: true
            }
          },
          class: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        }
      })

      // Clear related caches
      await redis.del(`class:${classId}:details`)
      await redis.del(`student:${user.id}:classes`)

      return NextResponse.json({
        success: true,
        data: enrollment,
        message: 'Successfully enrolled in class'
      })
    }

    // For admin/lecturer enrolling multiple students
    if (user.role === 'ADMIN' || user.role === 'LECTURER') {
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return NextResponse.json(
          { error: 'Student IDs array is required' },
          { status: 400 }
        )
      }

      // Verify class exists and lecturer has permission
      const classData = await prisma.class.findFirst({
        where: {
          id: classId,
          ...(user.role === 'LECTURER' ? { lecturerId: user.id } : {}),
          status: 'ACTIVE'
        },
        include: {
          enrollments: true
        }
      })

      if (!classData) {
        return NextResponse.json(
          { error: 'Class not found or access denied' },
          { status: 404 }
        )
      }

      // Check if adding students would exceed capacity
      const currentEnrollments = classData.enrollments.length
      if (currentEnrollments + studentIds.length > classData.capacity) {
        return NextResponse.json(
          { error: `Cannot enroll ${studentIds.length} students. Only ${classData.capacity - currentEnrollments} spots available.` },
          { status: 400 }
        )
      }

      // Get existing enrollments to avoid duplicates
      const existingEnrollments = await prisma.classEnrollment.findMany({
        where: {
          classId,
          studentId: { in: studentIds }
        },
        select: { studentId: true }
      })

      const alreadyEnrolledIds = existingEnrollments.map(e => e.studentId)
      const newStudentIds = studentIds.filter(id => !alreadyEnrolledIds.includes(id))

      if (newStudentIds.length === 0) {
        return NextResponse.json(
          { error: 'All selected students are already enrolled in this class' },
          { status: 400 }
        )
      }

      // Verify all students exist and are active
      const students = await prisma.user.findMany({
        where: {
          id: { in: newStudentIds },
          role: 'STUDENT',
          status: 'ACTIVE'
        }
      })

      if (students.length !== newStudentIds.length) {
        return NextResponse.json(
          { error: 'Some student IDs are invalid or students are not active' },
          { status: 400 }
        )
      }

      // Create enrollments
      const enrollments = await prisma.classEnrollment.createMany({
        data: newStudentIds.map(studentId => ({
          classId,
          studentId,
          enrolledAt: new Date(),
          status: 'ACTIVE'
        }))
      })

      // Get created enrollments with student details
      const createdEnrollments = await prisma.classEnrollment.findMany({
        where: {
          classId,
          studentId: { in: newStudentIds }
        },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentId: true,
              email: true
            }
          }
        }
      })

      // Clear related caches
      await redis.del(`class:${classId}:details`)
      for (const studentId of newStudentIds) {
        await redis.del(`student:${studentId}:classes`)
      }

      return NextResponse.json({
        success: true,
        data: {
          enrollments: createdEnrollments,
          enrolled: newStudentIds.length,
          skipped: alreadyEnrolledIds.length
        },
        message: `Successfully enrolled ${newStudentIds.length} students. ${alreadyEnrolledIds.length} were already enrolled.`
      })
    }

    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )

  } catch (error) {
    console.error('Class enrollment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const classId = params.id
    const { studentIds } = await request.json()

    // For students unenrolling themselves
    if (user.role === 'STUDENT') {
      const enrollment = await prisma.classEnrollment.findFirst({
        where: {
          classId,
          studentId: user.id
        }
      })

      if (!enrollment) {
        return NextResponse.json(
          { error: 'You are not enrolled in this class' },
          { status: 404 }
        )
      }

      // Check if class has started (has attendance records)
      const hasAttendance = await prisma.attendance.findFirst({
        where: {
          classId,
          studentId: user.id
        }
      })

      if (hasAttendance) {
        return NextResponse.json(
          { error: 'Cannot unenroll from class with attendance records. Please contact administrator.' },
          { status: 400 }
        )
      }

      await prisma.classEnrollment.delete({
        where: { id: enrollment.id }
      })

      // Clear caches
      await redis.del(`class:${classId}:details`)
      await redis.del(`student:${user.id}:classes`)

      return NextResponse.json({
        success: true,
        message: 'Successfully unenrolled from class'
      })
    }

    // For admin/lecturer removing students
    if (user.role === 'ADMIN' || user.role === 'LECTURER') {
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return NextResponse.json(
          { error: 'Student IDs array is required' },
          { status: 400 }
        )
      }

      // Verify class exists and user has permission
      const classData = await prisma.class.findFirst({
        where: {
          id: classId,
          ...(user.role === 'LECTURER' ? { lecturerId: user.id } : {})
        }
      })

      if (!classData) {
        return NextResponse.json(
          { error: 'Class not found or access denied' },
          { status: 404 }
        )
      }

      // Remove enrollments
      const deletedEnrollments = await prisma.classEnrollment.deleteMany({
        where: {
          classId,
          studentId: { in: studentIds }
        }
      })

      // Clear caches
      await redis.del(`class:${classId}:details`)
      for (const studentId of studentIds) {
        await redis.del(`student:${studentId}:classes`)
      }

      return NextResponse.json({
        success: true,
        data: {
          removed: deletedEnrollments.count
        },
        message: `Successfully removed ${deletedEnrollments.count} students from class`
      })
    }

    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )

  } catch (error) {
    console.error('Class unenrollment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}