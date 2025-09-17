// app/api/attendance/check-in/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { checkInSchema } from '@/lib/validations'
import { verifyFaceRecognition } from '@/lib/face-recognition'
import { validateWifiLocation } from '@/lib/wifi-validation'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = checkInSchema.parse(body)
    
    const { 
      classId, 
      faceImageData, 
      wifiSSID, 
      coordinates,
      method = 'FACE_RECOGNITION'
    } = validatedData

    // Check if class exists and is active
    const classSession = await prisma.class.findFirst({
      where: {
        id: classId,
        status: 'ACTIVE'
      },
      include: {
        location: true,
        schedule: true,
        enrollments: {
          where: { studentId: user.id }
        }
      }
    })

    if (!classSession) {
      return NextResponse.json(
        { error: 'Class not found or inactive' },
        { status: 404 }
      )
    }

    // Check if user is enrolled in the class
    if (classSession.enrollments.length === 0) {
      return NextResponse.json(
        { error: 'You are not enrolled in this class' },
        { status: 403 }
      )
    }

    // Check if class is in session
    const currentTime = new Date()
    const classStart = new Date(classSession.schedule.startTime)
    const classEnd = new Date(classSession.schedule.endTime)
    const gracePeriod = 15 * 60 * 1000 // 15 minutes in milliseconds

    if (currentTime < classStart || currentTime > new Date(classEnd.getTime() + gracePeriod)) {
      return NextResponse.json(
        { error: 'Class is not currently in session' },
        { status: 400 }
      )
    }

    // Check for duplicate attendance
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId: user.id,
        classId: classId,
        date: {
          gte: new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate()),
          lt: new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate() + 1)
        }
      }
    })

    if (existingAttendance) {
      return NextResponse.json(
        { error: 'Attendance already recorded for today' },
        { status: 400 }
      )
    }

    let faceVerificationResult = null
    let wifiValidationResult = null
    let confidence = 0

    // Face recognition verification
    if (method === 'FACE_RECOGNITION' && faceImageData) {
      const userFaceProfile = await prisma.faceProfile.findFirst({
        where: { 
          userId: user.id,
          status: 'APPROVED'
        }
      })

      if (!userFaceProfile) {
        return NextResponse.json(
          { error: 'Face profile not found or not approved' },
          { status: 400 }
        )
      }

      faceVerificationResult = await verifyFaceRecognition(
        faceImageData, 
        userFaceProfile.descriptors
      )

      if (!faceVerificationResult.isMatch) {
        return NextResponse.json(
          { error: 'Face verification failed' },
          { status: 400 }
        )
      }

      confidence = faceVerificationResult.confidence
    }

    // WiFi location validation
    if (wifiSSID) {
      wifiValidationResult = await validateWifiLocation(
        wifiSSID, 
        classSession.location.wifiSSID,
        coordinates
      )

      if (!wifiValidationResult.isValid) {
        return NextResponse.json(
          { error: 'Location verification failed. You must be in the correct classroom.' },
          { status: 400 }
        )
      }
    }

    // Determine attendance status
    let status = 'PRESENT'
    if (currentTime > new Date(classStart.getTime() + 10 * 60 * 1000)) { // 10 minutes late
      status = 'LATE'
    }

    // Record attendance
    const attendance = await prisma.attendance.create({
      data: {
        studentId: user.id,
        classId: classId,
        date: currentTime,
        status: status as any,
        checkInTime: currentTime,
        method: method as any,
        confidence: confidence,
        wifiSSID: wifiSSID,
        coordinates: coordinates ? JSON.stringify(coordinates) : null,
        verificationData: {
          faceVerification: faceVerificationResult,
          wifiValidation: wifiValidationResult
        }
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentId: true
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

    // Cache attendance data
    await redis.setex(
      `attendance:${user.id}:${classId}:${currentTime.toDateString()}`,
      3600, // 1 hour
      JSON.stringify(attendance)
    )

    // Update class statistics
    await updateClassStatistics(classId)

    return NextResponse.json({
      success: true,
      attendance: {
        id: attendance.id,
        status: attendance.status,
        checkInTime: attendance.checkInTime,
        confidence: attendance.confidence,
        class: attendance.class
      },
      message: `Attendance recorded successfully. Status: ${status}`
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Check-in error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// app/api/attendance/history/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

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
    const classId = searchParams.get('classId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')

    const skip = (page - 1) * limit

    // Build cache key
    const cacheKey = `attendance_history:${user.id}:${page}:${limit}:${classId || 'all'}:${startDate || 'any'}:${endDate || 'any'}:${status || 'all'}`
    
    // Try to get from cache first
    const cachedData = await redis.get(cacheKey)
    if (cachedData) {
      return NextResponse.json(JSON.parse(cachedData))
    }

    // Build where clause
    const whereClause: any = {
      studentId: user.id
    }

    if (classId) {
      whereClause.classId = classId
    }

    if (startDate || endDate) {
      whereClause.date = {}
      if (startDate) {
        whereClause.date.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate)
      }
    }

    if (status) {
      whereClause.status = status
    }

    // Get attendance records
    const [attendanceRecords, totalCount] = await Promise.all([
      prisma.attendance.findMany({
        where: whereClause,
        include: {
          class: {
            select: {
              id: true,
              name: true,
              code: true,
              lecturer: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        },
        orderBy: {
          date: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.attendance.count({ where: whereClause })
    ])

    // Calculate statistics
    const stats = await prisma.attendance.groupBy({
      by: ['status'],
      where: { studentId: user.id },
      _count: {
        status: true
      }
    })

    const attendanceStats = {
      total: totalCount,
      present: stats.find(s => s.status === 'PRESENT')?._count.status || 0,
      absent: stats.find(s => s.status === 'ABSENT')?._count.status || 0,
      late: stats.find(s => s.status === 'LATE')?._count.status || 0,
      excused: stats.find(s => s.status === 'EXCUSED')?._count.status || 0
    }

    const response = {
      success: true,
      data: attendanceRecords,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      stats: attendanceStats
    }

    // Cache the response for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(response))

    return NextResponse.json(response)

  } catch (error) {
    console.error('Attendance history error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// app/api/attendance/qr-code/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { generateQRCodeSchema } from '@/lib/validations'
import { generateQRCode } from '@/lib/qr-code'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'LECTURER')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = generateQRCodeSchema.parse(body)
    
    const { classId, sessionDuration = 60, expiresIn = 300 } = validatedData

    // Verify class exists and user has permission
    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        ...(user.role === 'LECTURER' ? { lecturerId: user.id } : {})
      },
      include: {
        location: true,
        schedule: true
      }
    })

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found or access denied' },
        { status: 404 }
      )
    }

    // Generate unique session token
    const sessionToken = uuidv4()
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    // Create QR code data
    const qrData = {
      type: 'ATTENDANCE_QR',
      classId: classId,
      sessionToken: sessionToken,
      generatedBy: user.id,
      expiresAt: expiresAt.toISOString(),
      sessionDuration: sessionDuration
    }

    // Store QR session in Redis
    await redis.setex(
      `qr_session:${sessionToken}`,
      expiresIn,
      JSON.stringify(qrData)
    )

    // Generate QR code image
    const qrCodeImage = await generateQRCode(JSON.stringify(qrData))

    // Log QR generation
    await prisma.qrCodeSession.create({
      data: {
        sessionToken,
        classId,
        generatedBy: user.id,
        expiresAt,
        sessionDuration,
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      qrCode: {
        image: qrCodeImage,
        sessionToken,
        expiresAt,
        sessionDuration,
        className: classData.name,
        location: classData.location.name
      },
      message: 'QR code generated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('QR generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// app/api/attendance/qr-code/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth-middleware'
import { redis } from '@/lib/redis'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { qrData } = await request.json()
    
    let parsedQRData
    try {
      parsedQRData = JSON.parse(qrData)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid QR code format' },
        { status: 400 }
      )
    }

    const { sessionToken, classId } = parsedQRData

    // Verify QR session exists and is valid
    const sessionData = await redis.get(`qr_session:${sessionToken}`)
    if (!sessionData) {
      return NextResponse.json(
        { error: 'QR code expired or invalid' },
        { status: 400 }
      )
    }

    const session = JSON.parse(sessionData)
    
    // Check if session is still valid
    if (new Date() > new Date(session.expiresAt)) {
      await redis.del(`qr_session:${sessionToken}`)
      return NextResponse.json(
        { error: 'QR code has expired' },
        { status: 400 }
      )
    }

    // Check if user is enrolled in the class
    const enrollment = await prisma.classEnrollment.findFirst({
      where: {
        studentId: user.id,
        classId: classId
      }
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: 'You are not enrolled in this class' },
        { status: 403 }
      )
    }

    // Check for duplicate attendance
    const today = new Date()
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId: user.id,
        classId: classId,
        date: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
        }
      }
    })

    if (existingAttendance) {
      return NextResponse.json(
        { error: 'Attendance already recorded for today' },
        { status: 400 }
      )
    }

    // Record attendance via QR code
    const attendance = await prisma.attendance.create({
      data: {
        studentId: user.id,
        classId: classId,
        date: new Date(),
        status: 'PRESENT',
        checkInTime: new Date(),
        method: 'QR_CODE',
        qrSessionToken: sessionToken
      },
      include: {
        class: {
          select: {
            name: true,
            code: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      attendance: {
        id: attendance.id,
        status: attendance.status,
        checkInTime: attendance.checkInTime,
        class: attendance.class
      },
      message: 'Attendance recorded successfully via QR code'
    })

  } catch (error) {
    console.error('QR verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to update class statistics
async function updateClassStatistics(classId: string) {
  try {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    const [totalEnrolled, presentToday] = await Promise.all([
      prisma.classEnrollment.count({
        where: { classId }
      }),
      prisma.attendance.count({
        where: {
          classId,
          date: {
            gte: startOfDay,
            lt: endOfDay
          },
          status: {
            in: ['PRESENT', 'LATE']
          }
        }
      })
    ])

    const attendanceRate = totalEnrolled > 0 ? (presentToday / totalEnrolled) * 100 : 0

    // Cache the statistics
    await redis.setex(
      `class_stats:${classId}:${today.toDateString()}`,
      3600, // 1 hour
      JSON.stringify({
        totalEnrolled,
        presentToday,
        attendanceRate,
        updatedAt: new Date().toISOString()
      })
    )

  } catch (error) {
    console.error('Error updating class statistics:', error)
  }
}