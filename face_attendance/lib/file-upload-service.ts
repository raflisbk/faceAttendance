// face_attendance/lib/file-upload-service.ts
import { randomUUID } from 'crypto'

export interface UploadConfig {
  maxFileSize: number
  allowedMimeTypes: string[]
  allowedExtensions: string[]
  destination: 'local' | 'cloudinary' | 's3'
  folder?: string
  generateThumbnail?: boolean
  compressionQuality?: number
}

export interface UploadResult {
  success: boolean
  fileId: string
  originalName: string
  fileName: string
  filePath: string
  fileUrl: string
  mimeType: string
  fileSize: number
  dimensions?: {
    width: number
    height: number
  }
  thumbnail?: {
    url: string
    path: string
    dimensions: { width: number; height: number }
  }
  metadata?: Record<string, any>
  error?: string
}

export interface FileProcessingOptions {
  resize?: {
    width: number
    height: number
    fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  }
  compress?: {
    quality: number
    format?: 'jpeg' | 'png' | 'webp'
  }
  watermark?: {
    text: string
    position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    opacity: number
  }
}

export class FileUploadService {
  private static instance: FileUploadService
  private uploadConfigs: Map<string, UploadConfig> = new Map()

  private constructor() {
    this.initializeDefaultConfigs()
  }

  static getInstance(): FileUploadService {
    if (!FileUploadService.instance) {
      FileUploadService.instance = new FileUploadService()
    }
    return FileUploadService.instance
  }

  /**
   * Initialize default upload configurations
   */
  private initializeDefaultConfigs(): void {
    // Face image uploads
    this.uploadConfigs.set('face_images', {
      maxFileSize: 2 * 1024 * 1024, // 2MB
      allowedMimeTypes: ['image/jpeg', 'image/png'],
      allowedExtensions: ['.jpg', '.jpeg', '.png'],
      destination: 'cloudinary',
      folder: 'face_profiles',
      generateThumbnail: true,
      compressionQuality: 0.9
    })

    // Document uploads
    this.uploadConfigs.set('documents', {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf'],
      destination: 'cloudinary',
      folder: 'documents',
      generateThumbnail: false,
      compressionQuality: 0.8
    })

    // Profile avatars
    this.uploadConfigs.set('avatars', {
      maxFileSize: 1 * 1024 * 1024, // 1MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
      destination: 'cloudinary',
      folder: 'avatars',
      generateThumbnail: true,
      compressionQuality: 0.85
    })

    // Report exports
    this.uploadConfigs.set('reports', {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
      allowedExtensions: ['.pdf', '.xlsx', '.csv'],
      destination: 'local',
      folder: 'reports',
      generateThumbnail: false
    })
  }

  /**
   * Upload file with validation and processing
   */
  async uploadFile(
    file: File,
    configType: string,
    options: FileProcessingOptions = {},
    userId?: string
  ): Promise<UploadResult> {
    const config = this.uploadConfigs.get(configType)
    if (!config) {
      return {
        success: false,
        fileId: '',
        originalName: file.name,
        fileName: '',
        filePath: '',
        fileUrl: '',
        mimeType: file.type,
        fileSize: file.size,
        error: `Invalid upload configuration: ${configType}`
      }
    }

    // Validate file
    const validation = this.validateFile(file, config)
    if (!validation.valid) {
      return {
        success: false,
        fileId: '',
        originalName: file.name,
        fileName: '',
        filePath: '',
        fileUrl: '',
        mimeType: file.type,
        fileSize: file.size,
        error: validation.error || 'Validation failed'
      }
    }

    try {
      // Generate unique file ID and name
      const fileId = randomUUID()
      const extension = this.getFileExtension(file.name)
      const fileName = `${fileId}${extension}`
      
      // Convert file to buffer
      const buffer = await file.arrayBuffer()
      let processedBuffer = new Uint8Array(buffer) as unknown as Buffer

      // Process image if needed
      if (this.isImage(file.type) && Object.keys(options).length > 0) {
        processedBuffer = await this.processImage(processedBuffer, file.type, options) as Buffer
      }

      // Upload to configured destination
      let uploadResult: UploadResult
      
      switch (config.destination) {
        case 'cloudinary':
          uploadResult = await this.uploadToCloudinary(
            processedBuffer,
            fileName,
            file,
            config,
            fileId
          )
          break
        case 's3':
          uploadResult = await this.uploadToS3(
            processedBuffer,
            fileName,
            file,
            config,
            fileId
          )
          break
        case 'local':
        default:
          uploadResult = await this.uploadToLocal(
            processedBuffer,
            fileName,
            file,
            config,
            fileId
          )
          break
      }

      // Generate thumbnail if requested
      if (config.generateThumbnail && this.isImage(file.type)) {
        const thumbnail = await this.generateThumbnail(
          processedBuffer,
          file.type,
          config,
          fileId
        )
        uploadResult.thumbnail = thumbnail
      }

      // Store file metadata in database
      await this.storeFileMetadata({
        fileId,
        originalName: file.name,
        fileName,
        filePath: uploadResult.filePath,
        fileUrl: uploadResult.fileUrl,
        mimeType: file.type,
        fileSize: file.size,
        ...(uploadResult.dimensions && { dimensions: uploadResult.dimensions }),
        configType,
        ...(userId && { userId }),
        uploadedAt: new Date()
      })

      return uploadResult

    } catch (error) {
      console.error('File upload failed:', error)
      return {
        success: false,
        fileId: '',
        originalName: file.name,
        fileName: '',
        filePath: '',
        fileUrl: '',
        mimeType: file.type,
        fileSize: file.size,
        error: error instanceof Error ? error.message : 'Upload failed'
      }
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: File[],
    configType: string,
    options: FileProcessingOptions = {},
    userId?: string
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = []
    
    for (const file of files) {
      const result = await this.uploadFile(file, configType, options, userId)
      results.push(result)
    }
    
    return results
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get file metadata from database
      const fileMetadata = await this.getFileMetadata(fileId)
      if (!fileMetadata) {
        return { success: false, error: 'File not found' }
      }

      // Delete from storage
      const config = this.uploadConfigs.get(fileMetadata.configType)
      if (!config) {
        return { success: false, error: 'Invalid file configuration' }
      }

      switch (config.destination) {
        case 'cloudinary':
          await this.deleteFromCloudinary(fileMetadata.fileName)
          break
        case 's3':
          await this.deleteFromS3(fileMetadata.fileName)
          break
        case 'local':
        default:
          await this.deleteFromLocal(fileMetadata.filePath)
          break
      }

      // Delete thumbnail if exists
      if (fileMetadata.thumbnail) {
        await this.deleteFromLocal(fileMetadata.thumbnail.path)
      }

      // Remove from database
      await this.removeFileMetadata(fileId)

      return { success: true }

    } catch (error) {
      console.error('File deletion failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deletion failed'
      }
    }
  }

  /**
   * Get file URL
   */
  async getFileUrl(fileId: string): Promise<string | null> {
    const metadata = await this.getFileMetadata(fileId)
    return metadata?.fileUrl || null
  }

  /**
   * Validate file
   */
  private validateFile(file: File, config: UploadConfig): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > config.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds maximum limit of ${Math.round(config.maxFileSize / 1024 / 1024)}MB`
      }
    }

    // Check MIME type
    if (!config.allowedMimeTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} not allowed. Allowed types: ${config.allowedMimeTypes.join(', ')}`
      }
    }

    // Check file extension
    const extension = this.getFileExtension(file.name).toLowerCase()
    if (!config.allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `File extension ${extension} not allowed. Allowed extensions: ${config.allowedExtensions.join(', ')}`
      }
    }

    return { valid: true }
  }

  /**
   * Process image (resize, compress, watermark)
   */
  private async processImage(
    buffer: Buffer,
    _mimeType: string,
    options: FileProcessingOptions
  ): Promise<Buffer> {
    // Mock image processing - in production, use Sharp, Canvas API, or similar
    console.log('Processing image with options:', options)

    // Return original buffer for now
    // In production, implement actual image processing:
    // - Use Sharp for server-side processing
    // - Use Canvas API for client-side processing
    // - Implement resize, compression, watermarking

    return buffer
  }

  /**
   * Generate thumbnail
   */
  private async generateThumbnail(
    _buffer: Buffer,
    _mimeType: string,
    _config: UploadConfig,
    fileId: string
  ): Promise<{ url: string; path: string; dimensions: { width: number; height: number } }> {
    // Mock thumbnail generation
    const thumbnailFileName = `thumb_${fileId}.jpg`
    const thumbnailPath = `/uploads/thumbnails/${thumbnailFileName}`

    // In production, implement actual thumbnail generation
    // - Resize to standard thumbnail size (e.g., 150x150)
    // - Save to storage
    // - Return actual URLs and paths

    return {
      url: `${process.env.NEXT_PUBLIC_BASE_URL}${thumbnailPath}`,
      path: thumbnailPath,
      dimensions: { width: 150, height: 150 }
    }
  }

  /**
   * Upload to Cloudinary
   */
  private async uploadToCloudinary(
    buffer: Buffer,
    fileName: string,
    file: File,
    config: UploadConfig,
    fileId: string
  ): Promise<UploadResult> {
    // Mock Cloudinary upload - implement actual Cloudinary integration
    const fileUrl = `https://res.cloudinary.com/demo/image/upload/v1234567890/${config.folder}/${fileName}`
    const filePath = `${config.folder}/${fileName}`
    
    // Get image dimensions if it's an image
    let dimensions: { width: number; height: number } | undefined
    if (this.isImage(file.type)) {
      dimensions = await this.getImageDimensions(buffer, file.type)
    }
    
    return {
      success: true,
      fileId,
      originalName: file.name,
      fileName,
      filePath,
      fileUrl,
      mimeType: file.type,
      fileSize: file.size,
      ...(dimensions && { dimensions })
    }
  }

  /**
   * Upload to AWS S3
   */
  private async uploadToS3(
    buffer: Buffer,
    fileName: string,
    file: File,
    config: UploadConfig,
    fileId: string
  ): Promise<UploadResult> {
    // Mock S3 upload - implement actual S3 integration
    const fileUrl = `https://your-bucket.s3.amazonaws.com/${config.folder}/${fileName}`
    const filePath = `${config.folder}/${fileName}`
    
    let dimensions: { width: number; height: number } | undefined
    if (this.isImage(file.type)) {
      dimensions = await this.getImageDimensions(buffer, file.type)
    }
    
    return {
      success: true,
      fileId,
      originalName: file.name,
      fileName,
      filePath,
      fileUrl,
      mimeType: file.type,
      fileSize: file.size,
      ...(dimensions && { dimensions })
    }
  }

  /**
   * Upload to local storage
   */
  private async uploadToLocal(
    buffer: Buffer,
    fileName: string,
    file: File,
    config: UploadConfig,
    fileId: string
  ): Promise<UploadResult> {
    // Mock local upload - implement actual local file system storage
    const uploadDir = `/uploads/${config.folder}`
    const filePath = `${uploadDir}/${fileName}`
    const fileUrl = `${process.env.NEXT_PUBLIC_BASE_URL}${filePath}`
    
    // In production, save buffer to file system using Node.js fs module
    console.log(`Saving file to local storage: ${filePath}`)
    
    let dimensions: { width: number; height: number } | undefined
    if (this.isImage(file.type)) {
      dimensions = await this.getImageDimensions(buffer, file.type)
    }
    
    return {
      success: true,
      fileId,
      originalName: file.name,
      fileName,
      filePath,
      fileUrl,
      mimeType: file.type,
      fileSize: file.size,
      ...(dimensions && { dimensions })
    }
  }

  /**
   * Delete from Cloudinary
   */
  private async deleteFromCloudinary(fileName: string): Promise<void> {
    // Implement Cloudinary deletion
    console.log(`Deleting from Cloudinary: ${fileName}`)
  }

  /**
   * Delete from S3
   */
  private async deleteFromS3(fileName: string): Promise<void> {
    // Implement S3 deletion
    console.log(`Deleting from S3: ${fileName}`)
  }

  /**
   * Delete from local storage
   */
  private async deleteFromLocal(filePath: string): Promise<void> {
    // Implement local file deletion using Node.js fs module
    console.log(`Deleting from local storage: ${filePath}`)
    
    // In production:
    // const fs = require('fs').promises
    // await fs.unlink(filePath)
  }

  /**
   * Get image dimensions
   */
  private async getImageDimensions(
    _buffer: Buffer,
    _mimeType: string
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      // Mock dimensions - in production, use image processing library
      // to get actual dimensions from buffer
      
      // For demonstration, return mock dimensions
      resolve({ width: 800, height: 600 })
      
      // In production, implement actual dimension detection:
      // - Use Sharp for server-side
      // - Use Canvas API or Image constructor for client-side
      // - Parse image headers directly
    })
  }

  /**
   * Get file extension
   */
  private getFileExtension(fileName: string): string {
    return fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
  }

  /**
   * Check if file is an image
   */
  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/')
  }

  /**
   * Store file metadata in database
   */
  private async storeFileMetadata(metadata: {
    fileId: string
    originalName: string
    fileName: string
    filePath: string
    fileUrl: string
    mimeType: string
    fileSize: number
    dimensions?: { width: number; height: number }
    configType: string
    userId?: string
    uploadedAt: Date
  }): Promise<void> {
    // In production, store in database using Prisma
    console.log('Storing file metadata:', metadata)
    
    // Example Prisma call:
    // await prisma.fileUpload.create({
    //   data: metadata
    // })
  }

  /**
   * Get file metadata from database
   */
  private async getFileMetadata(fileId: string): Promise<any | null> {
    // In production, fetch from database using Prisma
    console.log('Getting file metadata for:', fileId)
    
    // Example Prisma call:
    // return await prisma.fileUpload.findUnique({
    //   where: { fileId }
    // })
    
    // Mock return for demonstration
    return {
      fileId,
      fileName: `${fileId}.jpg`,
      filePath: `/uploads/test/${fileId}.jpg`,
      fileUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/uploads/test/${fileId}.jpg`,
      configType: 'face_images',
      thumbnail: null
    }
  }

  /**
   * Remove file metadata from database
   */
  private async removeFileMetadata(fileId: string): Promise<void> {
    // In production, delete from database using Prisma
    console.log('Removing file metadata for:', fileId)
    
    // Example Prisma call:
    // await prisma.fileUpload.delete({
    //   where: { fileId }
    // })
  }

  /**
   * Get upload configuration
   */
  getUploadConfig(configType: string): UploadConfig | undefined {
    return this.uploadConfigs.get(configType)
  }

  /**
   * Add custom upload configuration
   */
  addUploadConfig(configType: string, config: UploadConfig): void {
    this.uploadConfigs.set(configType, config)
  }

  /**
   * Update upload configuration
   */
  updateUploadConfig(configType: string, updates: Partial<UploadConfig>): void {
    const existing = this.uploadConfigs.get(configType)
    if (existing) {
      this.uploadConfigs.set(configType, { ...existing, ...updates })
    }
  }

  /**
   * Get file statistics
   */
  async getFileStatistics(_userId?: string): Promise<{
    totalFiles: number
    totalSize: number
    byType: Record<string, { count: number; size: number }>
    byDate: Array<{ date: string; count: number; size: number }>
  }> {
    // Mock statistics - in production, query database
    return {
      totalFiles: 150,
      totalSize: 45 * 1024 * 1024, // 45MB
      byType: {
        'face_images': { count: 100, size: 20 * 1024 * 1024 },
        'documents': { count: 30, size: 15 * 1024 * 1024 },
        'avatars': { count: 20, size: 10 * 1024 * 1024 }
      },
      byDate: [
        { date: '2024-01-01', count: 10, size: 5 * 1024 * 1024 },
        { date: '2024-01-02', count: 15, size: 7 * 1024 * 1024 }
      ]
    }
  }

  /**
   * Cleanup orphaned files
   */
  async cleanupOrphanedFiles(): Promise<{
    deletedCount: number
    freedSpace: number
    errors: string[]
  }> {
    // Mock cleanup - in production, implement actual cleanup logic
    console.log('Starting orphaned file cleanup...')
    
    const result = {
      deletedCount: 0,
      freedSpace: 0,
      errors: [] as string[]
    }
    
    // In production:
    // 1. Find files in storage that don't have database records
    // 2. Find database records that don't have actual files
    // 3. Delete orphaned files and update database
    // 4. Return statistics
    
    return result
  }

  /**
   * Generate signed upload URL (for direct uploads)
   */
  async generateSignedUploadUrl(
    configType: string,
    _fileName: string,
    userId?: string
  ): Promise<{
    uploadUrl: string
    fileId: string
    expiresAt: Date
  }> {
    const config = this.uploadConfigs.get(configType)
    if (!config) {
      throw new Error(`Invalid upload configuration: ${configType}`)
    }
    
    const fileId = randomUUID()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    
    // Generate signed URL based on destination
    let uploadUrl: string
    
    switch (config.destination) {
      case 'cloudinary':
        uploadUrl = await this.generateCloudinarySignedUrl(fileId, config)
        break
      case 's3':
        uploadUrl = await this.generateS3SignedUrl(fileId, config)
        break
      default:
        throw new Error('Signed URLs not supported for local storage')
    }
    
    // Store pending upload record
    await this.storePendingUpload({
      fileId,
      uploadUrl,
      configType,
      ...(userId && { userId }),
      expiresAt
    })
    
    return {
      uploadUrl,
      fileId,
      expiresAt
    }
  }

  /**
   * Generate Cloudinary signed URL
   */
  private async generateCloudinarySignedUrl(
    fileId: string,
    _config: UploadConfig
  ): Promise<string> {
    // Mock Cloudinary signed URL generation
    // In production, use Cloudinary SDK to generate actual signed URLs
    return `https://api.cloudinary.com/v1_1/demo/image/upload?public_id=${fileId}&timestamp=${Date.now()}&signature=mock_signature`
  }

  /**
   * Generate S3 signed URL
   */
  private async generateS3SignedUrl(
    fileId: string,
    config: UploadConfig
  ): Promise<string> {
    // Mock S3 signed URL generation
    // In production, use AWS SDK to generate actual presigned URLs
    return `https://your-bucket.s3.amazonaws.com/${config.folder}/${fileId}?AWSAccessKeyId=mock&Expires=1234567890&Signature=mock_signature`
  }

  /**
   * Store pending upload record
   */
  private async storePendingUpload(data: {
    fileId: string
    uploadUrl: string
    configType: string
    userId?: string
    expiresAt: Date
  }): Promise<void> {
    // In production, store in database
    console.log('Storing pending upload:', data)
  }

  /**
   * Confirm direct upload completion
   */
  async confirmDirectUpload(
    fileId: string,
    metadata: {
      originalName: string
      fileSize: number
      mimeType: string
    }
  ): Promise<UploadResult> {
    // Get pending upload record
    const pendingUpload = await this.getPendingUpload(fileId)
    if (!pendingUpload) {
      throw new Error('Pending upload not found or expired')
    }
    
    const config = this.uploadConfigs.get(pendingUpload.configType)!
    const extension = this.getFileExtension(metadata.originalName)
    const fileName = `${fileId}${extension}`
    
    // Generate final URLs
    let fileUrl: string
    let filePath: string
    
    switch (config.destination) {
      case 'cloudinary':
        fileUrl = `https://res.cloudinary.com/demo/image/upload/v1234567890/${config.folder}/${fileName}`
        filePath = `${config.folder}/${fileName}`
        break
      case 's3':
        fileUrl = `https://your-bucket.s3.amazonaws.com/${config.folder}/${fileName}`
        filePath = `${config.folder}/${fileName}`
        break
      default:
        throw new Error('Direct upload not supported for local storage')
    }
    
    // Store final file metadata
    await this.storeFileMetadata({
      fileId,
      originalName: metadata.originalName,
      fileName,
      filePath,
      fileUrl,
      mimeType: metadata.mimeType,
      fileSize: metadata.fileSize,
      configType: pendingUpload.configType,
      userId: pendingUpload.userId,
      uploadedAt: new Date()
    })
    
    // Remove pending upload record
    await this.removePendingUpload(fileId)
    
    return {
      success: true,
      fileId,
      originalName: metadata.originalName,
      fileName,
      filePath,
      fileUrl,
      mimeType: metadata.mimeType,
      fileSize: metadata.fileSize
    }
  }

  /**
   * Get pending upload record
   */
  private async getPendingUpload(fileId: string): Promise<any | null> {
    // Mock implementation - in production, query database
    return {
      fileId,
      configType: 'face_images',
      userId: 'user123',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    }
  }

  /**
   * Remove pending upload record
   */
  private async removePendingUpload(fileId: string): Promise<void> {
    // Mock implementation - in production, delete from database
    console.log('Removing pending upload:', fileId)
  }

  /**
   * Process face images for enrollment
   */
  async processFaceImages(
    images: File[],
    userId: string
  ): Promise<{
    success: boolean
    results: UploadResult[]
    qualityScores: number[]
    averageQuality: number
    error?: string
  }> {
    if (images.length < 3 || images.length > 5) {
      return {
        success: false,
        results: [],
        qualityScores: [],
        averageQuality: 0,
        error: 'Face enrollment requires 3-5 images'
      }
    }
    
    const results: UploadResult[] = []
    const qualityScores: number[] = []
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i]
      if (!image) {
        return {
          success: false,
          results: [],
          qualityScores: [],
          averageQuality: 0,
          error: `Invalid image at index ${i}`
        }
      }
      
      // Upload face image
      const uploadResult = await this.uploadFile(
        image,
        'face_images',
        {
          resize: { width: 512, height: 512, fit: 'cover' },
          compress: { quality: 0.9 }
        },
        userId
      )
      
      if (!uploadResult.success) {
        return {
          success: false,
          results: [],
          qualityScores: [],
          averageQuality: 0,
          error: `Failed to upload image ${i + 1}: ${uploadResult.error}`
        }
      }
      
      results.push(uploadResult)
      
      // Mock quality assessment - in production, use actual face quality analysis
      const qualityScore = 0.7 + Math.random() * 0.3 // Mock score between 0.7-1.0
      qualityScores.push(qualityScore)
    }
    
    const averageQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
    
    // Check if quality meets minimum requirements
    if (averageQuality < 0.75) {
      // Delete uploaded images if quality is too low
      for (const result of results) {
        await this.deleteFile(result.fileId)
      }
      
      return {
        success: false,
        results: [],
        qualityScores: [],
        averageQuality: 0,
        error: 'Face image quality too low. Please retake photos with better lighting and positioning.'
      }
    }
    
    return {
      success: true,
      results,
      qualityScores,
      averageQuality
    }
  }

  /**
   * Get available upload configurations
   */
  getAvailableConfigs(): Array<{
    type: string
    config: UploadConfig
    description: string
  }> {
    return [
      {
        type: 'face_images',
        config: this.uploadConfigs.get('face_images')!,
        description: 'Face images for enrollment and verification'
      },
      {
        type: 'documents',
        config: this.uploadConfigs.get('documents')!,
        description: 'Identity documents and verification files'
      },
      {
        type: 'avatars',
        config: this.uploadConfigs.get('avatars')!,
        description: 'Profile avatar images'
      },
      {
        type: 'reports',
        config: this.uploadConfigs.get('reports')!,
        description: 'Generated reports and exports'
      }
    ]
  }
}