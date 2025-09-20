/**
 * Cloudinary upload utilities for file storage
 */

export interface CloudinaryUploadResult {
  public_id: string
  url: string
  secure_url: string
  width?: number
  height?: number
  format: string
  resource_type: string
  bytes: number
  created_at: string
}

export interface UploadOptions {
  folder?: string
  public_id?: string
  transformation?: Record<string, any>
  resource_type?: 'image' | 'video' | 'raw' | 'auto'
  format?: string
  quality?: string | number
  width?: number
  height?: number
  crop?: string
  tags?: string[]
}

/**
 * Mock Cloudinary service for development
 */
class MockCloudinaryService {
  async uploadFile(
    file: File | Buffer,
    options: UploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    const mockId = `mock_${Date.now()}_${Math.random().toString(36).substring(2)}`
    const mockUrl = `https://res.cloudinary.com/demo/image/upload/${options.folder || 'uploads'}/${mockId}.jpg`

    return {
      public_id: mockId,
      url: mockUrl,
      secure_url: mockUrl,
      width: options.width || 800,
      height: options.height || 600,
      format: options.format || 'jpg',
      resource_type: options.resource_type || 'image',
      bytes: file instanceof File ? file.size : Buffer.byteLength(file),
      created_at: new Date().toISOString()
    }
  }

  async deleteFile(publicId: string): Promise<{ result: string }> {
    console.log(`Mock: Deleting file with public_id: ${publicId}`)
    await new Promise(resolve => setTimeout(resolve, 500))
    return { result: 'ok' }
  }

  generateUrl(publicId: string, options: UploadOptions = {}): string {
    const baseUrl = 'https://res.cloudinary.com/demo/image/upload'
    const transformations = []

    if (options.width) transformations.push(`w_${options.width}`)
    if (options.height) transformations.push(`h_${options.height}`)
    if (options.crop) transformations.push(`c_${options.crop}`)
    if (options.quality) transformations.push(`q_${options.quality}`)

    const transformString = transformations.length > 0 ? `/${transformations.join(',')}` : ''

    return `${baseUrl}${transformString}/${publicId}`
  }
}

/**
 * Real Cloudinary service (requires API credentials)
 */
class CloudinaryService {
  private cloudName: string
  private apiKey: string
  private apiSecret: string

  constructor() {
    this.cloudName = process.env.CLOUDINARY_CLOUD_NAME || ''
    this.apiKey = process.env.CLOUDINARY_API_KEY || ''
    this.apiSecret = process.env.CLOUDINARY_API_SECRET || ''

    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      console.warn('Cloudinary credentials not found, using mock service')
    }
  }

  async uploadFile(
    file: File | Buffer,
    options: UploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    // If credentials are missing, fall back to mock service
    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      const mockService = new MockCloudinaryService()
      return mockService.uploadFile(file, options)
    }

    try {
      // Convert file to base64 data URL
      let dataUrl: string

      if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const base64 = buffer.toString('base64')
        dataUrl = `data:${file.type};base64,${base64}`
      } else {
        const base64 = file.toString('base64')
        dataUrl = `data:image/jpeg;base64,${base64}`
      }

      // Prepare form data
      const formData = new FormData()
      formData.append('file', dataUrl)
      formData.append('upload_preset', 'unsigned_upload') // You'll need to create this in Cloudinary

      if (options.folder) formData.append('folder', options.folder)
      if (options.public_id) formData.append('public_id', options.public_id)
      if (options.tags) formData.append('tags', options.tags.join(','))

      // Upload to Cloudinary
      const uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/${options.resource_type || 'image'}/upload`

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()

      return {
        public_id: result.public_id,
        url: result.url,
        secure_url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        resource_type: result.resource_type,
        bytes: result.bytes,
        created_at: result.created_at
      }

    } catch (error) {
      console.error('Cloudinary upload error:', error)
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async deleteFile(publicId: string): Promise<{ result: string }> {
    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      const mockService = new MockCloudinaryService()
      return mockService.deleteFile(publicId)
    }

    try {
      const timestamp = Math.round(Date.now() / 1000)
      const signature = this.generateSignature({
        public_id: publicId,
        timestamp: timestamp.toString()
      })

      const formData = new FormData()
      formData.append('public_id', publicId)
      formData.append('timestamp', timestamp.toString())
      formData.append('api_key', this.apiKey)
      formData.append('signature', signature)

      const deleteUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`

      const response = await fetch(deleteUrl, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      return { result: result.result }

    } catch (error) {
      console.error('Cloudinary delete error:', error)
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  generateUrl(publicId: string, options: UploadOptions = {}): string {
    const baseUrl = `https://res.cloudinary.com/${this.cloudName}/image/upload`
    const transformations = []

    if (options.width) transformations.push(`w_${options.width}`)
    if (options.height) transformations.push(`h_${options.height}`)
    if (options.crop) transformations.push(`c_${options.crop}`)
    if (options.quality) transformations.push(`q_${options.quality}`)

    const transformString = transformations.length > 0 ? `/${transformations.join(',')}` : ''

    return `${baseUrl}${transformString}/${publicId}`
  }

  private generateSignature(params: Record<string, string>): string {
    // This is a simplified signature generation
    // In production, you'd use the Cloudinary SDK or proper crypto functions
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&')

    const stringToSign = `${sortedParams}${this.apiSecret}`

    // Simple hash (in production, use SHA-1)
    let hash = 0
    for (let i = 0; i < stringToSign.length; i++) {
      const char = stringToSign.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16)
  }
}

// Create service instance
const cloudinaryService = new CloudinaryService()

// Export convenience functions
export async function uploadToCloudinary(
  file: File | Buffer,
  options: UploadOptions = {}
): Promise<CloudinaryUploadResult> {
  return cloudinaryService.uploadFile(file, options)
}

export async function deleteFromCloudinary(publicId: string): Promise<{ result: string }> {
  return cloudinaryService.deleteFile(publicId)
}

export function generateCloudinaryUrl(publicId: string, options: UploadOptions = {}): string {
  return cloudinaryService.generateUrl(publicId, options)
}

// Upload face images with optimizations
export async function uploadFaceImage(
  file: File | Buffer,
  userId: string
): Promise<CloudinaryUploadResult> {
  return uploadToCloudinary(file, {
    folder: 'face_profiles',
    public_id: `face_${userId}_${Date.now()}`,
    resource_type: 'image',
    format: 'jpg',
    quality: 'auto:good',
    width: 400,
    height: 400,
    crop: 'fill',
    tags: ['face_profile', 'attendance']
  })
}

// Upload document images
export async function uploadDocument(
  file: File | Buffer,
  userId: string,
  documentType: string
): Promise<CloudinaryUploadResult> {
  return uploadToCloudinary(file, {
    folder: 'documents',
    public_id: `doc_${userId}_${documentType}_${Date.now()}`,
    resource_type: 'image',
    format: 'jpg',
    quality: 'auto:good',
    tags: ['document', documentType]
  })
}

export { CloudinaryService, MockCloudinaryService }