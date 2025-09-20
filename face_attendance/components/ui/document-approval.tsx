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
                            const link = window.document.createElement('a')
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