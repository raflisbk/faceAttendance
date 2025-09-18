// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { createUserSchema, paginationSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { hash } from 'bcrypt'
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
    const role = searchParams.get('role')
    const status = searchParams.get('status')
    const department = searchParams.get('department')

    const skip = (page - 1) * limit

    // Build cache key
    const cacheKey = `users:list:${page}:${limit}:${search || 'all'}:${role || 'all'}:${status || 'all'}:${department || 'all'}`
    
    // Try cache first
    const cachedData = await redis.get(cacheKey)
    if (cachedData) {
      return NextResponse.json(JSON.parse(cachedData))
    }

    // Build where clause
    const whereClause: any = {}

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { studentId: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (role) {
      whereClause.role = role
    }

    if (status) {
      whereClause.status = status
    }

    if (department) {
      whereClause.department = department
    }

    // Get users with counts
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        include: {
          profile: true,
          document: true,
          faceProfile: {
            select: {
              id: true,
              status: true,
              quality: true,
              enrolledAt: true
            }
          },
          _count: {
            select: {
              attendances: true,
              teachingClasses: true,
              enrolledClasses: true
            }
          }
        },
        orderBy: [
          { status: 'asc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.user.count({ where: whereClause })
    ])

    const response = {
      success: true,
      data: users,
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
    console.error('Users GET error:', error)
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
    const validatedData = createUserSchema.parse(body)

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Check student/employee ID uniqueness
    if (validatedData.studentId) {
      const existingStudent = await prisma.user.findFirst({
        where: { studentId: validatedData.studentId }
      })
      if (existingStudent) {
        return NextResponse.json(
          { error: 'Student ID already exists' },
          { status: 400 }
        )
      }
    }

    if (validatedData.employeeId) {
      const existingEmployee = await prisma.user.findFirst({
        where: { employeeId: validatedData.employeeId }
      })
      if (existingEmployee) {
        return NextResponse.json(
          { error: 'Employee ID already exists' },
          { status: 400 }
        )
      }
    }

    // Hash password
    const hashedPassword = await hash(validatedData.password, 12)

    // Create user with profile
    const newUser = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phoneNumber: validatedData.phoneNumber,
        role: validatedData.role,
        studentId: validatedData.studentId,
        employeeId: validatedData.employeeId,
        department: validatedData.department,
        status: 'ACTIVE',
        emailVerified: true,
        createdBy: user.id,
        profile: {
          create: {
            dateOfBirth: validatedData.dateOfBirth,
            address: validatedData.address,
            emergencyContact: validatedData.emergencyContact
          }
        }
      },
      include: {
        profile: true
      }
    })

    // Clear related caches
    await redis.del('users:list:*')

    return NextResponse.json({
      success: true,
      data: newUser,
      message: 'User created successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('User creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}