// components/ui/document-upload.tsx
'use client'

import React, { useState, useRef } from 'react'
import { Upload, File, Image, CheckCircle, AlertCircle, X, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { cn } from '@/lib/utils'

interface DocumentFile {
  id: string
  file: File
  preview: string
  type: 'image' | 'pdf'
  uploadProgress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  ocrData?: {
    extractedText: string
    confidence: number
    fields: Record<string, string>
  }
  error?: string
}

interface DocumentUploadProps {
  documentType: 'STUDENT_ID' | 'STAFF_ID' | 'PASSPORT' | 'DRIVING_LICENSE'
  onDocumentProcessed?: (data: { file: File; ocrData: any }) => void
  onDocumentRemoved?: (documentId: string) => void
  allowMultiple?: boolean
  maxFileSize?: number // in MB
  className?: string
}

export function DocumentUpload({
  documentType,
  onDocumentProcessed,
  onDocumentRemoved,
  allowMultiple = false,
  maxFileSize = 10,
  className
}: DocumentUploadProps) {
  const [documents, setDocuments] = useState<DocumentFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'STUDENT_ID': return 'Student ID Card'
      case 'STAFF_ID': return 'Staff ID Card'
      case 'PASSPORT': return 'Passport'
      case 'DRIVING_LICENSE': return 'Driving License'
      default: return 'Document'
    }
  }

  const getAcceptedFormats = () => {
    return 'image/jpeg,image/png,image/webp,application/pdf'
  }

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size must be less than ${maxFileSize}MB`
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return 'Only JPEG, PNG, WebP images and PDF files are allowed'
    }

    return null
  }

  const createPreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type === 'application/pdf') {
        resolve('/api/placeholder/pdf-icon') // PDF icon placeholder
      } else {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.readAsDataURL(file)
      }
    })
  }

  const processDocument = async (document: DocumentFile) => {
    try {
      // Update status to processing
      setDocuments(prev => prev.map(doc => 
        doc.id === document.id 
          ? { ...doc, status: 'processing' }
          : doc
      ))

      // Simulate OCR processing
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Mock OCR results based on document type
      const mockOCRData = {
        extractedText: `Sample extracted text from ${getDocumentTypeLabel(documentType)}`,
        confidence: 0.92,
        fields: documentType === 'STUDENT_ID' ? {
          studentId: '2024001234',
          name: 'John Doe',
          faculty: 'Computer Science',
          validUntil: '2026-12-31'
        } : documentType === 'STAFF_ID' ? {
          staffId: 'STF2024001',
          name: 'Jane Smith',
          department: 'Information Technology',
          position: 'Lecturer'
        } : {
          documentNumber: 'ABC123456',
          name: 'John Doe',
          dateOfBirth: '1990-01-01'
        }
      }

      // Update document with OCR results
      setDocuments(prev => prev.map(doc => 
        doc.id === document.id 
          ? { 
              ...doc, 
              status: 'completed',
              ocrData: mockOCRData,
              uploadProgress: 100
            }
          : doc
      ))

      // Call callback
      onDocumentProcessed?.({
        file: document.file,
        ocrData: mockOCRData
      })

    } catch (error) {
      setDocuments(prev => prev.map(doc => 
        doc.id === document.id 
          ? { 
              ...doc, 
              status: 'error',
              error: 'Failed to process document. Please try again.'
            }
          : doc
      ))
    }
  }

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return

    const fileArray = Array.from(files)
    const validFiles = fileArray.filter(file => {
      const error = validateFile(file)
      if (error) {
        alert(`${file.name}: ${error}`)
        return false
      }
      return true
    })

    if (!allowMultiple && validFiles.length > 1) {
      alert('Please select only one file')
      return
    }

    for (const file of validFiles) {
      const preview = await createPreview(file)
      const documentFile: DocumentFile = {
        id: Date.now().toString() + Math.random().toString(36),
        file,
        preview,
        type: file.type.startsWith('image/') ? 'image' : 'pdf',
        uploadProgress: 0,
        status: 'uploading'
      }

      setDocuments(prev => allowMultiple ? [...prev, documentFile] : [documentFile])

      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setDocuments(prev => prev.map(doc => {
          if (doc.id === documentFile.id && doc.uploadProgress < 100) {
            const newProgress = Math.min(doc.uploadProgress + 10, 100)
            if (newProgress === 100) {
              clearInterval(uploadInterval)
              setTimeout(() => processDocument(doc), 500)
            }
            return { ...doc, uploadProgress: newProgress }
          }
          return doc
        }))
      }, 200)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const removeDocument = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId))
    onDocumentRemoved?.(documentId)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <LoadingSpinner size="sm" />
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
      default:
        return null
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploading': return 'Uploading...'
      case 'processing': return 'Processing with OCR...'
      case 'completed': return 'Processing complete'
      case 'error': return 'Processing failed'
      default: return ''
    }
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload {getDocumentTypeLabel(documentType)}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragOver
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="space-y-4">
            <Upload className="w-12 h-12 mx-auto text-slate-400" />
            
            <div>
              <p className="text-lg font-medium">
                Drop your {getDocumentTypeLabel(documentType).toLowerCase()} here
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                or click to browse files
              </p>
            </div>
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="chalkOutline"
            >
              Choose File
            </Button>
            
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Supports: JPEG, PNG, WebP, PDF • Max size: {maxFileSize}MB
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptedFormats()}
          multiple={allowMultiple}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        {/* Document List */}
        {documents.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium">Uploaded Documents</h3>
            
            {documents.map((document) => (
              <Card key={document.id} className="border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Preview */}
                    <div className="flex-shrink-0">
                      {document.type === 'image' ? (
                        <img
                          src={document.preview}
                          alt="Document preview"
                          className="w-16 h-16 object-cover rounded-lg border"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg border flex items-center justify-center">
                          <File className="w-8 h-8 text-slate-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Document Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium truncate">{document.file.name}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {(document.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {document.status === 'completed' && (
                            <Button variant="chalkOutline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            onClick={() => removeDocument(document.id)}
                            variant="chalkOutline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 dark:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      {document.status === 'uploading' && (
                        <div className="mt-2">
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${document.uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Status */}
                      <div className="flex items-center gap-2 mt-2">
                        {getStatusIcon(document.status)}
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {getStatusText(document.status)}
                        </span>
                      </div>
                      
                      {/* Error Message */}
                      {document.status === 'error' && document.error && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                          {document.error}
                        </p>
                      )}
                      
                      {/* OCR Results Preview */}
                      {document.status === 'completed' && document.ocrData && (
                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                            Extracted Information (Confidence: {(document.ocrData.confidence * 100).toFixed(1)}%)
                          </p>
                          <div className="space-y-1">
                            {Object.entries(document.ocrData.fields).map(([key, value]) => (
                              <div key={key} className="flex text-sm">
                                <span className="font-medium text-green-600 dark:text-green-400 capitalize min-w-0 flex-shrink-0 mr-2">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                                </span>
                                <span className="text-green-700 dark:text-green-300">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Guidelines */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">
            Document Guidelines
          </h4>
          <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
            <li>• Ensure the document is clear and well-lit</li>
            <li>• All text should be readable and not blurred</li>
            <li>• Document should be flat without folds or creases</li>
            <li>• Include all corners of the document in the image</li>
            <li>• Avoid shadows or glare on the document surface</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

// components/ui/document-preview.tsx
'use client'

import React, { useState } from 'react'
import { Eye, Download, RotateCw, ZoomIn, ZoomOut, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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

// components/ui/document-approval.tsx
'use client'

import React, { useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, MessageSquare, Download, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DocumentPreview } from './document-preview'
import { cn } from '@/lib/utils'

interface Document {
  id: string
  userId: string
  userName: string
  userEmail: string
  documentType: 'STUDENT_ID' | 'STAFF_ID' | 'PASSPORT' | 'DRIVING_LICENSE'
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  ocrData?: {
    extractedText: string
    confidence: number
    fields: Record<string, string>
  }
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_REVIEW'
  uploadedAt: Date
  reviewedAt?: Date
  reviewedBy?: string
  reviewNotes?: string
}

interface DocumentApprovalProps {
  documents?: Document[]
  onApprove?: (documentId: string, notes?: string) => Promise<void>
  onReject?: (documentId: string, reason: string) => Promise<void>
  onRequestReview?: (documentId: string, reason: string) => Promise<void>
  className?: string
}

export function DocumentApproval({
  documents = [],
  onApprove,
  onReject,
  onRequestReview,
  className
}: DocumentApprovalProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'review'>('approve')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
      case 'APPROVED': return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
      case 'REJECTED': return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
      case 'NEEDS_REVIEW': return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle className="w-4 h-4" />
      case 'REJECTED': return <XCircle className="w-4 h-4" />
      case 'NEEDS_REVIEW': return <AlertCircle className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'STUDENT_ID': return 'Student ID'
      case 'STAFF_ID': return 'Staff ID'
      case 'PASSPORT': return 'Passport'
      case 'DRIVING_LICENSE': return 'Driving License'
      default: return 'Document'
    }
  }

  const handleSubmitReview = async () => {
    if (!selectedDocument) return

    try {
      switch (reviewAction) {
        case 'approve':
          await onApprove?.(selectedDocument.id, reviewNotes)
          break
        case 'reject':
          await onReject?.(selectedDocument.id, reviewNotes)
          break
        case 'review':
          await onRequestReview?.(selectedDocument.id, reviewNotes)
          break
      }
      
      setSelectedDocument(null)
      setReviewNotes('')
      setReviewAction('approve')
    } catch (error) {
      console.error('Error submitting review:', error)
    }
  }

  const pendingDocuments = documents.filter(doc => doc.status === 'PENDING')
  const reviewedDocuments = documents.filter(doc => doc.status !== 'PENDING')

  return (
    <div className={cn("space-y-6", className)}>
      {/* Pending Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Pending Documents ({pendingDocuments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingDocuments.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No pending documents</p>
              <p className="text-sm">All documents have been reviewed</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pendingDocuments.map((document) => (
                <Card key={document.id} className="border-yellow-200 dark:border-yellow-800">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{document.userName}</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {document.userEmail}
                          </p>
                        </div>
                        <span className={cn("px-2 py-1 text-xs rounded-full", getStatusColor(document.status))}>
                          {getStatusIcon(document.status)}
                          <span className="ml-1">{document.status}</span>
                        </span>
                      </div>
                      
                      <div>
                        <p className="font-medium">{getDocumentTypeLabel(document.documentType)}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {document.fileName} • {(document.fileSize / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Uploaded {new Date(document.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      
                      {document.ocrData && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <p className="text-sm font-medium mb-2">
                            OCR Confidence: {(document.ocrData.confidence * 100).toFixed(1)}%
                          </p>
                          <div className="space-y-1">
                            {Object.entries(document.ocrData.fields).slice(0, 3).map(([key, value]) => (
                              <div key={key} className="flex text-sm">
                                <span className="font-medium capitalize min-w-0 flex-shrink-0 mr-2">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                                </span>
                                <span className="truncate">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setSelectedDocument(document)}
                          variant="chalk"
                          size="sm"
                          className="flex-1"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Review
                        </Button>
                        <Button
                          onClick={() => {
                            const link = document.createElement('a')
                            link.href = document.filePath
                            link.download = document.fileName
                            link.click()
                          }}
                          variant="chalkOutline"
                          size="sm"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      {selectedDocument && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle>Review Document: {selectedDocument.fileName}</CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              User: {selectedDocument.userName} ({selectedDocument.userEmail})
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Document Preview */}
            <DocumentPreview
              documentUrl={selectedDocument.filePath}
              documentName={selectedDocument.fileName}
              documentType={selectedDocument.mimeType.startsWith('image/') ? 'image' : 'pdf'}
              ocrData={selectedDocument.ocrData}
            />
            
            {/* Review Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="reviewAction">Review Decision</Label>
                <Select value={reviewAction} onValueChange={(value: any) => setReviewAction(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approve">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Approve Document
                      </div>
                    </SelectItem>
                    <SelectItem value="reject">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        Reject Document
                      </div>
                    </SelectItem>
                    <SelectItem value="review">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-600" />
                        Request More Information
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="reviewNotes">
                  {reviewAction === 'approve' ? 'Approval Notes (Optional)' : 
                   reviewAction === 'reject' ? 'Rejection Reason (Required)' : 
                   'Additional Information Required'}
                </Label>
                <Textarea
                  id="reviewNotes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={
                    reviewAction === 'approve' ? 'Add any notes about this approval...' :
                    reviewAction === 'reject' ? 'Please explain why this document is being rejected...' :
                    'Specify what additional information is needed...'
                  }
                  required={reviewAction !== 'approve'}
                  rows={4}
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmitReview}
                  variant="chalk"
                  disabled={reviewAction !== 'approve' && !reviewNotes.trim()}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Submit Review
                </Button>
                <Button
                  onClick={() => {
                    setSelectedDocument(null)
                    setReviewNotes('')
                    setReviewAction('approve')
                  }}
                  variant="chalkOutline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviewed Documents History */}
      {reviewedDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Reviewed Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reviewedDocuments.slice(0, 10).map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{document.userName}</span>
                      <span className={cn("px-2 py-1 text-xs rounded-full", getStatusColor(document.status))}>
                        {getStatusIcon(document.status)}
                        <span className="ml-1">{document.status}</span>
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {getDocumentTypeLabel(document.documentType)} • {document.fileName}
                    </p>
                    {document.reviewedAt && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Reviewed {new Date(document.reviewedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    onClick={() => setSelectedDocument(document)}
                    variant="chalkOutline"
                    size="sm"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// components/ui/textarea.tsx
'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }