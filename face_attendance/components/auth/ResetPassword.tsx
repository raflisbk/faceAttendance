import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
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
  Lock, 
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastHelpers } from '@/components/ui/toast'

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

interface ResetPasswordProps {
  className?: string
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ className }) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToastHelpers()
  
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  const token = searchParams?.get('token')
  const email = searchParams?.get('email')

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: ''
    }
  })

  // Validate token on component mount
  useEffect(() => {
    if (token && email) {
      validateToken()
    } else {
      setIsValidating(false)
      setTokenValid(false)
    }
  }, [token, email])

  // Calculate password strength
  useEffect(() => {
    const password = form.watch('password')
    setPasswordStrength(calculatePasswordStrength(password))
  }, [form.watch('password')])

  const validateToken = async () => {
    try {
      const response = await fetch('/api/auth/validate-reset-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email })
      })

      if (response.ok) {
        setTokenValid(true)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Invalid or expired reset link')
        setTokenValid(false)
      }
    } catch (error) {
      console.error('Token validation error:', error)
      toast.error('Failed to validate reset link')
      setTokenValid(false)
    } finally {
      setIsValidating(false)
    }
  }

  const calculatePasswordStrength = (password: string): number => {
    let strength = 0
    if (password.length >= 8) strength += 20
    if (password.length >= 12) strength += 10
    if (/[A-Z]/.test(password)) strength += 20
    if (/[a-z]/.test(password)) strength += 20
    if (/[0-9]/.test(password)) strength += 15
    if (/[^A-Za-z0-9]/.test(password)) strength += 15
    return Math.min(strength, 100)
  }

  const getPasswordStrengthColor = (strength: number) => {
    if (strength < 40) return 'bg-red-500'
    if (strength < 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getPasswordStrengthText = (strength: number) => {
    if (strength < 40) return 'Weak'
    if (strength < 70) return 'Medium'
    return 'Strong'
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
          password: data.password
        })
      })

      if (response.ok) {
        setIsSuccess(true)
        toast.success('Password reset successfully')
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to reset password')
      }
    } catch (error) {
      console.error('Reset password error:', error)
      toast.error('Failed to reset password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state during token validation
  if (isValidating) {
    return (
      <div className={cn("w-full max-w-md mx-auto", className)}>
        <Card className="shadow-xl border-slate-200 dark:border-slate-700">
          <CardContent className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-600 dark:text-slate-400 mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              Validating reset link...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <div className={cn("w-full max-w-md mx-auto", className)}>
        <Card className="shadow-xl border-slate-200 dark:border-slate-700">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-xl text-red-800 dark:text-red-200">
              Invalid Reset Link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-slate-600 dark:text-slate-400">
              This password reset link is invalid or has expired.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => router.push('/forgot-password')}
                variant="chalk"
                className="w-full"
              >
                Request New Reset Link
              </Button>
              <Button
                onClick={() => router.push('/login')}
                variant="chalkOutline"
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (isSuccess) {
    return (
      <div className={cn("w-full max-w-md mx-auto", className)}>
        <Card className="shadow-xl border-slate-200 dark:border-slate-700">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-xl text-green-800 dark:text-green-200">
              Password Reset Successful
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-slate-600 dark:text-slate-400">
              Your password has been successfully reset. You will be redirected to the login page.
            </p>
            <Button
              onClick={() => router.push('/login')}
              variant="chalk"
              className="w-full"
            >
              Continue to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Reset password form
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
            Enter your new password for {email}
          </p>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter new password"
                          icon={<Lock className="w-4 h-4" />}
                          disabled={isLoading}
                          {...field}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    
                    {/* Password Strength Indicator */}
                    {field.value && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">Password strength</span>
                          <span className={cn(
                            "font-medium",
                            passwordStrength < 40 ? "text-red-600 dark:text-red-400" :
                            passwordStrength < 70 ? "text-yellow-600 dark:text-yellow-400" :
                            "text-green-600 dark:text-green-400"
                          )}>
                            {getPasswordStrengthText(passwordStrength)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div 
                            className={cn(
                              "h-2 rounded-full transition-all duration-300",
                              getPasswordStrengthColor(passwordStrength)
                            )}
                            style={{ width: `${passwordStrength}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm new password"
                          icon={<Lock className="w-4 h-4" />}
                          disabled={isLoading}
                          {...field}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          disabled={isLoading}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
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
                disabled={isLoading || passwordStrength < 70}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
          </Form>

          {/* Password Requirements */}
          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-3">
              Password Requirements:
            </h4>
            <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  form.watch('password')?.length >= 8 ? "bg-green-500" : "bg-slate-300"
                )} />
                At least 8 characters long
              </li>
              <li className="flex items-center gap-2">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  /[A-Z]/.test(form.watch('password') || '') ? "bg-green-500" : "bg-slate-300"
                )} />
                One uppercase letter
              </li>
              <li className="flex items-center gap-2">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  /[a-z]/.test(form.watch('password') || '') ? "bg-green-500" : "bg-slate-300"
                )} />
                One lowercase letter
              </li>
              <li className="flex items-center gap-2">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  /[0-9]/.test(form.watch('password') || '') ? "bg-green-500" : "bg-slate-300"
                )} />
                One number
              </li>
              <li className="flex items-center gap-2">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  /[^A-Za-z0-9]/.test(form.watch('password') || '') ? "bg-green-500" : "bg-slate-300"
                )} />
                One special character
              </li>
            </ul>
          </div>

          <div className="mt-6 text-center">
            <Button
              onClick={() => router.push('/login')}
              variant="ghost"
              className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}