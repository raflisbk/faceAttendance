'use client'

import React, { useRef, useCallback, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QrCode, Camera, X, Check, AlertCircle } from 'lucide-react'

interface QRScannerProps {
  onScan: (data: string) => void
  onError?: (error: string) => void
  onClose?: () => void
  isActive?: boolean
}

interface ScanResult {
  data: string
  timestamp: number
}

export function QRScanner({
  onScan,
  onError,
  onClose,
  isActive = true
}: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [scanningActive, setScanningActive] = useState(false)

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera for QR codes
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      })

      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
      }
    } catch (error) {
      console.error('Camera access error:', error)
      onError?.('Failed to access camera. Please check permissions.')
    }
  }, [onError])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setScanningActive(false)
  }, [stream])

  // Simulate QR code scanning (in production, you'd use a proper QR code library)
  const scanForQRCode = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !scanningActive) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx || video.videoWidth === 0) return

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Simulate QR code detection
    // In production, you'd use a library like jsQR
    const mockQRDetection = Math.random() > 0.95 // 5% chance of "detecting" QR code

    if (mockQRDetection && !scanResult) {
      const mockQRData = JSON.stringify({
        type: 'ATTENDANCE_QR',
        classId: 'mock-class-id',
        sessionToken: 'mock-session-token',
        generatedBy: 'mock-lecturer',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        sessionDuration: 60
      })

      const result: ScanResult = {
        data: mockQRData,
        timestamp: Date.now()
      }

      setScanResult(result)
      setScanningActive(false)
      onScan(mockQRData)
    }
  }, [scanningActive, scanResult, onScan])

  // Start scanning
  const startScanning = useCallback(() => {
    setIsScanning(true)
    setScanningActive(true)
    setScanResult(null)
    startCamera()
  }, [startCamera])

  // Stop scanning
  const stopScanning = useCallback(() => {
    setIsScanning(false)
    setScanningActive(false)
    stopCamera()
  }, [stopCamera])

  // Scanning loop
  useEffect(() => {
    if (!scanningActive) return

    const interval = setInterval(scanForQRCode, 100) // Scan every 100ms

    return () => clearInterval(interval)
  }, [scanForQRCode, scanningActive])

  // Auto-start when component becomes active
  useEffect(() => {
    if (isActive && !isScanning) {
      startScanning()
    } else if (!isActive && isScanning) {
      stopScanning()
    }

    return () => {
      stopCamera()
    }
  }, [isActive, isScanning, startScanning, stopScanning, stopCamera])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  if (scanResult) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <Check className="h-5 w-5" />
            QR Code Scanned
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <QrCode className="h-5 w-5" />
              <span className="font-medium">Successfully scanned QR code</span>
            </div>
            <p className="text-sm text-green-600 mt-2">
              Processing attendance data...
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                setScanResult(null)
                startScanning()
              }}
              variant="outline"
              className="flex-1"
            >
              Scan Another
            </Button>
            {onClose && (
              <Button
                onClick={onClose}
                variant="default"
                className="flex-1"
              >
                Done
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Scanner
          </div>
          {onClose && (
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Camera view */}
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-64 object-cover"
            playsInline
            muted
          />

          {/* Scanning overlay */}
          {scanningActive && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="border-2 border-white rounded-lg w-48 h-48 relative">
                {/* Scanning corners */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500" />

                {/* Scanning line */}
                <div className="absolute inset-x-0 top-1/2 h-1 bg-blue-500 opacity-60 animate-pulse" />
              </div>
            </div>
          )}

          {/* Hidden canvas for QR detection */}
          <canvas
            ref={canvasRef}
            className="hidden"
          />
        </div>

        {/* Status */}
        {scanningActive ? (
          <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-800 rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            <span className="text-sm font-medium">Scanning for QR code...</span>
          </div>
        ) : !isScanning ? (
          <div className="flex items-center gap-2 p-3 bg-gray-50 text-gray-600 rounded-lg">
            <Camera className="h-4 w-4" />
            <span className="text-sm">Ready to scan</span>
          </div>
        ) : null}

        {/* Controls */}
        <div className="flex gap-2">
          {!isScanning ? (
            <Button
              onClick={startScanning}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Start Scanning
            </Button>
          ) : (
            <Button
              onClick={stopScanning}
              variant="outline"
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Stop Scanning
            </Button>
          )}
        </div>

        {/* Instructions */}
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Instructions:</p>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• Point camera at QR code</li>
                <li>• Keep QR code within the frame</li>
                <li>• Ensure good lighting</li>
                <li>• Hold steady until scanned</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default QRScanner