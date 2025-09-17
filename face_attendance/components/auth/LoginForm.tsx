import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  Lock, 
  Eye, 
  EyeOff,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastHelpers } from '@/components/ui/toast'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false)
})

type LoginFormData = z.infer<typeof loginSchema>

interface LoginFormProps {
  onSuccess?: () => void
  redirectTo?: string
  className?: string
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  redirectTo = '/dashboard',
  className
}) => {
  const router = useRouter()
  const toast = useToastHelpers()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0)

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  })

  // Handle account lockout timer
  React.useEffect(() => {
    if (isLocked && lockTimeRemaining > 0) {
      const timer = setInterval(() => {
        setLockTimeRemaining(prev => {
          if (prev <= 1) {
            setIsLocked(false)
            setLoginAttempts(0)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
    return undefined
  }, [isLocked, lockTimeRemaining])

  const onSubmit = async (data: LoginFormData) => {
    if (isLocked) {
      toast.warning(`Account temporarily locked. Please try again in ${lockTimeRemaining} seconds.`)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        // Reset login attempts on success
        setLoginAttempts(0)
        setIsLocked(false)

        // Store token and user data
        if (result.token) {
          localStorage.setItem('authToken', result.token)
        }
        if (result.user) {
          localStorage.setItem('user', JSON.stringify(result.user))
        }

        toast.success('Login successful!', 'Welcome back')

        // Call success callback
        if (onSuccess) {
          onSuccess()
        }

        // Redirect to appropriate dashboard based on user role
        const targetUrl = result.user?.role === 'ADMIN' 
          ? '/admin/dashboard'
          : result.user?.role === 'LECTURER'
          ? '/lecturer/dashboard'
          : '/dashboard'

        router.push(redirectTo || targetUrl)

      } else {
        // Handle login failure
        const newAttempts = loginAttempts + 1
        setLoginAttempts(newAttempts)

        if (newAttempts >= 5) {
          setIsLocked(true)
          setLockTimeRemaining(300) // 5 minutes lockout
          toast.error(
            'Too many failed login attempts. Account locked for 5 minutes.',
            'Account Locked'
          )
        } else {
          const remainingAttempts = 5 - newAttempts
          toast.error(
            result.message || 'Invalid email or password',
            `${remainingAttempts} attempts remaining`
          )
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error(
        'Unable to connect to the server. Please check your internet connection.',
        'Connection Error'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const formatLockTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <Card className="shadow-xl border-slate-200 dark:border-slate-700">
        <CardHeader className="space-y-1 text-center">
          {/* Logo */}
          <div className="w-16 h-16 bg-slate-800 dark:bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Camera className="w-8 h-8 text-white dark:text-slate-800" />
          </div>
          
          <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200 font-mono">
            FaceAttend
          </CardTitle>
          <p className="text-slate-600 dark:text-slate-400">
            Sign in to your account
          </p>
        </CardHeader>

        <CardContent>
          {/* Account Locked Warning */}
          {isLocked && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Account Temporarily Locked
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    Please try again in {formatLockTime(lockTimeRemaining)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Login Attempts Warning */}
          {loginAttempts > 2 && !isLocked && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Multiple Failed Attempts
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    {5 - loginAttempts} attempts remaining before account lockout
                  </p>
                </div>
              </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        icon={<Mail className="w-4 h-4" />}
                        disabled={isLoading || isLocked}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          icon={<Lock className="w-4 h-4" />}
                          disabled={isLoading || isLocked}
                          {...field}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading || isLocked}
                        >
                          {showPassword ? (
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

              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        disabled={isLoading || isLocked}
                        className="mt-1"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Remember me for 30 days
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                variant="chalk"
                size="lg"
                disabled={isLoading || isLocked}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </Form>

          {/* Additional Links */}
          <div className="mt-6 space-y-4">
            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:underline"
              >
                Forgot your password?
              </Link>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-800 px-2 text-slate-500 dark:text-slate-400">
                  Don't have an account?
                </span>
              </div>
            </div>

            <div className="text-center">
              <Link
                href="/register"
                className="text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-slate-600 dark:hover:text-slate-400 hover:underline"
              >
                Create a new account
              </Link>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-6 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              Your login is secured with enterprise-grade encryption. 
              For security, accounts are locked after 5 failed attempts.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Development Mode Notice */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
            <strong>Development Mode:</strong> Use any valid email format for testing
          </p>
        </div>
      )}
    </div>
  )
}