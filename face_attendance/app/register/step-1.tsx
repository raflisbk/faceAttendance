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
  ArrowRightIcon
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
    formState: { errors, isValid, isDirty }
  } = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    mode: 'onChange',
    defaultValues: initialData
  })

  const selectedRole = watch('role')

  const onSubmit = async (data: Step1FormData) => {
    setIsLoading(true)

    try {
      // Create user account
      const response = await fetch('/api/registration/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create account')
      }

      // Pass registration data to next step
      const dataWithRegistrationId = {
        ...data,
        registrationId: result.registrationId,
        registrationData: result.data
      }

      onNext(dataWithRegistrationId)

    } catch (error) {
      console.error('Registration error:', error)
      // You could add a toast notification here if needed
      alert(error instanceof Error ? error.message : 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Step Header */}
      <div className="text-center space-pixel-lg">
        <h2 className="heading-pixel-1">Personal Information</h2>
        <p className="text-pixel">Step 1 of 4 - Enter your basic details</p>
      </div>

      {/* Form Card */}
      <Card className="enterprise-card">
        <CardHeader>
          <CardTitle className="heading-pixel-3">
            Basic Information
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-pixel">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                className={cn(
                  "input-pixel",
                  errors.name && "border-destructive focus:border-destructive focus:ring-destructive"
                )}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-pixel-small text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-pixel">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                className={cn(
                  "input-pixel",
                  errors.email && "border-destructive focus:border-destructive focus:ring-destructive"
                )}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-pixel-small text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-pixel">
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                className={cn(
                  "input-pixel",
                  errors.phone && "border-destructive focus:border-destructive focus:ring-destructive"
                )}
                {...register('phone')}
              />
              {errors.phone && (
                <p className="text-pixel-small text-destructive">{errors.phone.message}</p>
              )}
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label className="text-pixel">
                Account Type
              </Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setValue('role', value as 'STUDENT' | 'LECTURER', { shouldValidate: true })}
              >
                <SelectTrigger className={cn(
                  "input-pixel",
                  errors.role && "border-destructive focus:border-destructive focus:ring-destructive"
                )}>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Student</SelectItem>
                  <SelectItem value="LECTURER">Lecturer</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-pixel-small text-destructive">{errors.role.message}</p>
              )}
            </div>

            {/* Student/Staff ID */}
            <div className="space-y-2">
              <Label htmlFor="studentId" className="text-pixel">
                {selectedRole === 'LECTURER' ? 'Staff ID' : 'Student ID'}
              </Label>
              <Input
                id="studentId"
                type="text"
                placeholder={`Enter your ${selectedRole === 'LECTURER' ? 'staff' : 'student'} ID`}
                className={cn(
                  "input-pixel",
                  errors.studentId && "border-destructive focus:border-destructive focus:ring-destructive"
                )}
                {...register('studentId')}
              />
              {errors.studentId && (
                <p className="text-pixel-small text-destructive">{errors.studentId.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="btn-pixel w-full group"
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
        <p className="text-pixel-small text-muted-foreground">
          Make sure all information is accurate. You can update it later in your profile settings.
        </p>
      </div>
    </div>
  )
}

export default RegistrationStep1