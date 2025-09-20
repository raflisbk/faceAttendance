'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToastHelpers } from '@/components/ui/toast'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  EyeIcon,
  EyeSlashIcon,
  EnvelopeIcon,
  LockClosedIcon,
  CameraIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  UserPlusIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { ApiClient } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth-store'
import type { z } from 'zod'

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const router = useRouter()
  const toast = useToastHelpers()
  const { login } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange'
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true)
      setError('')

      const response = await ApiClient.post<{
        user: {
          id: string
          name: string
          email: string
          role: 'ADMIN' | 'LECTURER' | 'STUDENT'
          status: string
          avatar?: string
          emailVerified: boolean
          phoneVerified: boolean
          registrationStep: number
        }
        token: string
      }>('/api/auth/login', data)

      if (response.success && response.data) {
        login(response.data.user, response.data.token)

        toast.success('Login successful!')

        // Redirect based on user role
        const redirectPath = getRedirectPath(response.data.user.role, response.data.user.status)
        router.push(redirectPath)
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed. Please try again.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const getRedirectPath = (role: string, status: string) => {
    if (status === 'PENDING_APPROVAL') {
      return '/pending-approval'
    }

    switch (role) {
      case 'ADMIN':
        return '/admin/dashboard'
      case 'LECTURER':
        return '/lecturer/dashboard'
      case 'STUDENT':
        return '/student/dashboard'
      default:
        return '/dashboard'
    }
  }

  const handleDemoLogin = async (role: 'ADMIN' | 'LECTURER' | 'STUDENT') => {
    const demoCredentials = {
      ADMIN: { email: 'admin@demo.com', password: 'demo123', rememberMe: false },
      LECTURER: { email: 'lecturer@demo.com', password: 'demo123', rememberMe: false },
      STUDENT: { email: 'student@demo.com', password: 'demo123', rememberMe: false }
    }

    const credential = demoCredentials[role]
    await onSubmit(credential)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen clean-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 enterprise-card flex items-center justify-center mx-auto mb-4">
            <LoadingSpinner className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-muted">Authenticating...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen blackboard-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-slide-up">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-blue-500 shadow-lg border border-green-300/20 flex items-center justify-center hover:shadow-green-400/50 transition-all duration-300">
              <CameraIcon className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold text-green-300 font-kalam animate-pulse">FaceAttend</h1>
              <p className="text-sm text-blue-300 font-caveat">Enterprise Blackboard</p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-4xl font-bold text-green-200 font-caveat">Welcome Back</h2>
            <p className="text-blue-200 font-kalam italic">
              Sign in to access your digital blackboard
            </p>
          </div>
        </div>

        {/* Login Form */}
        <Card className="enterprise-card">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-gray-900">Sign In</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert className="status-error">
                <ExclamationTriangleIcon className="h-5 w-5" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className={cn(
                      "input-field pl-10",
                      errors.email && "border-red-300 focus:border-red-500 focus:ring-red-500"
                    )}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className={cn(
                      "input-field pl-10 pr-10",
                      errors.password && "border-red-300 focus:border-red-500 focus:ring-red-500"
                    )}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="remember" className="text-sm text-gray-700">
                    Remember me
                  </Label>
                </div>
                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!isValid || isLoading}
                className="btn-primary w-full group"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner className="mr-2" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <ShieldCheckIcon className="w-5 h-5 mr-2" />
                    Sign In
                    <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-500">Demo Accounts</span>
              </div>
            </div>

            {/* Demo Login Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <Button
                type="button"
                onClick={() => handleDemoLogin('ADMIN')}
                className="btn-secondary text-sm py-2"
              >
                Admin
              </Button>
              <Button
                type="button"
                onClick={() => handleDemoLogin('LECTURER')}
                className="btn-secondary text-sm py-2"
              >
                Lecturer
              </Button>
              <Button
                type="button"
                onClick={() => handleDemoLogin('STUDENT')}
                className="btn-secondary text-sm py-2"
              >
                Student
              </Button>
            </div>

            {/* Sign Up Link */}
            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  href="/register"
                  className="text-blue-600 hover:text-blue-500 font-medium inline-flex items-center"
                >
                  Create account
                  <UserPlusIcon className="ml-1 w-4 h-4" />
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            <ShieldCheckIcon className="w-4 h-4 inline mr-1" />
            Secured with enterprise-grade encryption
          </p>
        </div>
      </div>
    </div>
  )
}