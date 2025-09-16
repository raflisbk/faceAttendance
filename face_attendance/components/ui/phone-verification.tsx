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

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
              onKeyDown={handleKeyDown}
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