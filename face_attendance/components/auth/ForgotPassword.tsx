import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { 
  Camera, 
  Mail, 
  ArrowLeft,
  CheckCircle,
  Clock,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastHelpers } from '@/components/ui/toast'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address')
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

interface ForgotPasswordProps {
  onSuccess?: () => void
  className?: string
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  onSuccess,
  className
}) => {
  const toast = useToastHelpers()
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ''
    }
  })

  // Handle resend cooldown timer
  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown(prev => prev - 1)
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [resendCooldown])

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        setIsSubmitted(true)
        setSubmittedEmail(data.email)
        setResendCooldown(60) // 1 minute cooldown
        
        toast.success(
          'Password reset email sent successfully',
          'Check your inbox'
        )

        if (onSuccess) {
          onSuccess()
        }
      } else {
        toast.error(
          result.message || 'Failed to send password reset email',
          'Request Failed'
        )
      }
    } catch (error) {
      console.error('Forgot password error:', error)
      toast.error(
        'Unable to connect to the server. Please try again later.',
        'Connection Error'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: submittedEmail }),
      })

      if (response.ok) {
        setResendCooldown(60)
        toast.success('Password reset email sent again')
      } else {
        toast.error('Failed to resend email')
      }
    } catch (error) {
      toast.error('Failed to resend email')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setIsSubmitted(false)
    setSubmittedEmail('')
    setResendCooldown(0)
    form.reset()
  }

  if (isSubmitted) {
    return (
      <div className={cn("w-full max-w-md mx-auto", className)}>
        <Card className="shadow-xl border-slate-200 dark:border-slate-700">
          <CardHeader className="space-y-1 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            
            <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              Check Your Email
            </CardTitle>
            <p className="text-slate-600 dark:text-slate-400">
              We've sent a password reset link to your email
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Email sent to:
                </p>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {submittedEmail}
                </p>
              </div>

              <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                <p>
                  Click the link in the email to reset your password. The link will expire in 1 hour.
                </p>
                <p>
                  If you don't see the email, check your spam folder.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleResendEmail}
                disabled={resendCooldown > 0 || isLoading}
                variant="chalkOutline"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Resend in {resendCooldown}s
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Resend Email
                  </>
                )}
              </Button>

              <Button
                onClick={resetForm}
                variant="ghost"
                className="w-full"
              >
                Try Different Email
              </Button>
            </div>

            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <Card className="shadow-xl border-slate-200 dark:border-slate-700">
        <CardHeader className="space-y-1 text-center">
          <div className="w-16 h-16 bg-slate-800 dark:bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Camera className="w-8 h-8 text-white dark:text-slate-800" />
          </div>
          
          <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200 font-mono">
            Reset Password
          </CardTitle>
          <p className="text-slate-600 dark:text-slate-400">
            Enter your email to receive a password reset link
          </p>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email address"
                        icon={<Mail className="w-4 h-4" />}
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                variant="chalk"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending Reset Link...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Reset Link
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Don't have an account?{' '}
              <Link
                href="/register"
                className="font-medium text-slate-800 dark:text-slate-200 hover:underline"
              >
                Sign up here
              </Link>
            </p>
          </div>

          {/* Security Notice */}
          <div className="mt-6 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              For security reasons, password reset links expire after 1 hour.
              You can only request a new link every 60 seconds.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}