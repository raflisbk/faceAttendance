// app/login/page.tsx
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
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  LogIn,
  UserPlus,
  AlertCircle,
  ArrowRight
} from 'lucide-react'
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
  const { setUser, setIsAuthenticated } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange'
  })

  const watchedFields = watch()

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true)
      setError('')

      const response = await ApiClient.post('/api/auth/login', data)

      if (response.success) {
        setUser(response.user)
        setIsAuthenticated(true)
        
        toast.showSuccess('Login successful!')
        
        // Redirect based on user role
        const redirectPath = getRedirectPath(response.user.role, response.user.status)
        router.push(redirectPath)
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed. Please try again.'
      setError(errorMessage)
      toast.showError(errorMessage)
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
      ADMIN: { email: 'admin@demo.com', password: 'demo123' },
      LECTURER: { email: 'lecturer@demo.com', password: 'demo123' },
      STUDENT: { email: 'student@demo.com', password: 'demo123' }
    }

    const credential = demoCredentials[role]
    await onSubmit(credential)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(15,23,42,0.8)_100%)]" />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
      
      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 border border-white/20 mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-slate-400">
            Sign in to your Face Attendance account
          </p>
        </div>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-white">
              Sign In
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-900/50 border-red-800 text-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className={cn(
                      "pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400",
                      "focus:border-slate-600 focus:ring-slate-600",
                      errors.email && "border-red-500 focus:border-red-500 focus:ring-red-500"
                    )}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className={cn(
                      "pl-10 pr-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400",
                      "focus:border-slate-600 focus:ring-slate-600",
                      errors.password && "border-red-500 focus:border-red-500 focus:ring-red-500"
                    )}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="border-slate-600 data-[state=checked]:bg-slate-600 data-[state=checked]:border-slate-600"
                  />
                  <Label htmlFor="remember" className="text-sm text-slate-300">
                    Remember me
                  </Label>
                </div>
                <Link 
                  href="/forgot-password" 
                  className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!isValid || isLoading}
                className={cn(
                  "w-full bg-slate-700 hover:bg-slate-600 text-white",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-all duration-200"
                )}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner className="mr-2" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-slate-400">Demo Accounts</span>
              </div>
            </div>

            {/* Demo Login Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin('ADMIN')}
                className="bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white text-xs"
              >
                Admin
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin('LECTURER')}
                className="bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white text-xs"
              >
                Lecturer
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin('STUDENT')}
                className="bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white text-xs"
              >
                Student
              </Button>
            </div>

            {/* Sign Up Link */}
            <div className="text-center pt-4">
              <p className="text-slate-400 text-sm">
                Don't have an account?{' '}
                <Link 
                  href="/register" 
                  className="text-slate-300 hover:text-white font-medium transition-colors inline-flex items-center"
                >
                  Sign up here
                  <UserPlus className="ml-1 w-4 h-4" />
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-slate-500 text-sm">
            Secure face recognition attendance system
          </p>
        </div>
      </div>
    </div>
  )
}