'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { FileText, Eye, Download, Copy, CheckCircle, AlertCircle } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface OCRResult {
  text: string
  confidence: number
  blocks: Array<{
    text: string
    bbox: [number, number, number, number]
    confidence: number
  }>
  language?: string
  processingTime?: number
}

interface OCRProcessorProps {
  imageUrl?: string
  imageFile?: File
  onProcessingComplete?: (result: OCRResult) => void
  className?: string
}

export default function OCRProcessor({
  imageUrl,
  imageFile,
  onProcessingComplete,
  className
}: OCRProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<OCRResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showBlocks, setShowBlocks] = useState(false)

  const processOCR = useCallback(async () => {
    if (!imageUrl && !imageFile) {
      setError('No image provided for OCR processing')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setError(null)
    setResult(null)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      let requestData: any = {}

      if (imageFile) {
        const formData = new FormData()
        formData.append('image', imageFile)

        const response = await fetch('/api/ocr/process', {
          method: 'POST',
          body: formData
        })
        requestData = await response.json()
      } else if (imageUrl) {
        const response = await fetch('/api/ocr/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageUrl })
        })
        requestData = await response.json()
      }

      clearInterval(progressInterval)
      setProgress(100)

      if (requestData.success) {
        setResult(requestData.data)
        onProcessingComplete?.(requestData.data)
      } else {
        setError(requestData.message || 'OCR processing failed')
      }

    } catch (err) {
      console.error('OCR processing error:', err)
      setError('Failed to process image. Please try again.')
    } finally {
      setIsProcessing(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }, [imageUrl, imageFile, onProcessingComplete])

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You could show a toast notification here
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }, [])

  const downloadText = useCallback(() => {
    if (!result) return

    const blob = new Blob([result.text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ocr-result-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [result])

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500'
    if (confidence >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High'
    if (confidence >= 0.6) return 'Medium'
    return 'Low'
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          OCR Text Extraction
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {(imageUrl || imageFile) && !result && !isProcessing && (
          <div className="space-y-4">
            {imageUrl && (
              <div className="space-y-2">
                <h4 className="font-medium">Image Preview:</h4>
                <img
                  src={imageUrl}
                  alt="Image to process"
                  className="max-w-full h-auto max-h-64 rounded-lg border"
                />
              </div>
            )}

            {imageFile && (
              <div className="space-y-2">
                <h4 className="font-medium">Selected File:</h4>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{imageFile.name}</span>
                  <Badge variant="secondary">
                    {(imageFile.size / 1024 / 1024).toFixed(2)} MB
                  </Badge>
                </div>
              </div>
            )}

            <Button onClick={processOCR} className="w-full">
              Start OCR Processing
            </Button>
          </div>
        )}

        {isProcessing && (
          <div className="space-y-4">
            <div className="text-center">
              <LoadingSpinner className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Processing image...</p>
            </div>
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-center text-muted-foreground">
              {progress}% complete
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <Alert className="border-green-500">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                OCR processing completed successfully!
                {result.processingTime && (
                  <span className="block mt-1">
                    Processing time: {result.processingTime.toFixed(2)}ms
                  </span>
                )}
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Overall Confidence</h4>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getConfidenceColor(result.confidence)}`}></div>
                  <span className="text-sm">
                    {getConfidenceLabel(result.confidence)} ({(result.confidence * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>

              {result.language && (
                <div className="space-y-2">
                  <h4 className="font-medium">Detected Language</h4>
                  <Badge variant="outline">{result.language}</Badge>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-medium">Text Blocks</h4>
                <span className="text-sm text-muted-foreground">
                  {result.blocks.length} blocks found
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Extracted Text</h4>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowBlocks(!showBlocks)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {showBlocks ? 'Hide' : 'Show'} Blocks
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(result.text)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={downloadText}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {result.text}
                </pre>
              </div>

              {showBlocks && (
                <div className="space-y-3">
                  <h5 className="font-medium">Text Blocks</h5>
                  {result.blocks.map((block, index) => (
                    <div key={index} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Block {index + 1}</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getConfidenceColor(block.confidence)}`}></div>
                          <span className="text-xs text-muted-foreground">
                            {(block.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-sm">{block.text}</p>
                      <div className="text-xs text-muted-foreground">
                        Position: [{block.bbox.join(', ')}]
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={() => {
                setResult(null)
                setError(null)
              }}
              variant="outline"
              className="w-full"
            >
              Process Another Image
            </Button>
          </div>
        )}

        {!imageUrl && !imageFile && !result && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No image provided for OCR processing</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}