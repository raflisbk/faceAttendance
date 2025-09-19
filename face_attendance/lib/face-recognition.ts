// face_attendance/lib/face-recognition.ts
import * as faceapi from '@vladmandic/face-api'
import { FACE_RECOGNITION } from './constants'

interface FaceDetectionResult {
  detection: faceapi.FaceDetection
  landmarks: faceapi.FaceLandmarks68
  descriptor: Float32Array
  confidence: number
  quality: FaceQuality
}

interface FaceQuality {
  score: number
  brightness: number
  sharpness: number
  faceSize: number
  pose: {
    yaw: number
    pitch: number
    roll: number
  }
}

export class FaceRecognitionService {
  private static instance: FaceRecognitionService
  private isInitialized = false
  private modelsLoaded = false

  private constructor() {}

  static getInstance(): FaceRecognitionService {
    if (!FaceRecognitionService.instance) {
      FaceRecognitionService.instance = new FaceRecognitionService()
    }
    return FaceRecognitionService.instance
  }

  /**
   * Initialize face-api models
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      const modelPath = '/models'
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
        faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
        faceapi.nets.faceExpressionNet.loadFromUri(modelPath)
      ])

      this.modelsLoaded = true
      this.isInitialized = true
      console.log('Face recognition models loaded successfully')
    } catch (error) {
      console.error('Failed to load face recognition models:', error)
      throw new Error('Failed to initialize face recognition system')
    }
  }

  /**
   * Detect face from video element
   */
  async detectFaceFromVideo(
    video: HTMLVideoElement,
    options?: faceapi.TinyFaceDetectorOptions
  ): Promise<FaceDetectionResult | null> {
    if (!this.modelsLoaded) {
      throw new Error('Face recognition models not loaded')
    }

    try {
      const detectionOptions = options || new faceapi.TinyFaceDetectorOptions({
        inputSize: FACE_RECOGNITION.INPUT_SIZE,
        scoreThreshold: FACE_RECOGNITION.DETECTION_THRESHOLD
      })

      const result = await faceapi
        .detectSingleFace(video, detectionOptions)
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!result) return null

      const quality = this.assessFaceQuality(result, video)
      
      return {
        detection: result.detection,
        landmarks: result.landmarks,
        descriptor: result.descriptor,
        confidence: result.detection.score,
        quality
      }
    } catch (error) {
      console.error('Face detection failed:', error)
      return null
    }
  }

  /**
   * Detect face from image
   */
  async detectFaceFromImage(
    image: HTMLImageElement | HTMLCanvasElement,
    options?: faceapi.TinyFaceDetectorOptions
  ): Promise<FaceDetectionResult | null> {
    if (!this.modelsLoaded) {
      throw new Error('Face recognition models not loaded')
    }

    try {
      const detectionOptions = options || new faceapi.TinyFaceDetectorOptions({
        inputSize: FACE_RECOGNITION.INPUT_SIZE,
        scoreThreshold: FACE_RECOGNITION.DETECTION_THRESHOLD
      })

      const result = await faceapi
        .detectSingleFace(image, detectionOptions)
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!result) return null

      const quality = this.assessFaceQuality(result, image)
      
      return {
        detection: result.detection,
        landmarks: result.landmarks,
        descriptor: result.descriptor,
        confidence: result.detection.score,
        quality
      }
    } catch (error) {
      console.error('Face detection failed:', error)
      return null
    }
  }

  /**
   * Compare face descriptors
   */
  compareFaces(
    descriptor1: Float32Array,
    descriptor2: Float32Array
  ): number {
    try {
      const distance = faceapi.euclideanDistance(descriptor1, descriptor2)
      const similarity = Math.max(0, 1 - distance)
      return Math.round(similarity * 100) / 100
    } catch (error) {
      console.error('Face comparison failed:', error)
      return 0
    }
  }

  /**
   * Find best match from stored descriptors
   */
  findBestMatch(
    queryDescriptor: Float32Array,
    storedDescriptors: Float32Array[],
    threshold: number = FACE_RECOGNITION.SIMILARITY_THRESHOLD
  ): { index: number; similarity: number } | null {
    if (!storedDescriptors.length) return null

    let bestMatch = { index: -1, similarity: 0 }

    storedDescriptors.forEach((descriptor, index) => {
      const similarity = this.compareFaces(queryDescriptor, descriptor)
      if (similarity > bestMatch.similarity) {
        bestMatch = { index, similarity }
      }
    })

    return bestMatch.similarity >= threshold ? bestMatch : null
  }

  /**
   * Assess face quality for enrollment/recognition
   */
  private assessFaceQuality(
    result: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>,
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): FaceQuality {
    const { detection, landmarks } = result
    const { box } = detection
    
    // Calculate face size relative to image
    const sourceWidth = source instanceof HTMLVideoElement ? source.videoWidth : source.width
    const sourceHeight = source instanceof HTMLVideoElement ? source.videoHeight : source.height
    const faceArea = box.width * box.height
    const imageArea = sourceWidth * sourceHeight
    const faceRatio = faceArea / imageArea

    // Estimate pose from landmarks
    const pose = this.estimatePose(landmarks)
    
    // Calculate quality metrics
    const faceSize = Math.min(box.width, box.height)
    const brightness = this.estimateBrightness(source, box)
    const sharpness = this.estimateSharpness(source, box)
    
    // Calculate overall quality score
    let qualityScore = 1.0
    
    // Size scoring
    if (faceRatio < 0.1) qualityScore *= 0.6  // Too small
    else if (faceRatio > 0.6) qualityScore *= 0.7  // Too large
    else if (faceRatio >= 0.15 && faceRatio <= 0.4) qualityScore *= 1.0  // Optimal
    else qualityScore *= 0.8
    
    // Pose scoring
    const poseAngle = Math.max(Math.abs(pose.yaw), Math.abs(pose.pitch), Math.abs(pose.roll))
    if (poseAngle > 30) qualityScore *= 0.5
    else if (poseAngle > 15) qualityScore *= 0.7
    else qualityScore *= 1.0
    
    // Brightness scoring
    if (brightness < 0.3 || brightness > 0.8) qualityScore *= 0.6
    else qualityScore *= 1.0
    
    // Sharpness scoring
    if (sharpness < 0.5) qualityScore *= 0.7
    else qualityScore *= 1.0

    return {
      score: Math.max(0, Math.min(1, qualityScore)),
      brightness,
      sharpness,
      faceSize,
      pose
    }
  }

  /**
   * Estimate head pose from landmarks
   */
  private estimatePose(landmarks: faceapi.FaceLandmarks68): { yaw: number; pitch: number; roll: number } {
    const nose = landmarks.getNose()
    const leftEye = landmarks.getLeftEye()
    const rightEye = landmarks.getRightEye()
    const mouth = landmarks.getMouth()

    if (!nose[3] || !leftEye[0] || !rightEye[3] || !mouth[0] || !mouth[6]) {
      return { yaw: 0, pitch: 0, roll: 0 }
    }

    const noseTip = nose[3]
    const leftEyePoint = leftEye[0]
    const rightEyePoint = rightEye[3]
    const leftMouth = mouth[0]
    const rightMouth = mouth[6]

    // Calculate yaw (left-right rotation)
    const eyeCenter = {
      x: (leftEyePoint.x + rightEyePoint.x) / 2,
      y: (leftEyePoint.y + rightEyePoint.y) / 2
    }
    const yaw = Math.atan2(noseTip.x - eyeCenter.x, noseTip.y - eyeCenter.y) * 180 / Math.PI

    // Calculate roll (head tilt)
    const eyeAngle = Math.atan2(rightEyePoint.y - leftEyePoint.y, rightEyePoint.x - leftEyePoint.x) * 180 / Math.PI
    const roll = eyeAngle

    // Calculate pitch (up-down rotation) - simplified
    const mouthCenter = {
      x: (leftMouth.x + rightMouth.x) / 2,
      y: (leftMouth.y + rightMouth.y) / 2
    }
    const pitch = Math.atan2(mouthCenter.y - eyeCenter.y, Math.abs(mouthCenter.x - eyeCenter.x)) * 180 / Math.PI - 90

    return { yaw, pitch, roll }
  }

  /**
   * Estimate brightness of face region
   */
  private estimateBrightness(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    box: faceapi.Box
  ): number {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return 0.5

      canvas.width = box.width
      canvas.height = box.height
      
      ctx.drawImage(source, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height)
      
      const imageData = ctx.getImageData(0, 0, box.width, box.height)
      const data = imageData.data
      
      let sum = 0
      for (let i = 0; i < data.length; i += 4) {
        // Calculate luminance
        const r = data[i] ?? 0
        const g = data[i + 1] ?? 0
        const b = data[i + 2] ?? 0
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b
        sum += luminance
      }
      
      return sum / (data.length / 4) / 255
    } catch (error) {
      console.error('Brightness estimation failed:', error)
      return 0.5
    }
  }

  /**
   * Estimate sharpness of face region
   */
  private estimateSharpness(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    box: faceapi.Box
  ): number {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return 0.5

      canvas.width = box.width
      canvas.height = box.height
      
      ctx.drawImage(source, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height)
      
      const imageData = ctx.getImageData(0, 0, box.width, box.height)
      const data = imageData.data
      
      // Simple edge detection for sharpness
      let gradientSum = 0
      const width = box.width
      const height = box.height
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4
          const current = data[idx] ?? 0
          const right = data[idx + 4] ?? 0
          const down = data[(y + 1) * width * 4 + x * 4] ?? 0

          const gradientX = Math.abs(current - right)
          const gradientY = Math.abs(current - down)
          gradientSum += Math.sqrt(gradientX * gradientX + gradientY * gradientY)
        }
      }
      
      const avgGradient = gradientSum / ((width - 2) * (height - 2))
      return Math.min(1, avgGradient / 50) // Normalize to 0-1
    } catch (error) {
      console.error('Sharpness estimation failed:', error)
      return 0.5
    }
  }

  /**
   * Create face descriptor for storage
   */
  async createFaceProfile(
    images: (HTMLImageElement | HTMLCanvasElement)[],
    minQualityScore: number = 0.7
  ): Promise<{ descriptors: Float32Array[]; avgQuality: number } | null> {
    const descriptors: Float32Array[] = []
    const qualities: number[] = []

    for (const image of images) {
      const result = await this.detectFaceFromImage(image)
      
      if (result && result.quality.score >= minQualityScore) {
        descriptors.push(result.descriptor)
        qualities.push(result.quality.score)
      }
    }

    if (descriptors.length === 0) return null

    const avgQuality = qualities.reduce((sum, q) => sum + q, 0) / qualities.length

    return { descriptors, avgQuality }
  }

  /**
   * Validate face for attendance
   */
  async validateFaceForAttendance(
    video: HTMLVideoElement,
    storedDescriptors: Float32Array[],
    minConfidence: number = 0.8
  ): Promise<{ success: boolean; confidence: number; quality: FaceQuality | null }> {
    const result = await this.detectFaceFromVideo(video)
    
    if (!result) {
      return { success: false, confidence: 0, quality: null }
    }

    if (result.quality.score < 0.7) {
      return { success: false, confidence: result.confidence, quality: result.quality }
    }

    const match = this.findBestMatch(result.descriptor, storedDescriptors, minConfidence)
    
    return {
      success: match !== null,
      confidence: match?.similarity || 0,
      quality: result.quality
    }
  }

  /**
   * Check liveness detection
   */
  async checkLiveness(
    video: HTMLVideoElement,
    instructions: ('blink' | 'smile' | 'turn_left' | 'turn_right')[]
  ): Promise<{ passed: boolean; completedInstructions: string[] }> {
    // Simplified liveness check - in production, implement proper liveness detection
    const completedInstructions: string[] = []

    for (const instruction of instructions) {
      // Simulate liveness check
      await new Promise(resolve => setTimeout(resolve, 2000))

      const result = await this.detectFaceFromVideo(video)
      if (result) {
        completedInstructions.push(instruction)
      }
    }

    return {
      passed: completedInstructions.length === instructions.length,
      completedInstructions
    }
  }
}

// Export convenience functions for easier use
const faceRecognitionService = FaceRecognitionService.getInstance()

export async function verifyFaceRecognition(
  inputImage: File | Buffer,
  storedDescriptors: number[]
): Promise<{ isMatch: boolean; confidence: number; distance: number }> {
  try {
    await faceRecognitionService.initialize()

    // Convert File/Buffer to image
    let img: HTMLImageElement
    if (inputImage instanceof File) {
      const url = URL.createObjectURL(inputImage)
      img = new Image()
      img.src = url
      await new Promise((resolve) => { img.onload = resolve })
      URL.revokeObjectURL(url)
    } else {
      const blob = new Blob([inputImage])
      const url = URL.createObjectURL(blob)
      img = new Image()
      img.src = url
      await new Promise((resolve) => { img.onload = resolve })
      URL.revokeObjectURL(url)
    }

    const result = await faceRecognitionService.detectFaceFromImage(img)
    if (!result) {
      return { isMatch: false, confidence: 0, distance: 1 }
    }

    // Convert stored descriptors back to Float32Array
    const storedDescriptor = new Float32Array(storedDescriptors)
    const distance = faceapi.euclideanDistance(result.descriptor, storedDescriptor)

    // Consider it a match if distance is less than 0.6
    const threshold = 0.6
    const isMatch = distance < threshold
    const confidence = Math.max(0, (threshold - distance) / threshold)

    return {
      isMatch,
      confidence: Math.round(confidence * 100) / 100,
      distance: Math.round(distance * 100) / 100
    }
  } catch (error) {
    console.error('Error verifying face recognition:', error)
    return { isMatch: false, confidence: 0, distance: 1 }
  }
}

export async function extractFaceDescriptors(imageBuffer: Buffer | File): Promise<Float32Array | null> {
  try {
    await faceRecognitionService.initialize()

    let img: HTMLImageElement
    if (imageBuffer instanceof File) {
      const url = URL.createObjectURL(imageBuffer)
      img = new Image()
      img.src = url
      await new Promise((resolve) => { img.onload = resolve })
      URL.revokeObjectURL(url)
    } else {
      const blob = new Blob([imageBuffer])
      const url = URL.createObjectURL(blob)
      img = new Image()
      img.src = url
      await new Promise((resolve) => { img.onload = resolve })
      URL.revokeObjectURL(url)
    }

    const result = await faceRecognitionService.detectFaceFromImage(img)
    return result ? result.descriptor : null
  } catch (error) {
    console.error('Error extracting face descriptors:', error)
    return null
  }
}

export async function validateFaceQuality(imageBuffer: Buffer | File): Promise<{
  isValid: boolean
  score: number
  issues: string[]
}> {
  try {
    await faceRecognitionService.initialize()

    let img: HTMLImageElement
    if (imageBuffer instanceof File) {
      const url = URL.createObjectURL(imageBuffer)
      img = new Image()
      img.src = url
      await new Promise((resolve) => { img.onload = resolve })
      URL.revokeObjectURL(url)
    } else {
      const blob = new Blob([imageBuffer])
      const url = URL.createObjectURL(blob)
      img = new Image()
      img.src = url
      await new Promise((resolve) => { img.onload = resolve })
      URL.revokeObjectURL(url)
    }

    const result = await faceRecognitionService.detectFaceFromImage(img)
    const issues: string[] = []

    if (!result) {
      issues.push('No face detected in image')
      return { isValid: false, score: 0, issues }
    }

    const quality = result.quality
    let score = Math.round(quality.score * 100)

    if (quality.score < 0.7) {
      issues.push('Overall face quality is too low')
    }

    if (quality.brightness < 0.3) {
      issues.push('Image is too dark')
    } else if (quality.brightness > 0.8) {
      issues.push('Image is too bright')
    }

    if (quality.sharpness < 0.5) {
      issues.push('Image is too blurry')
    }

    const poseAngle = Math.max(Math.abs(quality.pose.yaw), Math.abs(quality.pose.pitch), Math.abs(quality.pose.roll))
    if (poseAngle > 15) {
      issues.push('Face should be looking straight at the camera')
    }

    return {
      isValid: issues.length === 0 && quality.score >= 0.7,
      score,
      issues
    }
  } catch (error) {
    console.error('Error validating face quality:', error)
    return {
      isValid: false,
      score: 0,
      issues: ['Error processing image']
    }
  }
}

export async function enrollFaceProfile(
  imageBuffer: Buffer | File,
  userId: string
): Promise<{ success: boolean; descriptors?: number[]; error?: string }> {
  try {
    const qualityCheck = await validateFaceQuality(imageBuffer)

    if (!qualityCheck.isValid) {
      return {
        success: false,
        error: `Face quality issues: ${qualityCheck.issues.join(', ')}`
      }
    }

    const descriptors = await extractFaceDescriptors(imageBuffer)

    if (!descriptors) {
      return {
        success: false,
        error: 'Failed to extract face features'
      }
    }

    return {
      success: true,
      descriptors: Array.from(descriptors)
    }
  } catch (error) {
    console.error('Error enrolling face profile:', error)
    return {
      success: false,
      error: 'Failed to process face enrollment'
    }
  }
}

export async function calculateFaceProfileQuality(descriptors: number[]): Promise<number> {
  try {
    const mean = descriptors.reduce((sum, val) => sum + val, 0) / descriptors.length
    const variance = descriptors.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / descriptors.length
    const qualityScore = Math.min(100, Math.max(0, variance * 1000))
    return Math.round(qualityScore)
  } catch (error) {
    console.error('Error calculating face profile quality:', error)
    return 0
  }
}

export async function compareFaceDescriptors(
  descriptors1: number[],
  descriptors2: number[]
): Promise<{ similarity: number; distance: number }> {
  try {
    if (descriptors1.length !== descriptors2.length) {
      throw new Error('Descriptor arrays must have the same length')
    }

    const desc1 = new Float32Array(descriptors1)
    const desc2 = new Float32Array(descriptors2)
    const distance = faceapi.euclideanDistance(desc1, desc2)
    const similarity = Math.max(0, 1 - distance)

    return {
      similarity: Math.round(similarity * 100) / 100,
      distance: Math.round(distance * 100) / 100
    }
  } catch (error) {
    console.error('Error comparing face descriptors:', error)
    return { similarity: 0, distance: 1 }
  }
}

export async function performLivenessCheck(
  imageBuffer: Buffer | File
): Promise<{ isLive: boolean; confidence: number; checks: string[] }> {
  try {
    await faceRecognitionService.initialize()

    let img: HTMLImageElement
    if (imageBuffer instanceof File) {
      const url = URL.createObjectURL(imageBuffer)
      img = new Image()
      img.src = url
      await new Promise((resolve) => { img.onload = resolve })
      URL.revokeObjectURL(url)
    } else {
      const blob = new Blob([imageBuffer])
      const url = URL.createObjectURL(blob)
      img = new Image()
      img.src = url
      await new Promise((resolve) => { img.onload = resolve })
      URL.revokeObjectURL(url)
    }

    const result = await faceRecognitionService.detectFaceFromImage(img)
    const checks: string[] = []
    let confidence = 0

    if (!result) {
      return { isLive: false, confidence: 0, checks: ['No face detected'] }
    }

    // Check detection confidence
    if (result.confidence > 0.8) {
      checks.push('High detection confidence')
      confidence += 40
    } else {
      checks.push('Low detection confidence')
      confidence += 10
    }

    // Check quality metrics
    if (result.quality.score > 0.7) {
      checks.push('Good image quality')
      confidence += 30
    } else {
      checks.push('Poor image quality')
      confidence += 5
    }

    // Check pose - natural slight variations are good
    const poseAngle = Math.max(Math.abs(result.quality.pose.yaw), Math.abs(result.quality.pose.pitch))
    if (poseAngle < 5) {
      checks.push('Very rigid pose - may be a photo')
      confidence += 10
    } else if (poseAngle < 15) {
      checks.push('Natural pose variation')
      confidence += 30
    } else {
      checks.push('Excessive head movement')
      confidence += 15
    }

    const isLive = confidence >= 70

    return {
      isLive,
      confidence: Math.round(confidence),
      checks
    }
  } catch (error) {
    console.error('Error performing liveness check:', error)
    return {
      isLive: false,
      confidence: 0,
      checks: ['Error processing liveness check']
    }
  }
}