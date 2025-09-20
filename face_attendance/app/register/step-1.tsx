'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  IdentificationIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

const step1Schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  studentId: z.string().min(3, 'Student ID is required'),
  role: z.enum(['STUDENT', 'LECTURER'], {
    required_error: 'Please select a role'
  })
})

type Step1FormData = z.infer<typeof step1Schema>

interface RegistrationStep1Props {
  onNext: (data: Step1FormData) => void
  initialData?: Partial<Step1FormData>
}

export function RegistrationStep1({ onNext, initialData }: RegistrationStep1Props) {
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid }
  } = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    mode: 'onChange',
    defaultValues: initialData
  })

  const selectedRole = watch('role')

  const onSubmit = async (data: Step1FormData) => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    onNext(data)
    setIsLoading(false)
  }

  return (
    <div className="space-y-8">
      {/* Step Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="heading-2">Personal Information</h2>
            <p className="text-muted">Step 1 of 4</p>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div className="bg-blue-600 h-2 rounded-full w-1/4 transition-all duration-300"></div>
        </div>
      </div>

      {/* Form Card */}
      <Card className="enterprise-card">
        <CardHeader>
          <CardTitle className="text-xl text-gray-900 flex items-center">
            <CheckCircleIcon className="w-6 h-6 mr-2 text-blue-600" />
            Basic Information
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Full Name
              </Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  className={cn(
                    "input-field pl-10",
                    errors.name && "border-red-300 focus:border-red-500 focus:ring-red-500"
                  )}
                  {...register('name')}
                />
              </div>
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </Label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
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

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Phone Number
              </Label>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  className={cn(
                    "input-field pl-10",
                    errors.phone && "border-red-300 focus:border-red-500 focus:ring-red-500"
                  )}
                  {...register('phone')}
                />
              </div>
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Account Type
              </Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setValue('role', value as 'STUDENT' | 'LECTURER')}
              >
                <SelectTrigger className={cn(
                  "input-field",
                  errors.role && "border-red-300 focus:border-red-500 focus:ring-red-500"
                )}>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Student</SelectItem>
                  <SelectItem value="LECTURER">Lecturer</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>

            {/* Student/Staff ID */}
            <div className="space-y-2">
              <Label htmlFor="studentId" className="text-sm font-medium text-gray-700">
                {selectedRole === 'LECTURER' ? 'Staff ID' : 'Student ID'}
              </Label>
              <div className="relative">
                <IdentificationIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="studentId"
                  type="text"
                  placeholder={`Enter your ${selectedRole === 'LECTURER' ? 'staff' : 'student'} ID`}
                  className={cn(
                    "input-field pl-10",
                    errors.studentId && "border-red-300 focus:border-red-500 focus:ring-red-500"
                  )}
                  {...register('studentId')}
                />
              </div>
              {errors.studentId && (
                <p className="text-sm text-red-600">{errors.studentId.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                disabled={!isValid || isLoading}
                className="btn-primary w-full group"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    Continue to Security Setup
                    <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Help Text */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          Make sure all information is accurate. You can update it later in your profile settings.
        </p>
      </div>
    </div>
  )
}