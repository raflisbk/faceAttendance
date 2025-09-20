export interface CloudinaryVerificationResult {
  success: boolean
  exists: boolean
  resource?: {
    publicId: string
    url: string
    format: string
    width: number
    height: number
    bytes: number
    createdAt: string
    uploadedAt: string
  }
  message?: string
  error?: string
}

export async function verifyCloudinaryUpload(
  publicId: string,
  authToken?: string
): Promise<CloudinaryVerificationResult> {
  try {
    const response = await fetch('/api/cloudinary/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      },
      body: JSON.stringify({ publicId })
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        exists: false,
        error: result.error || 'Verification failed'
      }
    }

    return result
  } catch (error) {
    console.error('Cloudinary verification error:', error)
    return {
      success: false,
      exists: false,
      error: 'Network error during verification'
    }
  }
}

export function getCloudinaryImageUrl(
  publicId: string,
  transformation?: {
    width?: number
    height?: number
    crop?: string
    quality?: string
    format?: string
  }
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name'
  const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload`

  if (!transformation) {
    return `${baseUrl}/${publicId}`
  }

  const transformParams = []

  if (transformation.width) transformParams.push(`w_${transformation.width}`)
  if (transformation.height) transformParams.push(`h_${transformation.height}`)
  if (transformation.crop) transformParams.push(`c_${transformation.crop}`)
  if (transformation.quality) transformParams.push(`q_${transformation.quality}`)
  if (transformation.format) transformParams.push(`f_${transformation.format}`)

  const transformString = transformParams.join(',')

  return `${baseUrl}/${transformString}/${publicId}`
}

export function getOptimizedImageUrl(publicId: string): string {
  return getCloudinaryImageUrl(publicId, {
    width: 400,
    height: 300,
    crop: 'limit',
    quality: 'auto',
    format: 'webp'
  })
}

export function getThumbnailUrl(publicId: string): string {
  return getCloudinaryImageUrl(publicId, {
    width: 150,
    height: 150,
    crop: 'thumb',
    quality: 'auto',
    format: 'webp'
  })
}