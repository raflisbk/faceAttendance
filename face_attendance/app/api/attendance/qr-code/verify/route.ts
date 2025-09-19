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