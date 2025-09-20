import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { authenticateRequest } from '@/lib/auth-helpers'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  try {
    // Optional authentication (allow during registration)
    const user = await authenticateRequest(request)
    // No need to enforce authentication for verification

    const { publicId } = await request.json()

    if (!publicId) {
      return NextResponse.json(
        { error: 'Public ID is required' },
        { status: 400 }
      )
    }

    try {
      // Check if resource exists on Cloudinary
      const result = await cloudinary.api.resource(publicId)

      return NextResponse.json({
        success: true,
        exists: true,
        resource: {
          publicId: result.public_id,
          url: result.secure_url,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          createdAt: result.created_at,
          uploadedAt: result.uploaded_at
        }
      })

    } catch (cloudinaryError: any) {
      // If resource not found, Cloudinary throws an error
      if (cloudinaryError.http_code === 404) {
        return NextResponse.json({
          success: true,
          exists: false,
          message: 'Resource not found on Cloudinary'
        })
      }

      // Other Cloudinary errors
      throw cloudinaryError
    }

  } catch (error) {
    console.error('Cloudinary verification error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}