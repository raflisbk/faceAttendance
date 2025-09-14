/**
 * API Client and HTTP Utilities
 * Centralized API communication with error handling, retries, and type safety
 */

import { RATE_LIMITS, ERROR_CODES } from './constants';

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

    const headers = {
      ...this.defaultHeaders,
      ...fetchConfig.headers,
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
      body: data ? JSON.stringify(data) : undefined,
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
      body: data ? JSON.stringify(data) : undefined,
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
      body: data ? JSON.stringify(data) : undefined,
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

  /**
   * Upload multiple files
   */
  async uploadFiles<T>(
    endpoint: string,
    files: File[],
    additionalData?: Record<string, any>,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const headers = { ...this.defaultHeaders };
    delete headers['Content-Type'];

    return this.makeRequest<T>(endpoint, {
      ...config,
      method: 'POST',
      body: formData,
      headers,
    });
  }

  /**
   * Download file
   */
  async downloadFile(
    endpoint: string,
    config?: RequestConfig
  ): Promise<Blob> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: this.defaultHeaders,
      ...config,
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    return response.blob();
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
   * Register user - Step 1
   */
  static async registerStep1(data: any) {
    return apiClient.post('/auth/register/step-1', data);
  }

  /**
   * Register user - Step 2
   */
  static async registerStep2(formData: FormData) {
    return apiClient.post('/auth/register/step-2', formData, {
      headers: {}, // Remove Content-Type for FormData
    });
  }

  /**
   * Register user - Step 3
   */
  static async registerStep3(formData: FormData) {
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
  /**
   * Get current user profile
   */
  static async getProfile() {
    return apiClient.get('/user/profile');
  }

  /**
   * Update user profile
   */
  static async updateProfile(data: any) {
    return apiClient.put('/user/profile', data);
  }

  /**
   * Change password
   */
  static async changePassword(currentPassword: string, newPassword: string) {
    return apiClient.post('/user/change-password', {
      currentPassword,
      newPassword,
    });
  }

  /**
   * Upload avatar
   */
  static async uploadAvatar(file: File) {
    return apiClient.uploadFile('/user/avatar', file);
  }

  /**
   * Get users (admin only)
   */
  static async getUsers(params?: any) {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/users?${searchParams}`);
  }

  /**
   * Approve user
   */
  static async approveUser(userId: string) {
    return apiClient.post(`/users/${userId}/approve`);
  }

  /**
   * Reject user
   */
  static async rejectUser(userId: string, reason: string) {
    return apiClient.post(`/users/${userId}/reject`, { reason });
  }
}

// Face Recognition API
export class FaceAPI {
  /**
   * Enroll face
   */
  static async enrollFace(images: File[]) {
    const formData = new FormData();
    images.forEach((image, index) => {
      formData.append(`images[${index}]`, image);
    });
    
    return apiClient.post('/face/enroll', formData, {
      headers: {},
    });
  }

  /**
   * Verify face
   */
  static async verifyFace(image: File) {
    return apiClient.uploadFile('/face/verify', image);
  }

  /**
   * Check face quality
   */
  static async checkFaceQuality(image: File) {
    return apiClient.uploadFile('/face/quality-check', image);
  }

  /**
   * Update face profile
   */
  static async updateFaceProfile(images: File[]) {
    const formData = new FormData();
    images.forEach((image, index) => {
      formData.append(`images[${index}]`, image);
    });
    
    return apiClient.post('/face/update-profile', formData, {
      headers: {},
    });
  }
}

// Attendance API
export class AttendanceAPI {
  /**
   * Check in attendance
   */
  static async checkIn(data: any) {
    const formData = new FormData();
    
    // Add face image
    if (data.faceImage) {
      formData.append('faceImage', data.faceImage);
    }
    
    // Add other data
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'faceImage') {
        formData.append(key, String(value));
      }
    });
    
    return apiClient.post('/attendance/check-in', formData, {
      headers: {},
    });
  }

  /**
   * Get attendance history
   */
  static async getAttendanceHistory(params?: any) {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/attendance/history?${searchParams}`);
  }

  /**
   * Get attendance reports
   */
  static async getAttendanceReports(params: any) {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/attendance/reports?${searchParams}`);
  }

  /**
   * Manual attendance entry (admin/lecturer)
   */
  static async manualAttendance(data: any) {
    return apiClient.post('/attendance/manual', data);
  }

  /**
   * Export attendance data
   */
  static async exportAttendance(params: any) {
    const searchParams = new URLSearchParams(params);
    return apiClient.downloadFile(`/attendance/export?${searchParams}`);
  }
}

// Class Management API
export class ClassAPI {
  /**
   * Get classes
   */
  static async getClasses(params?: any) {
    const searchParams = new URLSearchParams(params);
    return apiClient.get(`/classes?${searchParams}`);
  }

  /**
   * Create class
   */
  static async createClass(data: any) {
    return apiClient.post('/classes', data);
  }

  /**
   * Update class
   */
  static async updateClass(id: string, data: any) {
    return apiClient.put(`/classes/${id}`, data);
  }

  /**
   * Delete class
   */
  static async deleteClass(id: string) {
    return apiClient.delete(`/classes/${id}`);
  }

  /**
   * Get class details
   */
  static async getClassDetails(id: string) {
    return apiClient.get(`/classes/${id}`);
  }

  /**
   * Enroll student
   */
  static async enrollStudent(classId: string, studentId: string) {
    return apiClient.post(`/classes/${classId}/enroll`, { studentId });
  }

  /**
   * Remove student
   */
  static async removeStudent(classId: string, studentId: string) {
    return apiClient.delete(`/classes/${classId}/students/${studentId}`);
  }
}

// Location Management API
export class LocationAPI {
  /**
   * Get locations
   */
  static async getLocations() {
    return apiClient.get('/locations');
  }

  /**
   * Create location
   */
  static async createLocation(data: any) {
    return apiClient.post('/locations', data);
  }

  /**
   * Update location
   */
  static async updateLocation(id: string, data: any) {
    return apiClient.put(`/locations/${id}`, data);
  }

  /**
   * Delete location
   */
  static async deleteLocation(id: string) {
    return apiClient.delete(`/locations/${id}`);
  }

  /**
   * Validate WiFi
   */
  static async validateWiFi(ssid: string, locationId: string) {
    return apiClient.post('/locations/validate-wifi', { ssid, locationId });
  }
}

// System/Admin API
export class SystemAPI {
  /**
   * Get system stats
   */
  static async getSystemStats() {
    return apiClient.get('/system/stats');
  }