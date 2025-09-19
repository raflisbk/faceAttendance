'use client'

import React, { useRef, useCallback, useState, useEffect } from 'react'
import Webcam from 'react-webcam'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, RotateCcw, Check, X } from 'lucide-react'

interface FaceCaptureProps {
  onCapture: (imageData: string) => void
  onError?: (error: string) => void
  width?: number
  height?: number
  showPreview?: boolean
}

interface FaceDetection {
  isDetected: boolean
  quality: number
  message: string
}

export function FaceCapture({
  onCapture,
  onError,
  width = 640,
  height = 480,
  showPreview = true
}: FaceCaptureProps) {
  const webcamRef = useRef<Webcam>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [faceDetection, setFaceDetection] = useState<FaceDetection>({
    isDetected: false,
    quality: 0,
    message: 'Position your face in the center'
  })
  const [isWebcamReady, setIsWebcamReady] = useState(false)

  const videoConstraints = {
    width: width,
    height: height,
    facingMode: 'user'
  }

  const capture = useCallback(() => {
    if (webcamRef.current) {
      setIsCapturing(true)

      setTimeout(() => {
        const imageSrc = webcamRef.current?.getScreenshot()
        if (imageSrc) {
          setCapturedImage(imageSrc)
          onCapture(imageSrc)
        } else {
          onError?.('Failed to capture image')
        }
        setIsCapturing(false)
      }, 100)
    }
  }, [onCapture, onError])

  const retake = useCallback(() => {
    setCapturedImage(null)
    setFaceDetection({
      isDetected: false,
      quality: 0,
      message: 'Position your face in the center'
    })
  }, [])

  const onUserMedia = useCallback(() => {
    setIsWebcamReady(true)
  }, [])

  const onUserMediaError = useCallback((error: string | DOMException) => {
    console.error('Webcam error:', error)
    const message = typeof error === 'string' ? error : 'Failed to access camera'
    onError?.(message)
  }, [onError])

  // Simulate face detection (in production, you'd use actual face detection)
  useEffect(() => {
    if (!isWebcamReady || capturedImage) return

    const interval = setInterval(() => {
      // Simulate face detection feedback
      const random = Math.random()

      if (random > 0.7) {
        setFaceDetection({
          isDetected: true,
          quality: Math.floor(random * 40) + 60,
          message: 'Face detected - Good quality'
        })
      } else if (random > 0.4) {
        setFaceDetection({
          isDetected: true,
          quality: Math.floor(random * 30) + 30,
          message: 'Face detected - Adjust lighting'
        })
      } else {
        setFaceDetection({
          isDetected: false,
          quality: 0,
          message: 'No face detected - Look at camera'
        })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isWebcamReady, capturedImage])

  if (capturedImage && showPreview) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Review Captured Image
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <img
              src={capturedImage}
              alt="Captured face"
              className="w-full rounded-lg"
            />
            <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
              <Check className="h-4 w-4" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={retake}
              variant="outline"
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Face Capture
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            onUserMedia={onUserMedia}
            onUserMediaError={onUserMediaError}
            className="w-full rounded-lg"
          />

          {/* Face detection overlay */}
          {isWebcamReady && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className={`border-2 rounded-full w-48 h-48 ${
                  faceDetection.isDetected
                    ? faceDetection.quality > 60
                      ? 'border-green-500'
                      : 'border-yellow-500'
                    : 'border-red-500'
                }`}
              />
            </div>
          )}
        </div>

        {/* Face detection status */}
        {isWebcamReady && (
          <div className={`p-3 rounded-lg ${
            faceDetection.isDetected
              ? faceDetection.quality > 60
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {faceDetection.message}
              </span>
              {faceDetection.isDetected && (
                <span className="text-xs">
                  {faceDetection.quality}% quality
                </span>
              )}
            </div>
          </div>
        )}

        {/* Capture button */}
        <Button
          onClick={capture}
          disabled={!isWebcamReady || isCapturing || (faceDetection.isDetected && faceDetection.quality < 50)}
          className="w-full"
        >
          {isCapturing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Capturing...
            </>
          ) : (
            <>
              <Camera className="h-4 w-4 mr-2" />
              Capture Face
            </>
          )}
        </Button>

        {/* Instructions */}
        <div className="text-sm text-gray-600 space-y-1">
          <p>• Look directly at the camera</p>
          <p>• Ensure good lighting</p>
          <p>• Keep your face centered in the circle</p>
          <p>• Remove glasses if possible</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default FaceCapture