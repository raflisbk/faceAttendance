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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Login failed. Please try again.'
        : 'Login failed. Please try again.'
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


  if (isLoading) {
    return (
      <div className="min-h-screen pixel-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 pixel-card flex items-center justify-center mx-auto space-pixel-md">
            <LoadingSpinner className="w-6 h-6 text-foreground" />
          </div>
          <p className="text-pixel">Authenticating...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pixel-bg">
      {/* Header Area */}
      <div className="relative">
        {/* Header with FaceAttend text */}
        <div className="flex items-center justify-between h-20 px-12">
          <Link href="/" className="no-underline">
            <h1 className="heading-pixel-2 hover-pixel cursor-pointer mb-0">FaceAttend</h1>
          </Link>
          <h1 className="heading-pixel-2 mb-0">Let's Go</h1>
        </div>

        {/* Header Separator */}
        <div className="w-full h-px bg-white pixel-shadow"></div>
      </div>

      {/* Main Content Container */}
      <div className="flex items-center justify-center px-4" style={{minHeight: 'calc(100vh - 5rem)', paddingTop: '2rem'}}>
        <div className="w-full max-w-md flex-pixel-col animate-pixel-slide">

        {/* Login Form */}
        <Card className="pixel-card hover-pixel">
          <CardHeader className="text-center">
            <CardTitle className="heading-pixel-3">Sign In</CardTitle>
          </CardHeader>

          <CardContent className="flex-pixel-col">
            {error && (
              <Alert className="pixel-frame bg-destructive text-destructive-foreground">
                <ExclamationTriangleIcon className="h-5 w-5" />
                <AlertDescription className="text-pixel-small">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="flex-pixel-col">
              {/* Email Field */}
              <div className="flex-pixel-col">
                <Label htmlFor="email" className="text-pixel">
                  Email Address
                </Label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className={cn(
                      "input-pixel pl-10",
                      errors.email && "border-destructive focus:border-destructive focus:ring-destructive"
                    )}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-pixel-small text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="flex-pixel-col">
                <Label htmlFor="password" className="text-pixel">
                  Password
                </Label>
                <div className="relative">
                  <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className={cn(
                      "input-pixel pl-10 pr-10",
                      errors.password && "border-destructive focus:border-destructive focus:ring-destructive"
                    )}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none hover-pixel"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-pixel-small text-destructive">{errors.password.message}</p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-pixel-xs">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="border-border text-foreground focus:ring-foreground"
                  />
                  <Label htmlFor="remember" className="text-pixel-small">
                    Remember me
                  </Label>
                </div>
                <Link
                  href="/forgot-password"
                  className="text-pixel-small text-foreground hover:text-muted-foreground hover-pixel"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!isValid || isLoading}
                className="btn-pixel w-full group hover-pixel"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner className="mr-2" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <ShieldCheckIcon className="w-4 h-4 mr-2" />
                    Sign In
                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>


            {/* Sign Up Link */}
            <div className="text-center pt-4 border-t border-border">
              <p className="text-pixel-small">
                Don't have an account?{' '}
                <Link
                  href="/register"
                  className="text-foreground hover:text-muted-foreground hover-pixel inline-flex items-center"
                >
                  Create account
                  <UserPlusIcon className="ml-1 w-4 h-4" />
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Credit */}
        <div className="text-center">
          <p className="text-pixel-small text-muted-foreground">
            Created by Mohamad Rafli Agung Subekti
          </p>
        </div>
        </div>
      </div>
    </div>
  )
}