// app/register/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RegistrationProgress } from '@/components/ui/progress'
import { RegistrationStep1 } from './step-1'
import { RegistrationStep2 } from './step-2'
import { RegistrationStep3 } from './step-3'
import { RegistrationComplete } from './complete'
import { Card, CardContent } from '@/components/ui/card'
import { UserPlus } from 'lucide-react'

export interface RegistrationData {
  step1?: any
  step2?: any
  step3?: any
  registrationId?: string
}

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [registrationData, setRegistrationData] = useState<RegistrationData>({})
  const router = useRouter()

  const updateRegistrationData = (step: string, data: any) => {
    setRegistrationData(prev => ({
      ...prev,
      [step]: data
    }))
  }

  const handleStepComplete = (step: number, data?: any) => {
    if (data) {
      updateRegistrationData(`step${step}`, data)
    }
    setCurrentStep(step + 1)
  }

  const handleBackStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const steps = [
    'Basic Info',
    'Document Upload',
    'Face Enrollment',
    'Complete'
  ]

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <RegistrationStep1
            onNext={(data) => handleStepComplete(1, data)}
            initialData={registrationData.step1}
          />
        )
      case 2:
        return (
          <RegistrationStep2
            onNext={(data) => handleStepComplete(2, data)}
            onBack={handleBackStep}
            registrationId={registrationData.registrationId}
            initialData={registrationData.step2}
          />
        )
      case 3:
        return (
          <RegistrationStep3
            onNext={(data) => handleStepComplete(3, data)}
            onBack={handleBackStep}
            registrationId={registrationData.registrationId}
            initialData={registrationData.step3}
          />
        )
      case 4:
        return (
          <RegistrationComplete
            registrationData={registrationData}
            onComplete={() => router.push('/login')}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(15,23,42,0.8)_100%)]" />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
      
      <div className="relative w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 border border-white/20 mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Create Account
          </h1>
          <p className="text-slate-400">
            Register for Face Attendance System
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <RegistrationProgress
            currentStep={currentStep}
            totalSteps={4}
            steps={steps}
          />
        </div>

        {/* Step Content */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-8">
            {renderStep()}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// app/register/step-1.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerStep1Schema } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToastHelpers } from '@/components/ui/toast'
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  AlertCircle,
  Building,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApiClient } from '@/lib/api-client'
import type { z } from 'zod'

type Step1FormData = z.infer<typeof registerStep1Schema>

interface RegistrationStep1Props {
  onNext: (data: any) => void
  initialData?: Partial<Step1FormData>
}

export function RegistrationStep1({ onNext, initialData }: RegistrationStep1Props) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  
  const toast = useToastHelpers()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch
  } = useForm<Step1FormData>({
    resolver: zodResolver(registerStep1Schema),
    mode: 'onChange',
    defaultValues: initialData
  })

  const selectedRole = watch('role')

  const onSubmit = async (data: Step1FormData) => {
    if (!termsAccepted) {
      setError('You must accept the terms and conditions')
      return
    }

    try {
      setIsLoading(true)
      setError('')

      const response = await ApiClient.post('/api/auth/register/step-1', data)

      if (response.success) {
        toast.showSuccess('Step 1 completed successfully!')
        onNext({
          ...data,
          registrationId: response.registrationId
        })
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Registration failed. Please try again.'
      setError(errorMessage)
      toast.showError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const departments = [
    'Computer Science',
    'Information Technology',
    'Software Engineering',
    'Data Science',
    'Cybersecurity',
    'Business Administration',
    'Accounting',
    'Marketing',
    'Human Resources',
    'Operations Management'
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Basic Information</h2>
        <p className="text-slate-400">Tell us about yourself to get started</p>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-900/50 border-red-800 text-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Role Selection */}
        <div className="space-y-2">
          <Label className="text-slate-200">Account Type</Label>
          <Select
            value={selectedRole}
            onValueChange={(value) => setValue('role', value as any)}
          >
            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STUDENT">Student</SelectItem>
              <SelectItem value="LECTURER">Lecturer</SelectItem>
            </SelectContent>
          </Select>
          {errors.role && (
            <p className="text-sm text-red-400">{errors.role.message}</p>
          )}
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-slate-200">First Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                id="firstName"
                placeholder="First name"
                className={cn(
                  "pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400",
                  errors.firstName && "border-red-500"
                )}
                {...register('firstName')}
              />
            </div>
            {errors.firstName && (
              <p className="text-sm text-red-400">{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-slate-200">Last Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                id="lastName"
                placeholder="Last name"
                className={cn(
                  "pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400",
                  errors.lastName && "border-red-500"
                )}
                {...register('lastName')}
              />
            </div>
            {errors.lastName && (
              <p className="text-sm text-red-400">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-200">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              id="email"
              type="email"
              placeholder="your.email@university.edu"
              className={cn(
                "pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400",
                errors.email && "border-red-500"
              )}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-red-400">{errors.email.message}</p>
          )}
        </div>

        {/* Phone Number */}
        <div className="space-y-2">
          <Label htmlFor="phoneNumber" className="text-slate-200">Phone Number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="+62 812 3456 7890"
              className={cn(
                "pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400",
                errors.phoneNumber && "border-red-500"
              )}
              {...register('phoneNumber')}
            />
          </div>
          {errors.phoneNumber && (
            <p className="text-sm text-red-400">{errors.phoneNumber.message}</p>
          )}
        </div>

        {/* Student ID (for students) */}
        {selectedRole === 'STUDENT' && (
          <div className="space-y-2">
            <Label htmlFor="studentId" className="text-slate-200">Student ID</Label>
            <Input
              id="studentId"
              placeholder="2024001234"
              className={cn(
                "bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400",
                errors.studentId && "border-red-500"
              )}
              {...register('studentId')}
            />
            {errors.studentId && (
              <p className="text-sm text-red-400">{errors.studentId.message}</p>
            )}
          </div>
        )}

        {/* Department */}
        <div className="space-y-2">
          <Label className="text-slate-200">Department</Label>
          <Select
            value={watch('department')}
            onValueChange={(value) => setValue('department', value)}
          >
            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
              <Building className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Select your department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.department && (
            <p className="text-sm text-red-400">{errors.department.message}</p>
          )}
        </div>

        {/* Date of Birth */}
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth" className="text-slate-200">Date of Birth</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              id="dateOfBirth"
              type="date"
              className={cn(
                "pl-10 bg-slate-800/50 border-slate-700 text-white",
                errors.dateOfBirth && "border-red-500"
              )}
              {...register('dateOfBirth')}
            />
          </div>
          {errors.dateOfBirth && (
            <p className="text-sm text-red-400">{errors.dateOfBirth.message}</p>
          )}
        </div>

        {/* Password Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-200">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create password"
                className={cn(
                  "pl-10 pr-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400",
                  errors.password && "border-red-500"
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-slate-200">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                className={cn(
                  "pl-10 pr-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400",
                  errors.confirmPassword && "border-red-500"
                )}
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="flex items-start space-x-2">
          <Checkbox
            id="terms"
            checked={termsAccepted}
            onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
            className="border-slate-600 data-[state=checked]:bg-slate-600 data-[state=checked]:border-slate-600 mt-1"
          />
          <Label htmlFor="terms" className="text-sm text-slate-300 leading-relaxed">
            I agree to the{' '}
            <a href="/terms" className="text-slate-200 hover:text-white underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-slate-200 hover:text-white underline">
              Privacy Policy
            </a>
            , including consent to face data processing for attendance verification.
          </Label>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            type="submit"
            disabled={!isValid || !termsAccepted || isLoading}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <LoadingSpinner className="mr-2" />
                Processing...
              </>
            ) : (
              <>
                Continue to Document Upload
                <ArrowRight className="ml-2 w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}