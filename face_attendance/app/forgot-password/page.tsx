'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  EnvelopeIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address')
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [error, setError] = useState<string>('')

  const router = useRouter()
  const toast = useToastHelpers()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    getValues
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange'
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true)
      setError('')

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send reset email')
      }

      setIsEmailSent(true)
      toast.success('Reset email sent successfully!')

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email. Please try again.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pixel-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 pixel-card flex items-center justify-center mx-auto space-pixel-md">
            <LoadingSpinner className="w-6 h-6 text-foreground" />
          </div>
          <p className="text-pixel">Processing reset request...</p>
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
          <h1 className="heading-pixel-2 mb-0">Account Recovery</h1>
        </div>

        {/* Header Separator */}
        <div className="w-full h-px bg-white pixel-shadow"></div>
      </div>

      {/* Main Content Container */}
      <div className="flex items-center justify-center px-4" style={{minHeight: 'calc(100vh - 5rem)', paddingTop: '2rem'}}>
        <div className="w-full max-w-md flex-pixel-col animate-pixel-slide">

          {!isEmailSent ? (
            /* Forgot Password Form */
            <Card className="pixel-card hover-pixel">
              <CardHeader className="text-center">
                <CardTitle className="heading-pixel-3 flex items-center justify-center">
                  <ShieldCheckIcon className="w-5 h-5 mr-2" />
                  Reset Password
                </CardTitle>
                <p className="text-pixel-small text-muted-foreground">
                  Enter your email address and we'll send you a link to reset your password
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
                        placeholder="Enter your email address"
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

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={!isValid || isLoading}
                    className="btn-pixel w-full group hover-pixel"
                  >
                    {isLoading ? (
                      <>
                        <LoadingSpinner className="mr-2" />
                        Sending reset email...
                      </>
                    ) : (
                      <>
                        <EnvelopeIcon className="w-4 h-4 mr-2" />
                        Send Reset Link
                        <ArrowRightIcon className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Back to Login Link */}
                <div className="text-center pt-4 border-t border-border">
                  <p className="text-pixel-small">
                    Remember your password?{' '}
                    <Link
                      href="/login"
                      className="text-foreground hover:text-muted-foreground hover-pixel inline-flex items-center"
                    >
                      <ArrowLeftIcon className="mr-1 w-4 h-4" />
                      Back to Sign In
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Success Message */
            <Card className="pixel-card hover-pixel">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-green-500 pixel-border flex items-center justify-center mx-auto mb-4 pixel-shadow">
                  <CheckCircleIcon className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="heading-pixel-3">
                  Check Your Email
                </CardTitle>
                <p className="text-pixel-small text-muted-foreground">
                  We've sent a password reset link to <strong>{getValues('email')}</strong>
                </p>
              </CardHeader>

              <CardContent className="flex-pixel-col text-center">
                <div className="pixel-frame bg-muted space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <ClockIcon className="w-5 h-5 text-muted-foreground" />
                    <span className="text-pixel-small font-medium">
                      Reset link expires in 1 hour
                    </span>
                  </div>
                  <p className="text-pixel-small text-muted-foreground">
                    If you don't see the email, check your spam folder or try again with a different email address.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => {
                      setIsEmailSent(false)
                      setError('')
                    }}
                    variant="outline"
                    className="btn-pixel-secondary w-full"
                  >
                    <EnvelopeIcon className="w-4 h-4 mr-2" />
                    Send Another Email
                  </Button>

                  <Link href="/login" className="w-full">
                    <Button className="btn-pixel w-full">
                      <ArrowLeftIcon className="w-4 h-4 mr-2" />
                      Back to Sign In
                    </Button>
                  </Link>
                </div>
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