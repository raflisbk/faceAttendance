export const FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  DOCUMENTS: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
} as const

export const MAX_FILE_SIZE = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
} as const

export interface FileValidationResult {
  isValid: boolean
  error?: string
}

export function validateFile(
  file: File,
  allowedTypes: string[],
  maxSize: number
): FileValidationResult {
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    const acceptedExtensions = allowedTypes
      .map(type => type.split('/')[1].toUpperCase())
      .join(', ')
    return {
      isValid: false,
      error: `Please upload a valid file. Accepted formats: ${acceptedExtensions}`
    }
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / 1024 / 1024).toFixed(1)
    return {
      isValid: false,
      error: `File size must be less than ${maxSizeMB}MB`
    }
  }

  return { isValid: true }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
}

export function createObjectURL(file: File): string {
  return URL.createObjectURL(file)
}

export function revokeObjectURL(url: string): void {
  URL.revokeObjectURL(url)
}

// Document type detection based on OCR results
export function detectDocumentType(ocrText: string): {
  type: 'ktm' | 'ktp' | 'unknown'
  confidence: number
  qualityScore: number
} {
  const text = ocrText.toLowerCase().replace(/\s+/g, ' ')

  // KTM (Student ID) keywords with weights
  const ktmKeywords = [
    { word: 'student', weight: 3 },
    { word: 'university', weight: 3 },
    { word: 'universitas', weight: 3 },
    { word: 'college', weight: 2 },
    { word: 'akademi', weight: 2 },
    { word: 'mahasiswa', weight: 3 },
    { word: 'semester', weight: 2 },
    { word: 'faculty', weight: 2 },
    { word: 'fakultas', weight: 2 },
    { word: 'nim', weight: 4 },
    { word: 'student id', weight: 4 },
    { word: 'kartu tanda mahasiswa', weight: 5 },
    { word: 'ktm', weight: 4 }
  ]

  // KTP (National ID) keywords with weights
  const ktpKeywords = [
    { word: 'identity', weight: 2 },
    { word: 'ktp', weight: 4 },
    { word: 'nik', weight: 4 },
    { word: 'republic', weight: 3 },
    { word: 'indonesia', weight: 3 },
    { word: 'identitas', weight: 2 },
    { word: 'warga negara', weight: 3 },
    { word: 'tempat lahir', weight: 3 },
    { word: 'tanggal lahir', weight: 3 },
    { word: 'alamat', weight: 2 },
    { word: 'agama', weight: 2 },
    { word: 'status perkawinan', weight: 2 },
    { word: 'pekerjaan', weight: 2 }
  ]

  let ktmScore = 0
  let ktpScore = 0

  // Count weighted keyword matches
  ktmKeywords.forEach(({ word, weight }) => {
    if (text.includes(word)) ktmScore += weight
  })

  ktpKeywords.forEach(({ word, weight }) => {
    if (text.includes(word)) ktpScore += weight
  })

  // Calculate quality score based on text length and clarity
  const qualityScore = Math.min(ocrText.length / 100, 1) // 0-1 score based on text length

  // Calculate max possible scores
  const maxKtmScore = ktmKeywords.reduce((sum, k) => sum + k.weight, 0)
  const maxKtpScore = ktpKeywords.reduce((sum, k) => sum + k.weight, 0)

  // Determine type and confidence
  if (ktmScore > ktpScore && ktmScore > 0) {
    return {
      type: 'ktm',
      confidence: Math.min(ktmScore / maxKtmScore, 1),
      qualityScore
    }
  } else if (ktpScore > ktmScore && ktpScore > 0) {
    return {
      type: 'ktp',
      confidence: Math.min(ktpScore / maxKtpScore, 1),
      qualityScore
    }
  }

  return {
    type: 'unknown',
    confidence: 0,
    qualityScore
  }
}

// Extract common information from documents
export function extractDocumentInfo(ocrText: string, documentType: 'ktm' | 'ktp') {
  const lines = ocrText.split('\n').map(line => line.trim()).filter(Boolean)

  if (documentType === 'ktm') {
    // Try to extract student information
    return {
      name: extractName(lines),
      studentId: extractStudentId(lines),
      university: extractUniversity(lines),
    }
  } else if (documentType === 'ktp') {
    // Try to extract ID card information
    return {
      name: extractName(lines),
      nik: extractNIK(lines),
      birthPlace: extractBirthPlace(lines),
      birthDate: extractBirthDate(lines),
    }
  }

  return {}
}

function extractName(lines: string[]): string | null {
  // Look for lines that might contain names
  const namePatterns = [
    /nama\s*:?\s*(.+)/i,
    /name\s*:?\s*(.+)/i,
  ]

  for (const line of lines) {
    for (const pattern of namePatterns) {
      const match = line.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }
  }

  return null
}

function extractStudentId(lines: string[]): string | null {
  const idPatterns = [
    /nim\s*:?\s*([0-9]+)/i,
    /student\s*id\s*:?\s*([0-9]+)/i,
    /no\s*:?\s*([0-9]+)/i,
  ]

  for (const line of lines) {
    for (const pattern of idPatterns) {
      const match = line.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }
  }

  return null
}

function extractUniversity(lines: string[]): string | null {
  const uniPatterns = [
    /universitas\s+(.+)/i,
    /university\s+(.+)/i,
    /institut\s+(.+)/i,
    /politeknik\s+(.+)/i,
  ]

  for (const line of lines) {
    for (const pattern of uniPatterns) {
      const match = line.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }
  }

  return null
}

function extractNIK(lines: string[]): string | null {
  const nikPattern = /nik\s*:?\s*([0-9]{16})/i

  for (const line of lines) {
    const match = line.match(nikPattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  return null
}

function extractBirthPlace(lines: string[]): string | null {
  const birthPlacePatterns = [
    /tempat\s+lahir\s*:?\s*(.+)/i,
    /place\s+of\s+birth\s*:?\s*(.+)/i,
  ]

  for (const line of lines) {
    for (const pattern of birthPlacePatterns) {
      const match = line.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }
  }

  return null
}

function extractBirthDate(lines: string[]): string | null {
  const birthDatePatterns = [
    /tanggal\s+lahir\s*:?\s*(.+)/i,
    /date\s+of\s+birth\s*:?\s*(.+)/i,
    /tgl\s+lahir\s*:?\s*(.+)/i,
  ]

  for (const line of lines) {
    for (const pattern of birthDatePatterns) {
      const match = line.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }
  }

  return null
}