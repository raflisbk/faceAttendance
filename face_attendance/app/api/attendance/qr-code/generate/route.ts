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