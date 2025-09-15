// components/ui/email-verification.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Mail, CheckCircle, RefreshCw, AlertCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { cn } from '@/lib/utils'

interface EmailVerificationProps {
  email: string
  isVerified?: boolean
  onVerificationComplete?: (code: string) => Promise<boolean>
  onResendCode?: () => Promise<void>
  className?: string
}

export function EmailVerification({
  email,
  isVerified = false,
  onVerificationComplete,
  onResendCode,
  className
}: EmailVerificationProps) {
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Countdown timer for resend button
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code')
      return
    }

    setIsVerifying(true)
    setError(null)

    try {
      const isValid = await onVerificationComplete?.(verificationCode)
      if (isValid) {
        setSuccess(true)
        setVerificationCode('')
      } else {
        setError('Invalid verification code. Please try again.')
      }
    } catch (err) {
      setError('Verification failed. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    setIsResending(true)
    setError(null)

    try {
      await onResendCode?.()
      setCountdown(60) // 60 seconds cooldown
      setVerificationCode('')
    } catch (err) {
      setError('Failed to resend verification code. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  const handleCodeChange = (value: string) => {
    // Only allow numbers and limit to 6 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 6)
    setVerificationCode(numericValue)
    setError(null)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && verificationCode.length === 6) {
      handleVerify()
    }
  }

  if (isVerified || success) {
    return (
      <Card className={cn("w-full border-green-200 dark:border-green-800", className)}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-medium text-green-700 dark:text-green-300">
                Email Verified Successfully
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                {email} has been verified
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email Verification
        </CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          We've sent a verification code to <strong>{email}</strong>
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Verification Code Input */}
        <div className="space-y-2">
          <Label htmlFor="verification-code">Enter 6-digit verification code</Label>
          <div className="flex gap-2">
            <Input
              id="verification-code"
              value={verificationCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="123456"
              className="text-center text-lg font-mono tracking-widest"
              maxLength={6}
              disabled={isVerifying}
            />
            <Button
              onClick={handleVerify}
              disabled={verificationCode.length !== 6 || isVerifying}
              variant="chalk"
            >
              {isVerifying ? <LoadingSpinner size="sm" /> : 'Verify'}
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Resend Code */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div>
            <p className="text-sm font-medium">Didn't receive the code?</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Check your spam folder or request a new code
            </p>
          </div>
          
          <Button
            onClick={handleResend}
            disabled={countdown > 0 || isResending}
            variant="chalkOutline"
            size="sm"
          >
            {isResending ? (
              <LoadingSpinner size="sm" />
            ) : countdown > 0 ? (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{countdown}s</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                <span>Resend Code</span>
              </div>
            )}
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <p>• Enter the 6-digit code sent to your email</p>
          <p>• The code expires in 10 minutes</p>
          <p>• Make sure to check your spam/junk folder</p>
        </div>
      </CardContent>
    </Card>
  )
}

// components/ui/phone-verification.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Phone, CheckCircle, RefreshCw, AlertCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { cn } from '@/lib/utils'

interface PhoneVerificationProps {
  phoneNumber: string
  isVerified?: boolean
  onVerificationComplete?: (code: string) => Promise<boolean>
  onResendCode?: () => Promise<void>
  className?: string
}

export function PhoneVerification({
  phoneNumber,
  isVerified = false,
  onVerificationComplete,
  onResendCode,
  className
}: PhoneVerificationProps) {
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Countdown timer for resend button
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code')
      return
    }

    setIsVerifying(true)
    setError(null)

    try {
      const isValid = await onVerificationComplete?.(verificationCode)
      if (isValid) {
        setSuccess(true)
        setVerificationCode('')
      } else {
        setError('Invalid verification code. Please try again.')
      }
    } catch (err) {
      setError('Verification failed. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    setIsResending(true)
    setError(null)

    try {
      await onResendCode?.()
      setCountdown(60) // 60 seconds cooldown
      setVerificationCode('')
    } catch (err) {
      setError('Failed to resend verification code. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  const handleCodeChange = (value: string) => {
    // Only allow numbers and limit to 6 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 6)
    setVerificationCode(numericValue)
    setError(null)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && verificationCode.length === 6) {
      handleVerify()
    }
  }

  const formatPhoneNumber = (phone: string) => {
    // Format phone number for display (e.g., +62 812-3456-7890)
    if (phone.startsWith('+62')) {
      const number = phone.slice(3)
      return `+62 ${number.slice(0, 3)}-${number.slice(3, 7)}-${number.slice(7)}`
    }
    return phone
  }

  if (isVerified || success) {
    return (
      <Card className={cn("w-full border-green-200 dark:border-green-800", className)}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-medium text-green-700 dark:text-green-300">
                Phone Number Verified Successfully
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                {formatPhoneNumber(phoneNumber)} has been verified
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Phone Verification
        </CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          We've sent a verification code via SMS to <strong>{formatPhoneNumber(phoneNumber)}</strong>
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Verification Code Input */}
        <div className="space-y-2">
          <Label htmlFor="sms-verification-code">Enter 6-digit SMS code</Label>
          <div className="flex gap-2">
            <Input
              id="sms-verification-code"
              value={verificationCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="123456"
              className="text-center text-lg font-mono tracking-widest"
              maxLength={6}
              disabled={isVerifying}
            />
            <Button
              onClick={handleVerify}
              disabled={verificationCode.length !== 6 || isVerifying}
              variant="chalk"
            >
              {isVerifying ? <LoadingSpinner size="sm" /> : 'Verify'}
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Resend Code */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div>
            <p className="text-sm font-medium">Didn't receive the SMS?</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Make sure your phone has signal and try again
            </p>
          </div>
          
          <Button
            onClick={handleResend}
            disabled={countdown > 0 || isResending}
            variant="chalkOutline"
            size="sm"
          >
            {isResending ? (
              <LoadingSpinner size="sm" />
            ) : countdown > 0 ? (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{countdown}s</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                <span>Resend SMS</span>
              </div>
            )}
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <p>• Enter the 6-digit code sent via SMS</p>
          <p>• The code expires in 5 minutes</p>
          <p>• Standard SMS rates may apply</p>
        </div>
      </CardContent>
    </Card>
  )
}

// components/ui/registration-complete.tsx
'use client'

import React from 'react'
import { CheckCircle, Clock, Mail, Phone, FileText, User, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RegistrationStep {
  id: string
  name: string
  status: 'completed' | 'pending' | 'failed'
  completedAt?: Date
  description: string
}

interface RegistrationCompleteProps {
  userInfo: {
    name: string
    email: string
    phoneNumber: string
    role: 'STUDENT' | 'LECTURER'
    studentId?: string
    staffId?: string
  }
  steps: RegistrationStep[]
  approvalStatus: 'pending' | 'approved' | 'rejected'
  estimatedApprovalTime?: string
  onContinueToLogin?: () => void
  onGoToDashboard?: () => void
  className?: string
}

export function RegistrationComplete({
  userInfo,
  steps,
  approvalStatus,
  estimatedApprovalTime = '24-48 hours',
  onContinueToLogin,
  onGoToDashboard,
  className
}: RegistrationCompleteProps) {
  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
      case 'pending': return <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
      case 'failed': return <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />
      default: return <Clock className="w-5 h-5 text-slate-400" />
    }
  }

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-700 dark:text-green-300'
      case 'pending': return 'text-yellow-700 dark:text-yellow-300'
      case 'failed': return 'text-red-700 dark:text-red-300'
      default: return 'text-slate-600 dark:text-slate-400'
    }
  }

  const completedSteps = steps.filter(step => step.status === 'completed').length
  const totalSteps = steps.length

  return (
    <div className={cn("max-w-4xl mx-auto space-y-6", className)}>
      {/* Success Header */}
      <Card className="border-green-200 dark:border-green-800">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-green-700 dark:text-green-300 mb-2">
            Registration Completed Successfully!
          </h1>
          
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Thank you for registering, <strong>{userInfo.name}</strong>. 
            Your account has been created and is now pending approval.
          </p>

          <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span>{completedSteps} of {totalSteps} steps completed</span>
            <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registration Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Your Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Full Name</Label>
                <p className="text-slate-600 dark:text-slate-400">{userInfo.name}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Email Address</Label>
                <p className="text-slate-600 dark:text-slate-400">{userInfo.email}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Phone Number</Label>
                <p className="text-slate-600 dark:text-slate-400">{userInfo.phoneNumber}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Role</Label>
                <p className="text-slate-600 dark:text-slate-400">
                  {userInfo.role === 'STUDENT' ? 'Student' : 'Lecturer'}
                </p>
              </div>
              
              {userInfo.studentId && (
                <div>
                  <Label className="text-sm font-medium">Student ID</Label>
                  <p className="text-slate-600 dark:text-slate-400">{userInfo.studentId}</p>
                </div>
              )}
              
              {userInfo.staffId && (
                <div>
                  <Label className="text-sm font-medium">Staff ID</Label>
                  <p className="text-slate-600 dark:text-slate-400">{userInfo.staffId}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Registration Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Registration Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getStepIcon(step.status)}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className={cn("font-medium", getStepColor(step.status))}>
                      {step.name}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {step.description}
                    </p>
                    {step.completedAt && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Completed {new Date(step.completedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approval Status */}
      <Card className={cn(
        approvalStatus === 'pending' ? 'border-yellow-200 dark:border-yellow-800' :
        approvalStatus === 'approved' ? 'border-green-200 dark:border-green-800' :
        'border-red-200 dark:border-red-800'
      )}>
        <CardContent className="p-6">
          {approvalStatus === 'pending' && (
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              
              <h3 className="text-lg font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                Pending Admin Approval
              </h3>
              
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Your registration is now under review by our administrators. 
                You'll receive an email notification once your account is approved.
              </p>
              
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Estimated approval time: <strong>{estimatedApprovalTime}</strong>
              </p>
            </div>
          )}

          {approvalStatus === 'approved' && (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              
              <h3 className="text-lg font-medium text-green-700 dark:text-green-300 mb-2">
                Account Approved!
              </h3>
              
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Congratulations! Your account has been approved. 
                You can now access the attendance system.
              </p>
              
              <Button onClick={onGoToDashboard} variant="chalk" size="lg">
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>What's Next?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-1" />
              <div>
                <h4 className="font-medium">Check Your Email</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  We'll send you an email notification when your account is approved
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-green-600 dark:text-green-400 mt-1" />
              <div>
                <h4 className="font-medium">SMS Notifications</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Important updates will also be sent to your verified phone number
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-1" />
              <div>
                <h4 className="font-medium">Profile Setup</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Once approved, you can complete your profile and start using the system
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        {approvalStatus !== 'approved' && (
          <Button onClick={onContinueToLogin} variant="chalk">
            Continue to Login
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
        
        <Button variant="chalkOutline">
          Contact Support
        </Button>
      </div>
    </div>
  )
}