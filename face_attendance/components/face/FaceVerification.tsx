'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Camera } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface FaceVerificationProps {
  onVerificationComplete?: (success: boolean, data?: any) => void
  userId?: string
  className?: string
}

export default function FaceVerification({
  onVerificationComplete,
  userId,
  className
}: FaceVerificationProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean
    confidence?: number
    message: string
  } | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      setVerificationResult({
        success: false,
        message: 'Unable to access camera'
      })
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [stream])

  const captureAndVerify = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return

    setIsLoading(true)

    try {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext('2d')

      if (!context) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0)

      const imageData = canvas.toDataURL('image/jpeg', 0.8)

      // Call face verification API
      const response = await fetch('/api/face/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData,
          userId
        })
      })

      const result = await response.json()

      setVerificationResult({
        success: result.success,
        confidence: result.confidence,
        message: result.message || (result.success ? 'Verification successful!' : 'Verification failed')
      })

      onVerificationComplete?.(result.success, result)

    } catch (error) {
      console.error('Verification error:', error)
      setVerificationResult({
        success: false,
        message: 'Verification failed due to technical error'
      })
      onVerificationComplete?.(false)
    } finally {
      setIsLoading(false)
      stopCamera()
    }
  }, [userId, onVerificationComplete, stopCamera])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Face Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!stream && !verificationResult && (
          <div className="text-center">
            <Button onClick={startCamera} className="mb-4">
              Start Camera
            </Button>
            <p className="text-sm text-muted-foreground">
              Click to start camera for face verification
            </p>
          </div>
        )}

        {stream && !verificationResult && (
          <div className="space-y-4">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg border"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex gap-2 justify-center">
              <Button
                onClick={captureAndVerify}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? <LoadingSpinner className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                {isLoading ? 'Verifying...' : 'Verify Face'}
              </Button>
              <Button variant="outline" onClick={stopCamera}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {verificationResult && (
          <Alert className={verificationResult.success ? 'border-green-500' : 'border-red-500'}>
            <div className="flex items-center gap-2">
              {verificationResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <AlertDescription>
                {verificationResult.message}
                {verificationResult.confidence && (
                  <span className="block text-sm mt-1">
                    Confidence: {(verificationResult.confidence * 100).toFixed(1)}%
                  </span>
                )}
              </AlertDescription>
            </div>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}