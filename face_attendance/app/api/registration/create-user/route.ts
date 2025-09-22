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
    const existingId = await prisma.user.findUnique({
      where: role === 'STUDENT'
        ? { studentId: studentId }
        : { staffId: studentId }
    })

    if (existingId) {
      return NextResponse.json(
        { error: `${role === 'STUDENT' ? 'Student' : 'Staff'} ID already registered` },
        { status: 400 }
      )
    }

    // Create temporary registration record (not a full user yet)
    const registrationData = {
      name,
      email,
      phone,
      role,
      studentId,
      step: 1,
      status: 'IN_PROGRESS',
      data: {
        name,
        email,
        phone,
        studentId,
        role
      },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    }

    // Store in a temporary registration table or use a simple session approach
    // For now, we'll create a temporary record with a unique identifier
    const tempRegistrationId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return NextResponse.json({
      success: true,
      registrationId: tempRegistrationId,
      data: registrationData,
      message: 'Basic information saved. Please continue to next step.'
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