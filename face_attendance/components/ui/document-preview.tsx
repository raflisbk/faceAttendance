// components/ui/document-preview.tsx
'use client'

import React, { useState } from 'react'
import { Eye, Download, RotateCw, ZoomIn, ZoomOut, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface DocumentPreviewProps {
  documentUrl: string
  documentName: string
  documentType: 'image' | 'pdf'
  ocrData?: {
    extractedText: string
    confidence: number
    fields: Record<string, string>
  }
  onClose?: () => void
  className?: string
}

export function DocumentPreview({
  documentUrl,
  documentName,
  documentType,
  ocrData,
  onClose,
  className
}: DocumentPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = documentUrl
    link.download = documentName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50))
  const handleRotate = () => setRotation(prev => (prev + 90) % 360)

  const PreviewContent = ({ isInDialog = false }) => (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={handleZoomOut} variant="chalkOutline" size="sm">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-mono min-w-0 px-2">{zoom}%</span>
          <Button onClick={handleZoomIn} variant="chalkOutline" size="sm">
            <ZoomIn className="w-4 h-4" />
          </Button>

          {documentType === 'image' && (
            <Button onClick={handleRotate} variant="chalkOutline" size="sm">
              <RotateCw className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleDownload} variant="chalkOutline" size="sm">
            <Download className="w-4 h-4" />
          </Button>

          {!isInDialog && (
            <Button onClick={() => setIsFullscreen(true)} variant="chalkOutline" size="sm">
              <Eye className="w-4 h-4" />
            </Button>
          )}

          {onClose && (
            <Button onClick={onClose} variant="chalkOutline" size="sm">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
        <div className="overflow-auto max-h-96" style={{ maxHeight: isInDialog ? '70vh' : '400px' }}>
          {documentType === 'image' ? (
            <img
              src={documentUrl}
              alt={documentName}
              className="max-w-full h-auto"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'center',
                transition: 'transform 0.2s ease'
              }}
            />
          ) : (
            <iframe
              src={documentUrl}
              className="w-full"
              style={{
                height: isInDialog ? '70vh' : '400px',
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left'
              }}
              title={documentName}
            />
          )}
        </div>
      </div>

      {/* OCR Data */}
      {ocrData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Extracted Information</CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Confidence: {(ocrData.confidence * 100).toFixed(1)}%
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(ocrData.fields).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <Label className="text-sm font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </Label>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {ocrData.extractedText && (
              <div className="mt-4">
                <Label className="text-sm font-medium">Full Extracted Text</Label>
                <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
                  <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                    {ocrData.extractedText}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )

  return (
    <>
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Document Preview: {documentName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PreviewContent />
        </CardContent>
      </Card>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{documentName}</DialogTitle>
          </DialogHeader>
          <PreviewContent isInDialog />
        </DialogContent>
      </Dialog>
    </>
  )
}