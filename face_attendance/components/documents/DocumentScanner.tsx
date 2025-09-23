'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Scan, Upload, Camera, FileText } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface DocumentScannerProps {
  onScanComplete?: (data: any) => void
  allowedTypes?: string[]
  className?: string
}

export default function DocumentScanner({
  onScanComplete,
  allowedTypes = ['image/*', '.pdf'],
  className
}: DocumentScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<any>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment'
        }
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('Unable to access camera. Please ensure camera permissions are granted.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [stream])

  const captureDocument = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return

    setIsScanning(true)
    setError(null)

    try {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext('2d')

      if (!context) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0)

      const imageData = canvas.toDataURL('image/jpeg', 0.9)

      // Process document with OCR
      const response = await fetch('/api/documents/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData,
          type: 'camera_capture'
        })
      })

      const result = await response.json()

      if (result.success) {
        setScanResult(result.data)
        onScanComplete?.(result.data)
        stopCamera()
      } else {
        setError(result.message || 'Failed to process document')
      }

    } catch (error) {
      console.error('Document scanning error:', error)
      setError('Failed to scan document. Please try again.')
    } finally {
      setIsScanning(false)
    }
  }, [onScanComplete, stopCamera])

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsScanning(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/documents/scan', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        setScanResult(result.data)
        onScanComplete?.(result.data)
      } else {
        setError(result.message || 'Failed to process document')
      }

    } catch (error) {
      console.error('Document upload error:', error)
      setError('Failed to upload document. Please try again.')
    } finally {
      setIsScanning(false)
    }
  }, [onScanComplete])

  const resetScanner = () => {
    setScanResult(null)
    setError(null)
    stopCamera()
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="h-5 w-5" />
          Document Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!stream && !scanResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={startCamera}
                className="flex items-center gap-2 h-20"
                variant="outline"
              >
                <Camera className="h-6 w-6" />
                <div className="text-left">
                  <div className="font-medium">Use Camera</div>
                  <div className="text-sm text-muted-foreground">Capture document</div>
                </div>
              </Button>

              <Button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 h-20"
                variant="outline"
              >
                <Upload className="h-6 w-6" />
                <div className="text-left">
                  <div className="font-medium">Upload File</div>
                  <div className="text-sm text-muted-foreground">Select from device</div>
                </div>
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={allowedTypes.join(',')}
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}

        {stream && !scanResult && (
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

              <div className="absolute inset-4 border-2 border-primary border-dashed rounded-lg pointer-events-none">
                <div className="absolute -top-2 -left-2 w-6 h-6 border-l-2 border-t-2 border-primary"></div>
                <div className="absolute -top-2 -right-2 w-6 h-6 border-r-2 border-t-2 border-primary"></div>
                <div className="absolute -bottom-2 -left-2 w-6 h-6 border-l-2 border-b-2 border-primary"></div>
                <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-2 border-b-2 border-primary"></div>
              </div>
            </div>

            <div className="flex gap-2 justify-center">
              <Button
                onClick={captureDocument}
                disabled={isScanning}
                className="flex items-center gap-2"
              >
                {isScanning ? <LoadingSpinner className="h-4 w-4" /> : <Scan className="h-4 w-4" />}
                {isScanning ? 'Processing...' : 'Scan Document'}
              </Button>
              <Button variant="outline" onClick={stopCamera}>
                Cancel
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              Position the document within the frame and ensure good lighting
            </div>
          </div>
        )}

        {scanResult && (
          <div className="space-y-4">
            <Alert className="border-green-500">
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Document scanned successfully! Extracted {scanResult.textBlocks?.length || 0} text blocks.
              </AlertDescription>
            </Alert>

            {scanResult.preview && (
              <div className="space-y-2">
                <h4 className="font-medium">Preview:</h4>
                <img
                  src={scanResult.preview}
                  alt="Scanned document"
                  className="max-w-full h-auto rounded-lg border"
                />
              </div>
            )}

            {scanResult.extractedText && (
              <div className="space-y-2">
                <h4 className="font-medium">Extracted Text:</h4>
                <div className="p-3 bg-muted rounded-lg text-sm">
                  {scanResult.extractedText}
                </div>
              </div>
            )}

            <Button onClick={resetScanner} variant="outline" className="w-full">
              Scan Another Document
            </Button>
          </div>
        )}

        {isScanning && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <LoadingSpinner className="h-8 w-8 mx-auto" />
              <p className="text-sm text-muted-foreground">Processing document...</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}