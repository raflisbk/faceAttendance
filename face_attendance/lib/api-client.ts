/**
 * API Client and HTTP Utilities
 * Centralized API communication with error handling, retries, and type safety
 */

import { ERROR_CODES } from './constants';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  meta?: Record<string, any>;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

// Request Configuration
export interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  skipAuth?: boolean;
}

/**
 * HTTP Client Class
 */
export class HttpClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private retries: number;

  constructor(config: {
    baseURL?: string;
    timeout?: number;
    retries?: number;
    defaultHeaders?: Record<string, string>;
  } = {}) {
    this.baseURL = config.baseURL || '/api';
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 3;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...config.defaultHeaders,
    };
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Remove authentication token
   */
  removeAuthToken(): void {
    delete this.defaultHeaders['Authorization'];
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const {
      timeout = this.timeout,
      retries = this.retries,
      retryDelay = 1000,
      skipAuth = false,
      ...fetchConfig
    } = config;

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...(fetchConfig.headers as Record<string, string> || {}),
    };

    if (skipAuth) {
      delete headers['Authorization'];
    }

    const requestConfig: RequestInit = {
      ...fetchConfig,
      headers,
    };

    let lastError: ApiError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...requestConfig,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle response
        const result = await this.handleResponse<T>(response);
        return result;

      } catch (error) {
        lastError = this.createApiError(error);

        // Don't retry on client errors (4xx) except for rate limiting
        if (lastError.status && lastError.status >= 400 && lastError.status < 500 && lastError.status !== 429) {
          break;
        }

        // Don't retry on the last attempt
        if (attempt === retries) {
          break;
        }

        // Wait before retrying with exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Handle HTTP response
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      let errorData: any = {};
      
      if (isJson) {
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: 'Failed to parse error response' };
        }
      } else {
        errorData = { message: await response.text() };
      }

      const error = new Error(errorData.message || `HTTP ${response.status}`) as ApiError;
      error.status = response.status;
      error.code = errorData.code;
      error.details = errorData.details;
      throw error;
    }

    if (isJson) {
      return await response.json();
    } else {
      return { success: true, data: await response.text() } as ApiResponse<T>;
    }
  }

  /**
   * Create standardized API error
   */
  private createApiError(error: any): ApiError {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Request timeout') as ApiError;
      timeoutError.code = ERROR_CODES.SERVICE_UNAVAILABLE;
      return timeoutError;
    }

    if (error instanceof Error && 'status' in error) {
      return error as ApiError;
    }

    const apiError = new Error(error.message || 'Network error') as ApiError;
    apiError.code = ERROR_CODES.INTERNAL_SERVER_ERROR;
    return apiError;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // HTTP Methods

  /**
   * GET request
   */
  async get<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
    });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : null,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : null,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'DELETE' });
  }

  /**
   * Upload file
   */
  async uploadFile<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const headers = { ...this.defaultHeaders };
    delete headers['Content-Type']; // Let browser set multipart boundary

    return this.makeRequest<T>(endpoint, {
      ...config,
      method: 'POST',
      body: formData,
      headers,
    });
  }
}

// Create default HTTP client instance
export const apiClient = new HttpClient();

/**
 * API Service Classes
 */

// Authentication API
export class AuthAPI {
  /**
   * Login user
   */
  static async login(email: string, password: string, rememberMe?: boolean) {
    return apiClient.post('/auth/login', {
      email,
      password,
      rememberMe,
    });
  }

  /**
   * Register user - Step 1: Basic Information
   */
  static async registerStep1(data: {
    name: string;
    email: string;
    phone: string;
    role: 'STUDENT' | 'LECTURER';
    studentId?: string;
    employeeId?: string;
    password: string;
    confirmPassword: string;
    agreeToTerms: boolean;
    agreeToPrivacy: boolean;
  }) {
    return apiClient.post('/auth/register/step-1', data);
  }

  /**
   * Register user - Step 2: Document Verification
   */
  static async registerStep2(data: {
    documentType: string;
    documentNumber: string;
    documentFile: File;
    documentExpiryDate?: string;
  }) {
    const formData = new FormData();
    formData.append('documentType', data.documentType);
    formData.append('documentNumber', data.documentNumber);
    formData.append('documentFile', data.documentFile);
    
    if (data.documentExpiryDate) {
      formData.append('documentExpiryDate', data.documentExpiryDate);
    }

    return apiClient.post('/auth/register/step-2', formData, {
      headers: {}, // Remove Content-Type for FormData
    });
  }

  /**
   * Register user - Step 3: Face Enrollment
   */
  static async registerStep3(data: {
    faceImages: File[];
    consentToFaceData: boolean;
  }) {
    const formData = new FormData();
    
    data.faceImages.forEach((image, index) => {
      formData.append(`faceImages[${index}]`, image);
    });
    
    formData.append('consentToFaceData', data.consentToFaceData.toString());

    return apiClient.post('/auth/register/step-3', formData, {
      headers: {},
    });
  }

  /**
   * Verify email
   */
  static async verifyEmail(token: string) {
    return apiClient.post('/auth/verify-email', { token });
  }

  /**
   * Verify phone number
   */
  static async verifyPhone(otp: string) {
    return apiClient.post('/auth/verify-phone', { otp });
  }

  /**
   * Resend email verification
   */
  static async resendEmailVerification() {
    return apiClient.post('/auth/resend-email-verification');
  }

  /**
   * Resend phone verification
   */
  static async resendPhoneVerification() {
    return apiClient.post('/auth/resend-phone-verification');
  }

  /**
   * Get registration status
   */
  static async getRegistrationStatus() {
    return apiClient.get('/auth/register/status');
  }

  /**
   * Logout user
   */
  static async logout() {
    return apiClient.post('/auth/logout');
  }

  /**
   * Refresh token
   */
  static async refreshToken(refreshToken: string) {
    return apiClient.post('/auth/refresh', { refreshToken });
  }

  /**
   * Forgot password
   */
  static async forgotPassword(email: string) {
    return apiClient.post('/auth/forgot-password', { email });
  }

  /**
   * Reset password
   */
  static async resetPassword(token: string, password: string) {
    return apiClient.post('/auth/reset-password', { token, password });
  }
}

// User Management API
export class UserAPI {
  static async getProfile() {
    return apiClient.get('/user/profile');
  }

  static async updateProfile(data: any) {
    return apiClient.put('/user/profile', data);
  }

  static async changePassword(currentPassword: string, newPassword: string) {
    return apiClient.post('/user/change-password', {
      currentPassword,
      newPassword,
    });
  }
}

// Face Recognition API
export class FaceAPI {
  static async enrollFace(images: File[]) {
    const formData = new FormData();
    images.forEach((image, index) => {
      formData.append(`images[${index}]`, image);
    });
    
    return apiClient.post('/face/enroll', formData, {
      headers: {},
    });
  }

  static async verifyFace(image: File) {
    return apiClient.uploadFile('/face/verify', image);
  }

  static async checkFaceQuality(image: File) {
    return apiClient.uploadFile('/face/quality-check', image);
  }
}

// Attendance API
export class AttendanceAPI {
  static async checkIn(data: any) {
    const formData = new FormData();
    
    if (data.faceImage) {
      formData.append('faceImage', data.faceImage);
    }
    
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'faceImage') {
        formData.append(key, String(value));
      }
    });
    
    return apiClient.post('/attendance/check-in', formData, {
      headers: {},
    });
  }

  static async getAttendanceHistory(params?: any) {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/attendance/history?${searchParams}`);
  }

  static async getAttendanceReports(params: any) {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/attendance/reports?${searchParams}`);
  }
}

// Class Management API
export class ClassAPI {
  static async getClasses(params?: any) {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/classes?${searchParams}`);
  }

  static async createClass(data: any) {
    return apiClient.post('/classes', data);
  }

  static async updateClass(id: string, data: any) {
    return apiClient.put(`/classes/${id}`, data);
  }

  static async deleteClass(id: string) {
    return apiClient.delete(`/classes/${id}`);
  }
}

// Location Management API
export class LocationAPI {
  static async getLocations() {
    return apiClient.get('/locations');
  }

  static async createLocation(data: any) {
    return apiClient.post('/locations', data);
  }

  static async updateLocation(id: string, data: any) {
    return apiClient.put(`/locations/${id}`, data);
  }
}

// System/Admin API
export class SystemAPI {
  static async getSystemStats() {
    return apiClient.get('/system/stats');
  }

  static async getSystemHealth() {
    return apiClient.get('/system/health');
  }

  static async updateSystemConfig(config: any) {
    return apiClient.post('/system/config', config);
  }
}

/**
 * WebSocket Client for Real-time Updates
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(url: string = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000/ws') {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.ws = null;
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected. Cannot send message.');
    }
  }

  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private handleMessage(message: any): void {
    const { type, data } = message;
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, this.reconnectInterval * this.reconnectAttempts);
  }
}

// Create WebSocket client instance
export const wsClient = new WebSocketClient();

/**
 * API Cache Manager
 */
export class ApiCacheManager {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  set(key: string, data: any, ttl: number = 300000): void { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Create cache manager instance
export const apiCache = new ApiCacheManager();

/**
 * Utility Functions
 */

/**
 * Create query string from object
 */
export function createQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  
  return searchParams.toString();
}

/**
 * Handle API errors globally
 */
export function handleApiError(error: ApiError): void {
  console.error('API Error:', error);

  switch (error.code) {
    case ERROR_CODES.UNAUTHORIZED:
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      break;
      
    case ERROR_CODES.RATE_LIMIT_EXCEEDED:
      console.warn('Rate limit exceeded. Please try again later.');
      break;
      
    case ERROR_CODES.SERVICE_UNAVAILABLE:
      console.warn('Service temporarily unavailable.');
      break;
      
    default:
      console.error('An unexpected error occurred.');
  }
}

/**
 * Retry failed requests with exponential backoff
 */
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxAttempts - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Request queue for managing concurrent requests
 */
export class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private running = false;
  private concurrency = 5;

  add<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.running) {
        this.process();
      }
    });
  }

  private async process(): Promise<void> {
    this.running = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.concurrency);
      await Promise.all(batch.map(request => request()));
    }

    this.running = false;
  }
}

// Create request queue instance
export const requestQueue = new RequestQueue();

/**
 * Upload progress tracking
 */
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class FileUploader {
  static async uploadWithProgress(
    endpoint: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void,
    additionalData?: Record<string, any>
  ): Promise<ApiResponse> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      
      formData.append('file', file);
      
      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, String(value));
        });
      }

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100)
          });
        }
      });

      xhr.addEventListener('load', () => {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          reject(new Error('Invalid response format'));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `/api${endpoint}`);
      
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.send(formData);
    });
  }
}

export default apiClient;