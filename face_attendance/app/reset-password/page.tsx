'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToastHelpers } from '@/components/ui/toast'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string>('')
  const [token, setToken] = useState<string | null>(null)
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToastHelpers()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid }
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange'
  })

  const password = watch('password')

  // Password requirements
  const passwordRequirements = [
    { label: 'At least 8 characters', check: password?.length >= 8 },
    { label: 'Contains uppercase letter', check: /[A-Z]/.test(password || '') },
    { label: 'Contains lowercase letter', check: /[a-z]/.test(password || '') },
    { label: 'Contains number', check: /\d/.test(password || '') },
    { label: 'Contains special character', check: /[!@#$%^&*(),.?":{}|<>]/.test(password || '') }
  ]

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (tokenParam) {
      setToken(tokenParam)
      verifyToken(tokenParam)
    } else {
      setError('Reset token is missing. Please use the link from your email.')
      setIsValidToken(false)
    }
  }, [searchParams])

  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await fetch('/api/auth/verify-reset-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: tokenToVerify }),
      })

      const result = await response.json()

      if (response.ok) {
        setIsValidToken(true)
      } else {
        setError(result.error || 'Invalid or expired reset token.')
        setIsValidToken(false)
      }
    } catch (error) {
      setError('Failed to verify reset token.')
      setIsValidToken(false)
    }
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('Reset token is missing.')
      return
    }

    try {
      setIsLoading(true)
      setError('')

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: data.password
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password')
      }

      setIsSuccess(true)
      toast.success('Password reset successfully!')

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset password. Please try again.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || isValidToken === null) {
    return (
      <div className="min-h-screen pixel-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 pixel-card flex items-center justify-center mx-auto space-pixel-md">
            <LoadingSpinner className="w-6 h-6 text-foreground" />
          </div>
          <p className="text-pixel">
            {isValidToken === null ? 'Verifying reset token...' : 'Updating password...'}
          </p>
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
          <h1 className="heading-pixel-2 mb-0">Reset Password</h1>
        </div>

        {/* Header Separator */}
        <div className="w-full h-px bg-white pixel-shadow"></div>
      </div>

      {/* Main Content Container */}
      <div className="flex items-center justify-center px-4" style={{minHeight: 'calc(100vh - 5rem)', paddingTop: '2rem'}}>
        <div className="w-full max-w-md flex-pixel-col animate-pixel-slide">

          {isValidToken === false ? (
            /* Invalid Token Message */
            <Card className="pixel-card hover-pixel">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-destructive pixel-border flex items-center justify-center mx-auto mb-4 pixel-shadow">
                  <ExclamationTriangleIcon className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="heading-pixel-3">
                  Invalid Reset Link
                </CardTitle>
                <p className="text-pixel-small text-muted-foreground">
                  This password reset link is invalid or has expired.
                </p>
              </CardHeader>

              <CardContent className="flex-pixel-col text-center">
                {error && (
                  <Alert className="pixel-frame bg-destructive text-destructive-foreground">
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    <AlertDescription className="text-pixel-small">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col gap-3">
                  <Link href="/forgot-password" className="w-full">
                    <Button className="btn-pixel w-full">
                      <ArrowLeftIcon className="w-4 h-4 mr-2" />
                      Request New Reset Link
                    </Button>
                  </Link>

                  <Link href="/login" className="w-full">
                    <Button variant="outline" className="btn-pixel-secondary w-full">
                      Back to Sign In
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : isSuccess ? (
            /* Success Message */
            <Card className="pixel-card hover-pixel">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-green-500 pixel-border flex items-center justify-center mx-auto mb-4 pixel-shadow">
                  <CheckCircleIcon className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="heading-pixel-3">
                  Password Reset Complete
                </CardTitle>
                <p className="text-pixel-small text-muted-foreground">
                  Your password has been successfully reset. You can now sign in with your new password.
                </p>
              </CardHeader>

              <CardContent className="flex-pixel-col text-center">
                <Link href="/login" className="w-full">
                  <Button className="btn-pixel w-full">
                    <ArrowRightIcon className="w-4 h-4 mr-2" />
                    Continue to Sign In
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            /* Reset Password Form */
            <Card className="pixel-card hover-pixel">
              <CardHeader className="text-center">
                <CardTitle className="heading-pixel-3 flex items-center justify-center">
                  <ShieldCheckIcon className="w-5 h-5 mr-2" />
                  Create New Password
                </CardTitle>
                <p className="text-pixel-small text-muted-foreground">
                  Enter a strong new password for your account
                </p>
              </CardHeader>

              <CardContent className="flex-pixel-col">
                {error && (
                  <Alert className="pixel-frame bg-destructive text-destructive-foreground">
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    <AlertDescription className="text-pixel-small">{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="flex-pixel-col">
                  {/* Password Field */}
                  <div className="flex-pixel-col">
                    <Label htmlFor="password" className="text-pixel">
                      New Password
                    </Label>
                    <div className="relative">
                      <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter new password"
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

                  {/* Confirm Password Field */}
                  <div className="flex-pixel-col">
                    <Label htmlFor="confirmPassword" className="text-pixel">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        className={cn(
                          "input-pixel pl-10 pr-10",
                          errors.confirmPassword && "border-destructive focus:border-destructive focus:ring-destructive"
                        )}
                        {...register('confirmPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none hover-pixel"
                      >
                        {showConfirmPassword ? (
                          <EyeSlashIcon className="w-5 h-5" />
                        ) : (
                          <EyeIcon className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-pixel-small text-destructive">{errors.confirmPassword.message}</p>
                    )}
                  </div>

                  {/* Password Requirements */}
                  <div className="space-y-3">
                    <h4 className="text-pixel font-medium">Password Requirements:</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {passwordRequirements.map((req, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            req.check ? 'bg-green-500' : 'bg-gray-300'
                          }`} />
                          <span className={`text-pixel-small ${
                            req.check ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
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
                        Updating password...
                      </>
                    ) : (
                      <>
                        <ShieldCheckIcon className="w-4 h-4 mr-2" />
                        Update Password
                        <ArrowRightIcon className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

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