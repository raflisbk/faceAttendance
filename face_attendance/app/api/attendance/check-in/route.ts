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
      faceImage,
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
    if (method === 'FACE_RECOGNITION' && faceImage) {
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
        faceImage,
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
      const validCoordinates = coordinates ? {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        ...(coordinates.accuracy !== undefined && { accuracy: coordinates.accuracy })
      } : undefined

      wifiValidationResult = await validateWifiLocation(
        wifiSSID,
        classSession.location.wifiSSID,
        validCoordinates
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