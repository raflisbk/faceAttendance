'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  XMarkIcon,
  EyeIcon,
  ArrowsPointingOutIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface ImagePreviewProps {
  file: File
  onRemove: () => void
  className?: string
  showOCRResult?: boolean
  ocrResult?: string
}

export function ImagePreview({
  file,
  onRemove,
  className,
  showOCRResult = false,
  ocrResult
}: ImagePreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [imageUrl, setImageUrl] = useState<string>('')

  // Create object URL when component mounts
  React.useEffect(() => {
    const url = URL.createObjectURL(file)
    setImageUrl(url)

    // Cleanup
    return () => URL.revokeObjectURL(url)
  }, [file])

  if (isExpanded) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="relative max-w-4xl max-h-full">
          <Button
            onClick={() => setIsExpanded(false)}
            variant="ghost"
            size="sm"
            className="absolute -top-12 right-0 text-white hover:text-gray-300"
          >
            <XMarkIcon className="w-6 h-6" />
          </Button>
          <img
            src={imageUrl}
            alt={file.name}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
          {showOCRResult && ocrResult && (
            <Card className="absolute bottom-4 left-4 right-4 bg-black/70 text-white">
              <CardContent className="p-4">
                <h4 className="text-sm font-medium mb-2">Extracted Text:</h4>
                <p className="text-xs whitespace-pre-wrap">{ocrResult}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="relative aspect-video">
          <img
            src={imageUrl}
            alt={file.name}
            className="w-full h-full object-cover"
          />

          {/* Overlay with actions */}
          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsExpanded(true)}
            >
              <ArrowsPointingOutIcon className="w-4 h-4 mr-1" />
              View
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onRemove}
            >
              <XMarkIcon className="w-4 h-4 mr-1" />
              Remove
            </Button>
          </div>
        </div>

        {/* File info */}
        <div className="p-3 border-t">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      </CardContent>
    </Card>
  )
}