import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Upload file to Cloudinary (simplified approach)
async function uploadToCloudinary(
  buffer: Buffer,
  fileName: string,
  folder: string,
  fileType: string
): Promise<{ url: string; publicId: string }> {
  try {
    // Different settings for images vs PDFs
    const isImage = fileType.startsWith('image/')
    const isPDF = fileType === 'application/pdf'

    // Convert buffer to base64 data URI
    const base64 = buffer.toString('base64')
    const dataURI = `data:${fileType};base64,${base64}`

    const uploadOptions: any = {
      folder: `face-attendance/${folder}`,
      public_id: `${folder}_${Date.now()}_${fileName.split('.')[0]}`,
      resource_type: isPDF ? 'raw' : 'image',
      overwrite: true
    }

    const result = await cloudinary.uploader.upload(dataURI, uploadOptions)

    return {
      url: result.secure_url,
      publicId: result.public_id
    }
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Upload API called')
    const formData = await request.formData()

    const file = formData.get('file') as File | null
    const folder = formData.get('folder') as string || 'uploads'
    const fileName = formData.get('fileName') as string || file?.name || 'file'

    console.log('File info:', {
      hasFile: !!file,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      folder,
      requestedFileName: fileName
    })

    if (!file) {
      console.log('No file provided')
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      console.log('File type not allowed:', file.type, 'Expected one of:', allowedTypes)
      return NextResponse.json(
        { error: `File type not allowed: ${file.type}. Allowed types: ${allowedTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      console.log('File too large:', file.size)
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    console.log('Starting Cloudinary upload...')

    // Upload to Cloudinary
    const upload = await uploadToCloudinary(
      Buffer.from(await file.arrayBuffer()),
      fileName,
      folder,
      file.type
    )

    console.log('Upload successful:', upload)

    return NextResponse.json({
      success: true,
      url: upload.url,
      publicId: upload.publicId,
      message: 'File uploaded successfully to Cloudinary'
    }, { status: 200 })

  } catch (error) {
    console.error('Upload error:', error)

    return NextResponse.json(
      {
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}