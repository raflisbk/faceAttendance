import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, studentId, role } = await request.json()

    // Validate required fields
    if (!name || !email || !phone || !studentId || !role) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    // Check if student/staff ID already exists
    const idField = role === 'STUDENT' ? 'studentId' : 'staffId'
    const existingId = await prisma.user.findUnique({
      where: { [idField]: studentId }
    })

    if (existingId) {
      return NextResponse.json(
        { error: `${role === 'STUDENT' ? 'Student' : 'Staff'} ID already registered` },
        { status: 400 }
      )
    }

    // Create user account
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        [idField]: studentId,
        role,
        status: 'PENDING',
        registrationStep: 1,
        faceEnrollmentStatus: 'NOT_ENROLLED',
        documentVerified: false,
        termsAccepted: true,
        gdprConsent: true
      }
    })

    // Create initial registration step record
    await prisma.registrationStep.create({
      data: {
        userId: user.id,
        stepName: 'BASIC_INFO',
        status: 'COMPLETED',
        data: {
          name,
          email,
          phone,
          studentId,
          role
        },
        completedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        registrationStep: user.registrationStep
      },
      message: 'User account created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('User creation error:', error)

    return NextResponse.json(
      {
        error: 'Failed to create user account',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}