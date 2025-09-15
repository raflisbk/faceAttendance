import React, { useRef, useEffect, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import * as faceapi from '@vladmandic/face-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Camera, 
  CameraOff, 
  CheckCircle, 
  AlertCircle, 
  RotateCcw,
  Eye,
  Lightbulb,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FACE_RECOGNITION } from '@/lib/constants'

interface FaceCaptureProps {
  mode: 'enrollment' | 'attendance'
  onCaptureComplete: (faceData: FaceCaptureResult) => void
  onError: (error: string) => void
  className?: string
  requiredPoses?: number
  existingDescriptors?: Float32Array[]
}

interface FaceCaptureResult {
  descriptor: Float32Array
  image: string
  confidence: number
  quality: FaceQuality
  pose: string
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

interface DetectionState {
  isDetecting: boolean
  faceDetected: boolean
  confidence: number
  quality: FaceQuality | null
  currentPose: string
  environmentCheck: {
    lighting: 'good' | 'poor' | 'checking'
    distance: 'good' | 'too_close' | 'too_far' | 'checking'
    background: 'good' | 'busy' | 'checking'
  }
}

const POSE_REQUIREMENTS = [
  { name: 'center', instruction: 'Look straight at the camera' },
  { name: 'left', instruction: 'Turn your head slightly to the left' },
  { name: 'right', instruction: 'Turn your head slightly to the right' }
]

export const FaceCapture: React.FC<FaceCaptureProps> = ({
  mode,
  onCaptureComplete,
  onError,
  className,
  requiredPoses = 3,
  existingDescriptors = []
}) => {
  const webcamRef = useRef<Webcam>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [isWebcamReady, setIsWebcamReady] = useState(false)
  const [capturedPoses, setCapturedPoses] = useState<FaceCaptureResult[]>([])
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0)
  const [detectionState, setDetectionState] = useState<DetectionState>({
    isDetecting: false,
    faceDetected: false,
    confidence: 0,
    quality: null,
    currentPose: 'center',
    environmentCheck: {
      lighting: 'checking',
      distance: 'checking',
      background: 'checking'
    }
  })
  const [livenessCheck, setLivenessCheck] = useState({
    blinkDetected: false,
    headMovement: false,
    isChecking: false
  })

  // Load Face API models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models'
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ])
        setIsModelLoaded(true)
      } catch (error) {
        onError('Failed to load face recognition models')
      }
    }
    loadModels()
  }, [onError])

  // Environment and quality assessment
  const assessEnvironment = useCallback((video: HTMLVideoElement) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    
    // Brightness assessment
    let totalBrightness = 0
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
      totalBrightness += brightness
    }
    const avgBrightness = totalBrightness / (data.length / 4)
    
    // Background complexity assessment (simplified)
    let edgeCount = 0
    for (let i = 0; i < data.length - 4; i += 4) {
      const diff = Math.abs(data[i] - data[i + 4])
      if (diff > 50) edgeCount++
    }
    const backgroundComplexity = edgeCount / (data.length / 4)
    
    setDetectionState(prev => ({
      ...prev,
      environmentCheck: {
        lighting: avgBrightness < 80 ? 'poor' : avgBrightness > 200 ? 'poor' : 'good',
        distance: 'good', // Will be set by face detection
        background: backgroundComplexity > 0.3 ? 'busy' : 'good'
      }
    }))
  }, [])

  // Face quality assessment
  const assessFaceQuality = useCallback((detection: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>) => {
    const landmarks = detection.landmarks
    const box = detection.detection.box
    
    // Face size assessment
    const faceSize = Math.min(box.width, box.height)
    const faceArea = box.width * box.height
    
    // Pose estimation from landmarks
    const nose = landmarks.getNose()
    const leftEye = landmarks.getLeftEye()
    const rightEye = landmarks.getRightEye()
    
    const eyeCenter = {
      x: (leftEye[0].x + rightEye[0].x) / 2,
      y: (leftEye[0].y + rightEye[0].y) / 2
    }
    
    const yaw = Math.atan2(nose[3].x - eyeCenter.x, nose[3].y - eyeCenter.y) * 180 / Math.PI
    const pitch = Math.atan2(nose[3].y - eyeCenter.y, faceSize) * 180 / Math.PI
    
    // Quality scoring
    let qualityScore = 1.0
    
    // Size penalty
    if (faceSize < FACE_RECOGNITION.MIN_FACE_SIZE) qualityScore *= 0.7
    if (faceSize > FACE_RECOGNITION.MAX_FACE_SIZE) qualityScore *= 0.8
    
    // Pose penalty
    if (Math.abs(yaw) > 30) qualityScore *= 0.6
    if (Math.abs(pitch) > 20) qualityScore *= 0.7
    
    return {
      score: qualityScore,
      brightness: 0.8, // From environment assessment
      sharpness: 0.9, // Simplified
      faceSize: faceSize,
      pose: { yaw, pitch, roll: 0 }
    }
  }, [])

  // Face detection and analysis
  const detectFace = useCallback(async () => {
    if (!webcamRef.current?.video || !isModelLoaded || !isWebcamReady) return

    const video = webcamRef.current.video
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      // Environment assessment
      assessEnvironment(video)

      // Face detection
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (detection) {
        const confidence = detection.detection.score
        const quality = assessFaceQuality(detection)
        
        // Distance assessment based on face size
        const faceSize = Math.min(detection.detection.box.width, detection.detection.box.height)
        let distance: 'good' | 'too_close' | 'too_far' = 'good'
        if (faceSize > 300) distance = 'too_close'
        else if (faceSize < 120) distance = 'too_far'

        setDetectionState(prev => ({
          ...prev,
          faceDetected: true,
          confidence,
          quality,
          environmentCheck: {
            ...prev.environmentCheck,
            distance
          }
        }))

        // Draw detection overlay
        const displaySize = { width: video.videoWidth, height: video.videoHeight }
        faceapi.matchDimensions(canvas, displaySize)
        
        const resizedDetection = faceapi.resizeResults(detection, displaySize)
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          faceapi.draw.drawDetections(canvas, [resizedDetection])
          faceapi.draw.drawFaceLandmarks(canvas, [resizedDetection])
        }
      } else {
        setDetectionState(prev => ({
          ...prev,
          faceDetected: false,
          confidence: 0,
          quality: null
        }))
        
        // Clear canvas
        const ctx = canvas?.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
      }
    } catch (error) {
      console.error('Face detection error:', error)
    }
  }, [isModelLoaded, isWebcamReady, assessEnvironment, assessFaceQuality])

  // Start/stop detection
  useEffect(() => {
    if (detectionState.isDetecting && isModelLoaded && isWebcamReady) {
      detectionIntervalRef.current = setInterval(detectFace, 100)
    } else {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
        detectionIntervalRef.current = null
      }
    }

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }
    }
  }, [detectionState.isDetecting, isModelLoaded, isWebcamReady, detectFace])

  // Capture face
  const captureFace = useCallback(async () => {
    if (!webcamRef.current?.video || !detectionState.faceDetected || !detectionState.quality) {
      return
    }

    const video = webcamRef.current.video
    
    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (detection && detection.descriptor) {
        // Check for duplicate face in enrollment mode
        if (mode === 'enrollment' && existingDescriptors.length > 0) {
          const distances = existingDescriptors.map(desc => 
            faceapi.euclideanDistance(detection.descriptor, desc)
          )
          const minDistance = Math.min(...distances)
          
          if (minDistance < FACE_RECOGNITION.DESCRIPTOR_DISTANCE_THRESHOLD) {
            onError('This face is already registered in the system')
            return
          }
        }

        // Capture image
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0)
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8)

        const captureResult: FaceCaptureResult = {
          descriptor: detection.descriptor,
          image: imageDataUrl,
          confidence: detection.detection.score,
          quality: detectionState.quality,
          pose: POSE_REQUIREMENTS[currentPoseIndex].name
        }

        if (mode === 'enrollment') {
          const newCapturedPoses = [...capturedPoses, captureResult]
          setCapturedPoses(newCapturedPoses)

          if (newCapturedPoses.length >= requiredPoses) {
            // Complete enrollment
            const bestCapture = newCapturedPoses.reduce((best, current) => 
              current.quality.score > best.quality.score ? current : best
            )
            onCaptureComplete(bestCapture)
          } else {
            // Move to next pose
            setCurrentPoseIndex(prev => prev + 1)
          }
        } else {
          // Attendance mode - single capture
          onCaptureComplete(captureResult)
        }
      }
    } catch (error) {
      onError('Failed to capture face data')
    }
  }, [
    detectionState.faceDetected, 
    detectionState.quality, 
    mode, 
    existingDescriptors, 
    capturedPoses, 
    currentPoseIndex, 
    requiredPoses,
    onCaptureComplete,
    onError
  ])

  // Auto-capture when conditions are met
  useEffect(() => {
    if (
      detectionState.faceDetected &&
      detectionState.confidence > FACE_RECOGNITION.MIN_CONFIDENCE &&
      detectionState.quality?.score && detectionState.quality.score > 0.8 &&
      detectionState.environmentCheck.lighting === 'good' &&
      detectionState.environmentCheck.distance === 'good'
    ) {
      // Auto capture after 2 seconds of good conditions
      const timeout = setTimeout(() => {
        captureFace()
      }, 2000)
      
      return () => clearTimeout(timeout)
    }
  }, [detectionState, captureFace])

  const startDetection = () => {
    setDetectionState(prev => ({ ...prev, isDetecting: true }))
  }

  const stopDetection = () => {
    setDetectionState(prev => ({ ...prev, isDetecting: false }))
  }

  const resetCapture = () => {
    setCapturedPoses([])
    setCurrentPoseIndex(0)
    setDetectionState(prev => ({
      ...prev,
      faceDetected: false,
      confidence: 0,
      quality: null
    }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 dark:text-green-400'
      case 'poor': case 'too_close': case 'too_far': case 'busy': return 'text-red-600 dark:text-red-400'
      default: return 'text-yellow-600 dark:text-yellow-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle className="w-4 h-4" />
      case 'poor': case 'too_close': case 'too_far': case 'busy': return <AlertCircle className="w-4 h-4" />
      default: return <Eye className="w-4 h-4" />
    }
  }

  return (
    <Card className={cn("w-full max-w-2xl mx-auto", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          {mode === 'enrollment' ? 'Face Enrollment' : 'Face Recognition Attendance'}
        </CardTitle>
        {mode === 'enrollment' && (
          <div className="space-y-2">
            <Progress 
              value={(capturedPoses.length / requiredPoses) * 100} 
              className="w-full" 
            />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Captured {capturedPoses.length} of {requiredPoses} required poses
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Camera Feed */}
        <div className="relative rounded-lg overflow-hidden bg-black">
          <Webcam
            ref={webcamRef}
            audio={false}
            mirrored={true}
            screenshotFormat="image/jpeg"
            onUserMedia={() => setIsWebcamReady(true)}
            onUserMediaError={() => onError('Failed to access camera')}
            className="w-full h-auto"
            videoConstraints={{
              width: 640,
              height: 480,
              facingMode: 'user'
            }}
          />
          
          {/* Detection Overlay */}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full"
            width={640}
            height={480}
          />

          {/* Face Guide Overlay */}
          {detectionState.isDetecting && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={cn(
                "w-64 h-80 border-2 rounded-full border-dashed transition-colors duration-300",
                detectionState.faceDetected && detectionState.quality?.score && detectionState.quality.score > 0.8
                  ? "border-green-400" 
                  : "border-white"
              )}>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
                  {mode === 'enrollment' && POSE_REQUIREMENTS[currentPoseIndex]?.instruction}
                </div>
              </div>
            </div>
          )}

          {/* Status Indicators */}
          {detectionState.isDetecting && (
            <div className="absolute top-4 left-4 space-y-2">
              <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full bg-black bg-opacity-70 text-sm", getStatusColor(detectionState.environmentCheck.lighting))}>
                <Lightbulb className="w-4 h-4" />
                <span>Lighting: {detectionState.environmentCheck.lighting}</span>
              </div>
              
              <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full bg-black bg-opacity-70 text-sm", getStatusColor(detectionState.environmentCheck.distance))}>
                <User className="w-4 h-4" />
                <span>Distance: {detectionState.environmentCheck.distance}</span>
              </div>

              {detectionState.faceDetected && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black bg-opacity-70 text-sm text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Face detected ({Math.round(detectionState.confidence * 100)}%)</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Environment Status */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="text-center">
            <div className={cn("flex items-center justify-center mb-2", getStatusColor(detectionState.environmentCheck.lighting))}>
              {getStatusIcon(detectionState.environmentCheck.lighting)}
            </div>
            <p className="text-xs font-medium">Lighting</p>
            <p className="text-xs text-slate-500 capitalize">{detectionState.environmentCheck.lighting}</p>
          </div>
          
          <div className="text-center">
            <div className={cn("flex items-center justify-center mb-2", getStatusColor(detectionState.environmentCheck.distance))}>
              {getStatusIcon(detectionState.environmentCheck.distance)}
            </div>
            <p className="text-xs font-medium">Distance</p>
            <p className="text-xs text-slate-500 capitalize">{detectionState.environmentCheck.distance}</p>
          </div>
          
          <div className="text-center">
            <div className={cn("flex items-center justify-center mb-2", getStatusColor(detectionState.environmentCheck.background))}>
              {getStatusIcon(detectionState.environmentCheck.background)}
            </div>
            <p className="text-xs font-medium">Background</p>
            <p className="text-xs text-slate-500 capitalize">{detectionState.environmentCheck.background}</p>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-3 justify-center">
          {!detectionState.isDetecting ? (
            <Button 
              onClick={startDetection}
              disabled={!isModelLoaded || !isWebcamReady}
              variant="chalk"
              size="lg"
            >
              <Camera className="w-4 h-4 mr-2" />
              Start Detection
            </Button>
          ) : (
            <>
              <Button 
                onClick={stopDetection}
                variant="chalkOutline"
                size="lg"
              >
                <CameraOff className="w-4 h-4 mr-2" />
                Stop
              </Button>
              
              <Button 
                onClick={captureFace}
                disabled={!detectionState.faceDetected || !detectionState.quality || detectionState.quality.score < 0.8}
                variant="chalk"
                size="lg"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Capture
              </Button>
              
              {(mode === 'enrollment' && capturedPoses.length > 0) && (
                <Button 
                  onClick={resetCapture}
                  variant="destructive"
                  size="lg"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              )}
            </>
          )}
        </div>

        {/* Model Loading Status */}
        {!isModelLoaded && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 dark:border-slate-200 mx-auto mb-2"></div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Loading face recognition models...</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}