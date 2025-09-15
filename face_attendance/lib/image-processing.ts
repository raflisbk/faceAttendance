/**
 * Image Processing and Optimization Utilities
 * Handles image manipulation, compression, and optimization for face recognition
 */

import { FILE_UPLOAD } from '@/lib/constants';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  maintainAspectRatio?: boolean;
}

export interface CropOptions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageAnalysisResult {
  dimensions: ImageDimensions;
  fileSize: number;
  format: string;
  hasTransparency: boolean;
  averageBrightness: number;
  contrast: number;
  isBlurry: boolean;
  quality: 'high' | 'medium' | 'low';
}

/**
 * Main Image Processing Class
 */
export class ImageProcessor {
  /**
   * Load image from file or URL
   */
  static async loadImage(source: File | string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      
      if (typeof source === 'string') {
        img.src = source;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(source);
      }
    });
  }

  /**
   * Resize image while maintaining aspect ratio
   */
  static async resizeImage(
    image: HTMLImageElement | File,
    options: ImageProcessingOptions = {}
  ): Promise<Blob> {
    const {
      maxWidth = FILE_UPLOAD.MAX_IMAGE_WIDTH,
      maxHeight = FILE_UPLOAD.MAX_IMAGE_HEIGHT,
      quality = FILE_UPLOAD.IMAGE_QUALITY,
      format = 'jpeg',
      maintainAspectRatio = true
    } = options;

    const img = image instanceof HTMLImageElement ? image : await this.loadImage(image);
    
    // Calculate new dimensions
    const dimensions = this.calculateDimensions(
      { width: img.width, height: img.height },
      { maxWidth, maxHeight },
      maintainAspectRatio
    );

    // Create canvas and resize
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob!),
        `image/${format}` as 'image/jpeg' | 'image/png' | 'image/webp',
        quality
      );
    });
  }

  /**
   * Compress image to target file size
   */
  static async compressToSize(
    image: HTMLImageElement | File,
    targetSizeKB: number,
    format: 'jpeg' | 'webp' = 'jpeg'
  ): Promise<Blob> {
    const img = image instanceof HTMLImageElement ? image : await this.loadImage(image);
    
    let quality = 0.9;
    let compressed: Blob;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    do {
      compressed = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (blob) => resolve(blob!),
          `image/${format}` as 'image/jpeg' | 'image/webp',
          quality
        );
      });
      
      if (compressed.size / 1024 <= targetSizeKB) {
        break;
      }
      
      quality -= 0.1;
    } while (quality > 0.1);

    return compressed;
  }

  /**
   * Crop image to specified dimensions
   */
  static async cropImage(
    image: HTMLImageElement | File,
    cropOptions: CropOptions,
    outputOptions: ImageProcessingOptions = {}
  ): Promise<Blob> {
    const img = image instanceof HTMLImageElement ? image : await this.loadImage(image);
    const { quality = 0.9, format = 'jpeg' } = outputOptions;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = cropOptions.width;
    canvas.height = cropOptions.height;

    ctx.drawImage(
      img,
      cropOptions.x,
      cropOptions.y,
      cropOptions.width,
      cropOptions.height,
      0,
      0,
      cropOptions.width,
      cropOptions.height
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob!),
        `image/${format}` as 'image/jpeg' | 'image/png' | 'image/webp',
        quality
      );
    });
  }

  /**
   * Apply filters to enhance image for face recognition
   */
  static async enhanceForFaceRecognition(
    image: HTMLImageElement | File
  ): Promise<Blob> {
    const img = image instanceof HTMLImageElement ? image : await this.loadImage(image);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Apply histogram equalization for better contrast
    this.applyHistogramEqualization(data);
    
    // Apply noise reduction
    this.applyNoiseReduction(imageData);
    
    // Apply sharpening filter
    this.applySharpeningFilter(imageData);

    ctx.putImageData(imageData, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.95);
    });
  }

  /**
   * Convert image to grayscale
   */
  static async convertToGrayscale(image: HTMLImageElement | File): Promise<Blob> {
    const img = image instanceof HTMLImageElement ? image : await this.loadImage(image);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] || 0;
      const g = data[i + 1] || 0;
      const b = data[i + 2] || 0;
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      data[i] = gray;     // R
      data[i + 1] = gray; // G
      data[i + 2] = gray; // B
    }

    ctx.putImageData(imageData, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9);
    });
  }

  /**
   * Analyze image quality metrics
   */
  static async analyzeImage(image: HTMLImageElement | File): Promise<ImageAnalysisResult> {
    const img = image instanceof HTMLImageElement ? image : await this.loadImage(image);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Calculate metrics
    const dimensions = { width: img.width, height: img.height };
    const fileSize = image instanceof File ? image.size : 0;
    const format = this.detectImageFormat(image);
    const hasTransparency = this.hasTransparency(data);
    const averageBrightness = this.calculateAverageBrightness(data);
    const contrast = this.calculateContrast(data);
    const isBlurry = this.detectBlur(imageData);
    
    let quality: 'high' | 'medium' | 'low' = 'high';
    if (isBlurry || contrast < 30 || averageBrightness < 50 || averageBrightness > 200) {
      quality = 'low';
    } else if (contrast < 60 || averageBrightness < 80 || averageBrightness > 180) {
      quality = 'medium';
    }

    return {
      dimensions,
      fileSize,
      format,
      hasTransparency,
      averageBrightness,
      contrast,
      isBlurry,
      quality
    };
  }

  /**
   * Calculate optimal dimensions for resize
   */
  private static calculateDimensions(
    original: ImageDimensions,
    constraints: { maxWidth: number; maxHeight: number },
    maintainAspectRatio: boolean
  ): ImageDimensions {
    if (!maintainAspectRatio) {
      return {
        width: Math.min(original.width, constraints.maxWidth),
        height: Math.min(original.height, constraints.maxHeight)
      };
    }

    const aspectRatio = original.width / original.height;
    let { width, height } = original;

    if (width > constraints.maxWidth) {
      width = constraints.maxWidth;
      height = width / aspectRatio;
    }

    if (height > constraints.maxHeight) {
      height = constraints.maxHeight;
      width = height * aspectRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  /**
   * Apply histogram equalization
   */
  private static applyHistogramEqualization(data: Uint8ClampedArray): void {
    const histogram = new Array(256).fill(0);
    const cdf = new Array(256).fill(0);

    // Calculate histogram
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] || 0;
      const g = data[i + 1] || 0;
      const b = data[i + 2] || 0;
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      histogram[gray]++;
    }

    // Calculate CDF
    cdf[0] = histogram[0];
    for (let i = 1; i < 256; i++) {
      cdf[i] = cdf[i - 1] + histogram[i];
    }

    // Normalize CDF
    const totalPixels = data.length / 4;
    const cdfMin = cdf.find(val => val > 0) || 0;

    for (let i = 0; i < cdf.length; i++) {
      cdf[i] = Math.round(((cdf[i] - cdfMin) / (totalPixels - cdfMin)) * 255);
    }

    // Apply equalization
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] || 0;
      const g = data[i + 1] || 0;
      const b = data[i + 2] || 0;
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      const equalizedGray = cdf[gray] || 0;

      // Maintain color ratios
      const ratio = equalizedGray / (gray || 1);
      data[i] = Math.min(255, r * ratio);
      data[i + 1] = Math.min(255, g * ratio);
      data[i + 2] = Math.min(255, b * ratio);
    }
  }

  /**
   * Apply noise reduction filter
   */
  private static applyNoiseReduction(imageData: ImageData): void {
    const { data, width, height } = imageData;
    const newData = new Uint8ClampedArray(data);

    // Simple 3x3 Gaussian blur kernel
    const kernel = [
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1]
    ];
    const kernelWeight = 16;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let r = 0, g = 0, b = 0;

        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const pixelY = y + ky - 1;
            const pixelX = x + kx - 1;
            const pixelIndex = (pixelY * width + pixelX) * 4;

            r += (data[pixelIndex] || 0) * (kernel[ky]?.[kx] || 0);
            g += (data[pixelIndex + 1] || 0) * (kernel[ky]?.[kx] || 0);
            b += (data[pixelIndex + 2] || 0) * (kernel[ky]?.[kx] || 0);
          }
        }

        const index = (y * width + x) * 4;
        newData[index] = r / kernelWeight;
        newData[index + 1] = g / kernelWeight;
        newData[index + 2] = b / kernelWeight;
      }
    }

    data.set(newData);
  }

  /**
   * Apply sharpening filter
   */
  private static applySharpeningFilter(imageData: ImageData): void {
    const { data, width, height } = imageData;
    const newData = new Uint8ClampedArray(data);

    // Sharpening kernel
    const kernel = [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0]
    ];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let r = 0, g = 0, b = 0;

        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const pixelY = y + ky - 1;
            const pixelX = x + kx - 1;
            const pixelIndex = (pixelY * width + pixelX) * 4;

            r += (data[pixelIndex] || 0) * (kernel[ky]?.[kx] || 0);
            g += (data[pixelIndex + 1] || 0) * (kernel[ky]?.[kx] || 0);
            b += (data[pixelIndex + 2] || 0) * (kernel[ky]?.[kx] || 0);
          }
        }

        const index = (y * width + x) * 4;
        newData[index] = Math.max(0, Math.min(255, r));
        newData[index + 1] = Math.max(0, Math.min(255, g));
        newData[index + 2] = Math.max(0, Math.min(255, b));
      }
    }

    data.set(newData);
  }

  /**
   * Detect image format
   */
  private static detectImageFormat(image: HTMLImageElement | File): string {
    if (image instanceof File) {
      const format = image.type.split('/')[1];
      return format || 'unknown';
    }

    // For HTMLImageElement, try to detect from src or assume jpeg
    const src = image.src.toLowerCase();
    if (src.includes('.png') || src.includes('data:image/png')) return 'png';
    if (src.includes('.webp') || src.includes('data:image/webp')) return 'webp';
    if (src.includes('.gif') || src.includes('data:image/gif')) return 'gif';
    return 'jpeg';
  }

  /**
   * Check if image has transparency
   */
  private static hasTransparency(data: Uint8ClampedArray): boolean {
    for (let i = 3; i < data.length; i += 4) {
      if ((data[i] || 255) < 255) return true;
    }
    return false;
  }

  /**
   * Calculate average brightness
   */
  private static calculateAverageBrightness(data: Uint8ClampedArray): number {
    let totalBrightness = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] || 0;
      const g = data[i + 1] || 0;
      const b = data[i + 2] || 0;
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      totalBrightness += brightness;
    }

    return totalBrightness / pixelCount;
  }

  /**
   * Calculate contrast using standard deviation
   */
  private static calculateContrast(data: Uint8ClampedArray): number {
    const brightness = this.calculateAverageBrightness(data);
    let variance = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] || 0;
      const g = data[i + 1] || 0;
      const b = data[i + 2] || 0;
      const pixelBrightness = 0.299 * r + 0.587 * g + 0.114 * b;
      variance += Math.pow(pixelBrightness - brightness, 2);
    }

    return Math.sqrt(variance / pixelCount);
  }

  /**
   * Detect blur using Laplacian variance
   */
  private static detectBlur(imageData: ImageData): boolean {
    const { data, width, height } = imageData;
    const threshold = 100; // Blur threshold

    // Convert to grayscale first
    const grayData = new Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] || 0;
      const g = data[i + 1] || 0;
      const b = data[i + 2] || 0;
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      grayData[i / 4] = gray;
    }

    // Apply Laplacian kernel
    const kernel = [
      [0, 1, 0],
      [1, -4, 1],
      [0, 1, 0]
    ];

    let variance = 0;
    let mean = 0;
    let count = 0;
    const responses = [];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let response = 0;

        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const pixelY = y + ky - 1;
            const pixelX = x + kx - 1;
            const pixelIndex = pixelY * width + pixelX;

            response += (grayData[pixelIndex] || 0) * (kernel[ky]?.[kx] || 0);
          }
        }

        const absResponse = Math.abs(response);
        responses.push(absResponse);
        mean += absResponse;
        count++;
      }
    }

    mean /= count;

    for (const response of responses) {
      variance += Math.pow(response - mean, 2);
    }

    variance /= count;

    return variance < threshold;
  }
}

/**
 * Face Detection Region Utilities
 */
export class FaceRegionProcessor {
  /**
   * Extract face region from image based on detection box
   */
  static async extractFaceRegion(
    image: HTMLImageElement | File,
    faceBox: { x: number; y: number; width: number; height: number },
    padding: number = 0.2
  ): Promise<Blob> {
    const img = image instanceof HTMLImageElement ? image : await ImageProcessor.loadImage(image);

    // Add padding around face
    const paddedWidth = faceBox.width * (1 + padding * 2);
    const paddedHeight = faceBox.height * (1 + padding * 2);
    const paddedX = Math.max(0, faceBox.x - (paddedWidth - faceBox.width) / 2);
    const paddedY = Math.max(0, faceBox.y - (paddedHeight - faceBox.height) / 2);

    // Ensure we don't exceed image boundaries
    const finalWidth = Math.min(paddedWidth, img.width - paddedX);
    const finalHeight = Math.min(paddedHeight, img.height - paddedY);

    return ImageProcessor.cropImage(img, {
      x: paddedX,
      y: paddedY,
      width: finalWidth,
      height: finalHeight
    });
  }

  /**
   * Normalize face region for consistent recognition
   */
  static async normalizeFaceRegion(
    image: HTMLImageElement | File,
    targetSize: number = 160
  ): Promise<Blob> {
    const img = image instanceof HTMLImageElement ? image : await ImageProcessor.loadImage(image);

    // Resize to square aspect ratio
    const size = Math.min(img.width, img.height);
    const x = (img.width - size) / 2;
    const y = (img.height - size) / 2;

    // First crop to square
    const croppedBlob = await ImageProcessor.cropImage(img, {
      x, y, width: size, height: size
    });

    // Then resize to target size
    const croppedUrl = URL.createObjectURL(croppedBlob);
    const croppedImg = await ImageProcessor.loadImage(croppedUrl);
    const result = await ImageProcessor.resizeImage(croppedImg, {
      maxWidth: targetSize,
      maxHeight: targetSize,
      quality: 0.95,
      format: 'jpeg'
    });
    URL.revokeObjectURL(croppedUrl);
    return result;
  }

  /**
   * Create face thumbnail for UI display
   */
  static async createFaceThumbnail(
    image: HTMLImageElement | File,
    size: number = 100
  ): Promise<string> {
    const thumbnailBlob = await this.normalizeFaceRegion(image, size);
    return URL.createObjectURL(thumbnailBlob);
  }
}

/**
 * Image Format Conversion Utilities
 */
export class FormatConverter {
  /**
   * Convert image to different format
   */
  static async convertFormat(
    image: HTMLImageElement | File,
    targetFormat: 'jpeg' | 'png' | 'webp',
    quality: number = 0.9
  ): Promise<Blob> {
    const img = image instanceof HTMLImageElement ? image : await ImageProcessor.loadImage(image);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = img.width;
    canvas.height = img.height;

    // Handle transparency for JPEG
    if (targetFormat === 'jpeg') {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob!),
        `image/${targetFormat}` as 'image/jpeg' | 'image/png' | 'image/webp',
        quality
      );
    });
  }

  /**
   * Convert to base64 data URL
   */
  static async toBase64(
    image: HTMLImageElement | File,
    format: 'jpeg' | 'png' | 'webp' = 'jpeg',
    quality: number = 0.9
  ): Promise<string> {
    const img = image instanceof HTMLImageElement ? image : await ImageProcessor.loadImage(image);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    return canvas.toDataURL(`image/${format}` as 'image/jpeg' | 'image/png' | 'image/webp', quality);
  }

  /**
   * Convert blob to File
   */
  static blobToFile(blob: Blob, filename: string): File {
    return new File([blob], filename, { type: blob.type });
  }
}

/**
 * Image Validation Utilities
 */
export class ImageValidator {
  /**
   * Validate image file
   */
  static validateFile(
    file: File,
    options: {
      maxSize?: number;
      allowedTypes?: string[];
      minDimensions?: ImageDimensions;
      maxDimensions?: ImageDimensions;
    } = {}
  ): { isValid: boolean; errors: string[] } {
    const {
      maxSize = FILE_UPLOAD.MAX_FILE_SIZE,
      allowedTypes = FILE_UPLOAD.ALLOWED_IMAGE_TYPES
    } = options;

    const errors: string[] = [];

    // File size validation
    if (file.size > maxSize) {
      errors.push(`File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`);
    }

    // File type validation
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate image dimensions
   */
  static async validateDimensions(
    image: HTMLImageElement | File,
    minDimensions?: ImageDimensions,
    maxDimensions?: ImageDimensions
  ): Promise<{ isValid: boolean; errors: string[]; dimensions: ImageDimensions }> {
    const img = image instanceof HTMLImageElement ? image : await ImageProcessor.loadImage(image);
    const dimensions = { width: img.width, height: img.height };
    const errors: string[] = [];

    if (minDimensions) {
      if (dimensions.width < minDimensions.width) {
        errors.push(`Image width must be at least ${minDimensions.width}px`);
      }
      if (dimensions.height < minDimensions.height) {
        errors.push(`Image height must be at least ${minDimensions.height}px`);
      }
    }

    if (maxDimensions) {
      if (dimensions.width > maxDimensions.width) {
        errors.push(`Image width must be at most ${maxDimensions.width}px`);
      }
      if (dimensions.height > maxDimensions.height) {
        errors.push(`Image height must be at most ${maxDimensions.height}px`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      dimensions
    };
  }

  /**
   * Validate image for face recognition
   */
  static async validateForFaceRecognition(
    image: HTMLImageElement | File
  ): Promise<{ isValid: boolean; errors: string[]; analysis: ImageAnalysisResult }> {
    const analysis = await ImageProcessor.analyzeImage(image);
    const errors: string[] = [];

    // Check minimum dimensions
    if (analysis.dimensions.width < 160 || analysis.dimensions.height < 160) {
      errors.push('Image is too small for reliable face recognition (minimum 160x160)');
    }

    // Check image quality
    if (analysis.isBlurry) {
      errors.push('Image is too blurry');
    }

    if (analysis.quality === 'low') {
      errors.push('Image quality is too low');
    }

    // Check brightness
    if (analysis.averageBrightness < 50) {
      errors.push('Image is too dark');
    } else if (analysis.averageBrightness > 200) {
      errors.push('Image is too bright');
    }

    // Check contrast
    if (analysis.contrast < 30) {
      errors.push('Image contrast is too low');
    }

    return {
      isValid: errors.length === 0,
      errors,
      analysis
    };
  }
}

/**
 * Batch Image Processing
 */
export class BatchImageProcessor {
  /**
   * Process multiple images concurrently
   */
  static async processImages(
    images: File[],
    processor: (image: File) => Promise<Blob>,
    maxConcurrent: number = 3
  ): Promise<Blob[]> {
    const results: Blob[] = [];
    const processing: Promise<void>[] = [];

    for (let i = 0; i < images.length; i += maxConcurrent) {
      const batch = images.slice(i, i + maxConcurrent);
      
      const batchPromise = Promise.all(
        batch.map(async (image, index) => {
          const processed = await processor(image);
          results[i + index] = processed;
        })
      ).then(() => {});

      processing.push(batchPromise);
    }

    await Promise.all(processing);
    return results;
  }

  /**
   * Create image variations for training
   */
  static async createImageVariations(
    image: File,
    count: number = 5
  ): Promise<Blob[]> {
    const img = await ImageProcessor.loadImage(image);
    const variations: Promise<Blob>[] = [];

    for (let i = 0; i < count; i++) {
      const variation = this.createVariation(img, i);
      variations.push(variation);
    }

    return Promise.all(variations);
  }

  /**
   * Create a single image variation
   */
  private static async createVariation(
    img: HTMLImageElement,
    variationIndex: number
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = img.width;
    canvas.height = img.height;

    // Apply different transformations based on variation index
    switch (variationIndex % 5) {
      case 0:
        // Original
        ctx.drawImage(img, 0, 0);
        break;
      case 1:
        // Slightly brighter
        ctx.filter = 'brightness(1.1)';
        ctx.drawImage(img, 0, 0);
        break;
      case 2:
        // Slightly darker
        ctx.filter = 'brightness(0.9)';
        ctx.drawImage(img, 0, 0);
        break;
      case 3:
        // Higher contrast
        ctx.filter = 'contrast(1.1)';
        ctx.drawImage(img, 0, 0);
        break;
      case 4:
        // Slight horizontal flip simulation (not actual flip)
        ctx.filter = 'hue-rotate(5deg)';
        ctx.drawImage(img, 0, 0);
        break;
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9);
    });
  }
}

/**
 * Utility Functions
 */

/**
 * Create image preview URL
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(file);
  });
}

/**
 * Download image as file
 */
export function downloadImage(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get image file info
 */
export async function getImageInfo(file: File): Promise<{
  name: string;
  size: number;
  type: string;
  dimensions: ImageDimensions;
  lastModified: Date;
}> {
  const img = await ImageProcessor.loadImage(file);
  
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    dimensions: { width: img.width, height: img.height },
    lastModified: new Date(file.lastModified)
  };
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

