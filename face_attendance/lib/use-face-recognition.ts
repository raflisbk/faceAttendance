'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface FaceRecognitionHook {
  isLoaded: boolean
  isLoading: boolean
  error: string | null
  initializeFaceAPI: () => Promise<void>
  detectFace: (videoElement: HTMLVideoElement) => Promise<any>
  compareFaces: (descriptor1: Float32Array, descriptor2: Float32Array) => Promise<number>
  cleanup: () => void
}

// Performance optimization: Cache face-api instance
let globalFaceAPI: any = null
let initializationPromise: Promise<void> | null = null

export function useFaceRecognition(): FaceRecognitionHook {
  const [isLoaded, setIsLoaded] = useState(globalFaceAPI !== null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const initializeFaceAPI = useCallback(async () => {
    if (typeof window === 'undefined') {
      setError('Face recognition only available in browser')
      return
    }

    // Return existing promise if already initializing
    if (initializationPromise) {
      return initializationPromise
    }

    // Return if already loaded
    if (globalFaceAPI && isLoaded) return

    try {
      setIsLoading(true)
      setError(null)

      // Create initialization promise
      initializationPromise = (async () => {
        // Dynamic import for face-api with retry logic
        const api = await import('@vladmandic/face-api')
        globalFaceAPI = api

        // Load models with optimized settings
        const modelPath = '/models'
        const loadPromises = [
          api.nets.tinyFaceDetector.loadFromUri(modelPath),
          api.nets.faceLandmark68Net.loadFromUri(modelPath),
          api.nets.faceRecognitionNet.loadFromUri(modelPath)
        ]

        // Load essential models first
        await Promise.all(loadPromises)

        // Warm up the detection pipeline
        if (typeof window !== 'undefined') {
          const canvas = document.createElement('canvas')
          canvas.width = 160
          canvas.height = 120
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.fillStyle = '#000'
            ctx.fillRect(0, 0, 160, 120)

            // Warm up detection
            try {
              await api.detectAllFaces(canvas, new api.TinyFaceDetectorOptions({
                inputSize: 160,
                scoreThreshold: 0.5
              }))
            } catch (e) {
              // Ignore warm-up errors
            }
          }
        }
      })()

      await initializationPromise
      setIsLoaded(true)
      console.log('Face-API models loaded and warmed up successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load face recognition'
      setError(errorMessage)
      console.error('Face-API initialization error:', err)
      initializationPromise = null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const detectFace = useCallback(async (videoElement: HTMLVideoElement) => {
    if (!globalFaceAPI || !isLoaded) {
      throw new Error('Face API not initialized')
    }

    try {
      // Optimized detection with smaller input size for speed
      const detections = await globalFaceAPI
        .detectAllFaces(videoElement, new globalFaceAPI.TinyFaceDetectorOptions({
          inputSize: 160, // Smaller size for speed
          scoreThreshold: 0.5
        }))
        .withFaceLandmarks()
        .withFaceDescriptors()

      return detections.length > 0 ? detections[0] : null
    } catch (err) {
      console.error('Face detection error:', err)
      throw err
    }
  }, [isLoaded])

  const compareFaces = useCallback(async (descriptor1: Float32Array, descriptor2: Float32Array) => {
    if (!globalFaceAPI || !isLoaded) {
      throw new Error('Face API not initialized')
    }

    try {
      const distance = globalFaceAPI.euclideanDistance(descriptor1, descriptor2)
      return Math.max(0, 1 - distance) // Convert distance to similarity
    } catch (err) {
      console.error('Face comparison error:', err)
      throw err
    }
  }, [isLoaded])

  const cleanup = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    isLoaded,
    isLoading,
    error,
    initializeFaceAPI,
    detectFace,
    compareFaces,
    cleanup
  }
}