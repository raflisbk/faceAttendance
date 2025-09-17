// app/api/auth/register/step-1/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { registerStep1Schema } from '@/lib/validations'
import { hash } from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'
import { redis } from '@/lib/redis'
import { sendVerificationEmail } from '@/lib/email'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = registerStep1Schema.parse(body)
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }
    
    // Hash password
    const hashedPassword = await hash(validatedData.password, 12)
    
    // Generate registration session ID
    const registrationId = uuidv4()
    
    // Store registration data in Redis (24 hour expiry)
    const registrationData = {
      step: 1,
      data: {
        ...validatedData,
        password: hashedPassword
      },
      createdAt: new Date().toISOString()
    }
    
    await redis.setex(`registration:${registrationId}`, 86400, JSON.stringify(registrationData))
    
    // Generate email verification token
    const emailVerificationToken = uuidv4()
    await redis.setex(`email_verification:${emailVerificationToken}`, 3600, validatedData.email)
    
    // Send verification email
    await sendVerificationEmail(validatedData.email, emailVerificationToken)
    
    return NextResponse.json({
      success: true,
      registrationId,
      message: 'Step 1 completed. Check your email for verification.',
      nextStep: 2
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Registration step 1 error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// app/api/auth/register/step-2/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { registerStep2Schema } from '@/lib/validations'
import { redis } from '@/lib/redis'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { extractTextFromDocument } from '@/lib/ocr'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const registrationId = formData.get('registrationId') as string
    const documentType = formData.get('documentType') as string
    const documentNumber = formData.get('documentNumber') as string
    const documentFile = formData.get('documentFile') as File
    
    if (!registrationId) {
      return NextResponse.json(
        { error: 'Registration ID is required' },
        { status: 400 }
      )
    }
    
    // Get registration data from Redis
    const registrationDataStr = await redis.get(`registration:${registrationId}`)
    if (!registrationDataStr) {
      return NextResponse.json(
        { error: 'Registration session expired or not found' },
        { status: 404 }
      )
    }
    
    const registrationData = JSON.parse(registrationDataStr)
    
    // Validate document data
    const validatedData = registerStep2Schema.parse({
      documentType,
      documentNumber,
      documentFile
    })
    
    // Upload document to Cloudinary
    const documentUrl = await uploadToCloudinary(documentFile, 'documents')
    
    // Extract text from document for verification
    const extractedText = await extractTextFromDocument(documentUrl)
    
    // Update registration data
    const updatedRegistrationData = {
      ...registrationData,
      step: 2,
      data: {
        ...registrationData.data,
        document: {
          type: documentType,
          number: documentNumber,
          url: documentUrl,
          extractedText,
          uploadedAt: new Date().toISOString()
        }
      }
    }
    
    await redis.setex(`registration:${registrationId}`, 86400, JSON.stringify(updatedRegistrationData))
    
    return NextResponse.json({
      success: true,
      registrationId,
      documentUrl,
      extractedData: extractedText,
      message: 'Document uploaded successfully.',
      nextStep: 3
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Registration step 2 error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// app/api/auth/register/step-3/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { registerStep3Schema } from '@/lib/validations'
import { redis } from '@/lib/redis'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { enrollFaceProfile } from '@/lib/face-recognition'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const registrationId = formData.get('registrationId') as string
    const faceImages = formData.getAll('faceImages') as File[]
    const consentToFaceData = formData.get('consentToFaceData') === 'true'
    
    if (!registrationId) {
      return NextResponse.json(
        { error: 'Registration ID is required' },
        { status: 400 }
      )
    }
    
    // Get registration data from Redis
    const registrationDataStr = await redis.get(`registration:${registrationId}`)
    if (!registrationDataStr) {
      return NextResponse.json(
        { error: 'Registration session expired or not found' },
        { status: 404 }
      )
    }
    
    const registrationData = JSON.parse(registrationDataStr)
    
    // Validate face data
    const validatedData = registerStep3Schema.parse({
      faceImages,
      consentToFaceData
    })
    
    // Upload face images to Cloudinary
    const faceImageUrls = await Promise.all(
      faceImages.map(image => uploadToCloudinary(image, 'faces'))
    )
    
    // Process face enrollment
    const faceEnrollmentResult = await enrollFaceProfile(faceImageUrls)
    
    if (!faceEnrollmentResult.success) {
      return NextResponse.json(
        { error: faceEnrollmentResult.error },
        { status: 400 }
      )
    }
    
    // Update registration data
    const updatedRegistrationData = {
      ...registrationData,
      step: 3,
      data: {
        ...registrationData.data,
        faceProfile: {
          images: faceImageUrls,
          descriptors: faceEnrollmentResult.descriptors,
          quality: faceEnrollmentResult.quality,
          consentGiven: consentToFaceData,
          enrolledAt: new Date().toISOString()
        }
      }
    }
    
    await redis.setex(`registration:${registrationId}`, 86400, JSON.stringify(updatedRegistrationData))
    
    return NextResponse.json({
      success: true,
      registrationId,
      faceProfile: {
        quality: faceEnrollmentResult.quality,
        imageCount: faceImageUrls.length
      },
      message: 'Face enrollment completed successfully.',
      nextStep: 4
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Registration step 3 error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// app/api/auth/register/complete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { prisma } from '@/lib/prisma'
import { sendWelcomeEmail, notifyAdminNewRegistration } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { registrationId } = await request.json()
    
    if (!registrationId) {
      return NextResponse.json(
        { error: 'Registration ID is required' },
        { status: 400 }
      )
    }
    
    // Get complete registration data from Redis
    const registrationDataStr = await redis.get(`registration:${registrationId}`)
    if (!registrationDataStr) {
      return NextResponse.json(
        { error: 'Registration session expired or not found' },
        { status: 404 }
      )
    }
    
    const registrationData = JSON.parse(registrationDataStr)
    
    // Validate all steps are completed
    if (registrationData.step < 3) {
      return NextResponse.json(
        { error: 'Registration process not completed' },
        { status: 400 }
      )
    }
    
    const { data } = registrationData
    
    // Create user in database
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        role: data.role,
        studentId: data.studentId,
        department: data.department,
        status: 'PENDING_APPROVAL',
        emailVerified: true, // Already verified in step 1
        profile: {
          create: {
            dateOfBirth: data.dateOfBirth,
            address: data.address,
            emergencyContact: data.emergencyContact
          }
        },
        document: {
          create: {
            type: data.document.type,
            number: data.document.number,
            url: data.document.url,
            extractedText: data.document.extractedText,
            status: 'PENDING_VERIFICATION'
          }
        },
        faceProfile: {
          create: {
            images: data.faceProfile.images,
            descriptors: data.faceProfile.descriptors,
            quality: data.faceProfile.quality,
            consentGiven: data.faceProfile.consentGiven,
            status: 'PENDING_APPROVAL'
          }
        }
      },
      include: {
        profile: true,
        document: true,
        faceProfile: true
      }
    })
    
    // Clean up Redis registration data
    await redis.del(`registration:${registrationId}`)
    
    // Send notifications
    await sendWelcomeEmail(user.email, user.firstName)
    await notifyAdminNewRegistration(user)
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status
      },
      message: 'Registration completed successfully. Your account is pending approval.'
    })
    
  } catch (error) {
    console.error('Registration completion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcrypt'
import { sign } from 'jsonwebtoken'
import { loginSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = loginSchema.parse(body)
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
      include: {
        profile: true,
        faceProfile: true
      }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Check password
    const isPasswordValid = await compare(validatedData.password, user.password)
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Check account status
    if (user.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Account has been suspended' },
        { status: 403 }
      )
    }
    
    if (user.status === 'PENDING_APPROVAL') {
      return NextResponse.json(
        { error: 'Account is pending approval' },
        { status: 403 }
      )
    }
    
    // Generate JWT token
    const token = sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })
    
    // Set HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        profile: user.profile,
        faceProfile: user.faceProfile ? {
          id: user.faceProfile.id,
          quality: user.faceProfile.quality,
          status: user.faceProfile.status
        } : null
      },
      message: 'Login successful'
    })
    
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })
    
    return response
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// app/api/auth/logout/route.ts
export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  })
  
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0
  })
  
  return response
}