import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToastHelpers } from '@/components/ui/toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  QrCode,
  Download,
  RefreshCw,
  Clock,
  Calendar,
  MapPin,
  Users,
  Copy,
  Share2,
  Printer,
  Eye,
  EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FormatUtils, DateUtils } from '@/lib/utils'

interface QRCodeData {
  id: string
  classId: string
  className: string
  sessionDate: string
  sessionTime: string
  location: string
  expiresAt: string
  token: string
  isActive: boolean
}

interface Class {
  id: string
  name: string
  code: string
  location: {
    name: string
    building: string
  }
  schedule: {
    dayOfWeek: number
    startTime: string
    endTime: string
  }
}

interface QRCodeGeneratorProps {
  lecturerId: string
  userRole: 'ADMIN' | 'LECTURER'
  className?: string
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  lecturerId,
  userRole,
  className
}) => {
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [qrCodeData, setQRCodeData] = useState<QRCodeData | null>(null)
  const [qrCodeImage, setQRCodeImage] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [sessionDuration, setSessionDuration] = useState<number>(60) // minutes
  const [showQRCode, setShowQRCode] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const toast = useToastHelpers()

  useEffect(() => {
    loadClasses()
  }, [lecturerId])

  useEffect(() => {
    if (autoRefresh && qrCodeData) {
      refreshIntervalRef.current = setInterval(() => {
        generateQRCode(selectedClass, sessionDuration, true)
      }, 300000) // Refresh every 5 minutes

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
        }
      }
    }
  }, [autoRefresh, qrCodeData, selectedClass, sessionDuration])

  const loadClasses = async () => {
    try {
      setIsLoading(true)
      
      const endpoint = userRole === 'ADMIN' 
        ? '/api/classes'
        : `/api/classes/lecturer/${lecturerId}`

      const response = await fetch(endpoint)
      
      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes || [])
      } else {
        toast.error('Failed to load classes')
      }
    } catch (error) {
      console.error('Error loading classes:', error)
      toast.error('Failed to load classes')
    } finally {
      setIsLoading(false)
    }
  }

  const generateQRCode = async (classId: string, duration: number, isRefresh: boolean = false) => {
    if (!classId) {
      toast.error('Please select a class')
      return
    }

    try {
      setIsGenerating(true)
      
      const response = await fetch('/api/attendance/qr-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          duration,
          lecturerId
        })
      })

      if (response.ok) {
        const data = await response.json()
        setQRCodeData(data.qrData)
        
        // Generate QR code image
        await generateQRCodeImage(data.qrData.token, data.qrData.id)
        
        setShowQRCode(true)
        
        if (!isRefresh) {
          toast.success('QR Code generated successfully')
        }
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to generate QR code')
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
      toast.error('Failed to generate QR code')
    } finally {
      setIsGenerating(false)
    }
  }

  const generateQRCodeImage = async (token: string, sessionId: string) => {
    try {
      // QR Code data
      const qrData = JSON.stringify({
        type: 'ATTENDANCE_SESSION',
        sessionId,
        token,
        timestamp: new Date().toISOString()
      })

      // Generate QR code using a library or service
      // For demo purposes, we'll use a simple placeholder
      // In real implementation, use libraries like qrcode.js or API service
      
      const canvas = qrCanvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Set canvas size
      canvas.width = 300
      canvas.height = 300

      // Create a simple pattern (in real app, use proper QR code library)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, 300, 300)
      
      ctx.fillStyle = '#000000'
      
      // Create a grid pattern to simulate QR code
      const cellSize = 10
      const gridSize = 30
      
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          // Simple hash-based pattern generation
          const hash = (i * 31 + j * 17 + token.length) % 3
          if (hash === 0) {
            ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize)
          }
        }
      }

      // Add corner markers
      const markerSize = 7 * cellSize
      
      // Top-left
      ctx.fillRect(0, 0, markerSize, markerSize)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(cellSize, cellSize, markerSize - 2 * cellSize, markerSize - 2 * cellSize)
      ctx.fillStyle = '#000000'
      ctx.fillRect(2 * cellSize, 2 * cellSize, markerSize - 4 * cellSize, markerSize - 4 * cellSize)

      // Top-right
      ctx.fillStyle = '#000000'
      ctx.fillRect(300 - markerSize, 0, markerSize, markerSize)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(300 - markerSize + cellSize, cellSize, markerSize - 2 * cellSize, markerSize - 2 * cellSize)
      ctx.fillStyle = '#000000'
      ctx.fillRect(300 - markerSize + 2 * cellSize, 2 * cellSize, markerSize - 4 * cellSize, markerSize - 4 * cellSize)

      // Bottom-left
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 300 - markerSize, markerSize, markerSize)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(cellSize, 300 - markerSize + cellSize, markerSize - 2 * cellSize, markerSize - 2 * cellSize)
      ctx.fillStyle = '#000000'
      ctx.fillRect(2 * cellSize, 300 - markerSize + 2 * cellSize, markerSize - 4 * cellSize, markerSize - 4 * cellSize)

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png')
      setQRCodeImage(dataUrl)
      
    } catch (error) {
      console.error('Error generating QR code image:', error)
    }
  }

  const downloadQRCode = () => {
    if (!qrCodeImage || !qrCodeData) return

    const selectedClassData = classes.find(c => c.id === selectedClass)
    
    const link = document.createElement('a')
    link.download = `qr-attendance-${selectedClassData?.code}-${DateUtils.formatDate(new Date())}.png`
    link.href = qrCodeImage
    link.click()

    toast.success('QR Code downloaded successfully')
  }

  const copyQRLink = async () => {
    if (!qrCodeData) return

    const link = `${window.location.origin}/attendance/qr/${qrCodeData.id}`
    
    try {
      await navigator.clipboard.writeText(link)
      toast.success('QR Code link copied to clipboard')
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = link
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      toast.success('QR Code link copied to clipboard')
    }
  }

  const printQRCode = () => {
    if (!qrCodeImage || !qrCodeData) return

    const selectedClassData = classes.find(c => c.id === selectedClass)
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${selectedClassData?.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 20px; 
            }
            .qr-container { 
              border: 2px solid #000; 
              padding: 20px; 
              display: inline-block; 
              margin: 20px;
            }
            .qr-image { 
              display: block; 
              margin: 0 auto 20px auto; 
            }
            .info { 
              font-size: 14px; 
              line-height: 1.5; 
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h2>Attendance QR Code</h2>
            <img src="${qrCodeImage}" alt="QR Code" class="qr-image" />
            <div class="info">
              <strong>${selectedClassData?.name}</strong><br>
              Code: ${selectedClassData?.code}<br>
              Location: ${qrCodeData.location}<br>
              Date: ${FormatUtils.formatDate(qrCodeData.sessionDate)}<br>
              Time: ${qrCodeData.sessionTime}<br>
              Expires: ${FormatUtils.formatDateTime(qrCodeData.expiresAt)}<br>
            </div>
          </div>
        </body>
      </html>
    `)
    
    printWindow.document.close()
    printWindow.print()
  }

  const deactivateQRCode = async () => {
    if (!qrCodeData) return

    try {
      const response = await fetch(`/api/attendance/qr-deactivate/${qrCodeData.id}`, {
        method: 'POST'
      })

      if (response.ok) {
        setQRCodeData(null)
        setQRCodeImage('')
        setShowQRCode(false)
        setAutoRefresh(false)
        toast.success('QR Code deactivated')
      } else {
        toast.error('Failed to deactivate QR code')
      }
    } catch (error) {
      console.error('Error deactivating QR code:', error)
      toast.error('Failed to deactivate QR code')
    }
  }

  const selectedClassData = classes.find(c => c.id === selectedClass)

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading classes..." className="py-12" />
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            QR Code Generator
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Generate QR codes for backup attendance check-in
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Generate QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                Select Class
              </label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} ({cls.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                Session Duration (minutes)
              </label>
              <Select value={sessionDuration.toString()} onValueChange={(value) => setSessionDuration(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="180">3 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedClassData && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="font-medium">{selectedClassData.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span>{selectedClassData.location.name}, {selectedClassData.location.building}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>
                    {FormatUtils.formatTime(new Date(`2000-01-01T${selectedClassData.schedule.startTime}`))} - 
                    {FormatUtils.formatTime(new Date(`2000-01-01T${selectedClassData.schedule.endTime}`))}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => generateQRCode(selectedClass, sessionDuration)}
                disabled={!selectedClass || isGenerating}
                variant="chalk"
                className="flex-1"
              >
                {isGenerating ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <QrCode className="w-4 h-4 mr-2" />
                )}
                Generate QR Code
              </Button>
              
              {qrCodeData && (
                <Button
                  onClick={() => setShowQRCode(!showQRCode)}
                  variant="chalkOutline"
                >
                  {showQRCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              )}
            </div>

            {qrCodeData && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded"
                  />
                  <label className="text-sm text-slate-700 dark:text-slate-300">
                    Auto-refresh every 5 minutes
                  </label>
                </div>
                
                <Button
                  onClick={deactivateQRCode}
                  variant="destructive"
                  size="sm"
                  className="w-full"
                >
                  Deactivate QR Code
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Code Display */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Attendance QR Code
              </span>
              {qrCodeData && (
                <span className={cn(
                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                  qrCodeData.isActive 
                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                    : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                )}>
                  {qrCodeData.isActive ? 'Active' : 'Expired'}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!qrCodeData ? (
              <div className="text-center py-12">
                <QrCode className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600 dark:text-slate-400 mb-2">
                  No QR Code Generated
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-500">
                  Select a class and generate a QR code to get started
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* QR Code Info */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Class:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {qrCodeData.className}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Location:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {qrCodeData.location}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Session:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {FormatUtils.formatDateTime(qrCodeData.sessionDate)} at {qrCodeData.sessionTime}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Expires:</span>
                    <span className={cn(
                      "font-medium",
                      new Date(qrCodeData.expiresAt) > new Date()
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    )}>
                      {DateUtils.getRelativeTime(qrCodeData.expiresAt)}
                    </span>
                  </div>
                </div>

                {/* QR Code Image */}
                {showQRCode && qrCodeImage && (
                  <div className="text-center">
                    <div className="inline-block p-4 bg-white rounded-lg border-2 border-slate-200 dark:border-slate-700">
                      <img 
                        src={qrCodeImage} 
                        alt="Attendance QR Code"
                        className="w-64 h-64 mx-auto"
                      />
                    </div>
                    
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      Students can scan this QR code with their mobile devices
                    </p>
                  </div>
                )}

                {/* Hidden Canvas for QR Generation */}
                <canvas ref={qrCanvasRef} className="hidden" />

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={downloadQRCode}
                    variant="chalkOutline"
                    size="sm"
                    disabled={!qrCodeImage}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  
                  <Button
                    onClick={printQRCode}
                    variant="chalkOutline"
                    size="sm"
                    disabled={!qrCodeImage}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                  
                  <Button
                    onClick={copyQRLink}
                    variant="chalkOutline"
                    size="sm"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                  
                  <Button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: 'Attendance QR Code',
                          text: `QR Code for ${qrCodeData.className}`,
                          url: `${window.location.origin}/attendance/qr/${qrCodeData.id}`
                        })
                      } else {
                        copyQRLink()
                      }
                    }}
                    variant="chalkOutline"
                    size="sm"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>

                {/* Refresh Button */}
                <Button
                  onClick={() => generateQRCode(selectedClass, sessionDuration, true)}
                  variant="chalk"
                  size="sm"
                  className="w-full"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Refresh QR Code
                </Button>

                {/* Instructions */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                    How to use:
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Display the QR code on a projector or screen</li>
                    <li>• Students scan with their mobile camera or QR app</li>
                    <li>• QR code automatically expires after session duration</li>
                    <li>• Use as backup when face recognition is unavailable</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Session Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {qrCodeData ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    qrCodeData.isActive 
                      ? "bg-green-100 dark:bg-green-900/20"
                      : "bg-red-100 dark:bg-red-900/20"
                  )}>
                    {qrCodeData.isActive ? (
                      <QrCode className="w-6 h-6 text-green-600 dark:text-green-400" />
                    ) : (
                      <Clock className="w-6 h-6 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                      {qrCodeData.className}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Session ID: {qrCodeData.id.slice(0, 8)}...
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {qrCodeData.isActive 
                        ? `Expires ${DateUtils.getRelativeTime(qrCodeData.expiresAt)}`
                        : 'Session expired'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                    0
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    QR Check-ins
                  </p>
                </div>
              </div>

              {autoRefresh && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">
                      Auto-refresh enabled - QR code will update every 5 minutes
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto text-slate-400 mb-3" />
              <p className="text-slate-600 dark:text-slate-400">
                No active QR code sessions
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}