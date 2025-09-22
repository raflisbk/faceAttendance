'use client'

import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'

interface RegistrationCompleteProps {
  registrationData: any
  onComplete: () => void
}

export function RegistrationComplete({ registrationData, onComplete }: RegistrationCompleteProps) {
  const [isCompleting, setIsCompleting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Automatically complete registration when component mounts
    completeRegistration()
  }, [])

  const completeRegistration = async () => {
    setIsCompleting(true)
    setError(null)

    try {
      console.log('Starting registration completion with data:', {
        registrationId: registrationData.registrationId,
        hasStep1: !!registrationData.step1,
        hasStep2: !!registrationData.step2,
        hasStep3: !!registrationData.step3,
        hasStep4: !!registrationData.step4
      })

      const response = await fetch('/api/registration/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registrationId: registrationData.registrationId,
          step1Data: registrationData.step1,
          step2Data: registrationData.step2,
          step3Data: registrationData.step3,
          step4Data: registrationData.step4
        }),
      })

      console.log('Registration API response status:', response.status)
      const result = await response.json()
      console.log('Registration API response data:', result)

      if (!response.ok) {
        throw new Error(result.error || 'Failed to complete registration')
      }

      console.log('Registration completed successfully!')
      setIsCompleted(true)
    } catch (error) {
      console.error('Registration completion error:', error)
      setError(error instanceof Error ? error.message : 'Failed to complete registration')
    } finally {
      setIsCompleting(false)
    }
  }

  if (isCompleting) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
        </div>
        <h2 className="text-xl font-semibold text-white">Completing Registration...</h2>
        <p className="text-slate-400">Please wait while we create your account.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-red-500 text-2xl">⚠</span>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-white">Registration Failed</h2>
        <p className="text-red-400">{error}</p>
        <Button
          onClick={completeRegistration}
          className="w-full"
          disabled={isCompleting}
        >
          Try Again
        </Button>
      </div>
    )
  }

  if (isCompleted) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
        <h2 className="text-xl font-semibold text-white">Registration Complete!</h2>
        <p className="text-slate-400">Your account has been created successfully with secure password! You can now login to access the system.</p>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">
            ✅ Account created with password<br/>
            ✅ Face enrollment completed<br/>
            ✅ Documents uploaded<br/>
            🔄 Pending admin verification
          </p>
        </div>
        <Button
          onClick={onComplete}
          className="w-full"
        >
          Login to Your Account
        </Button>
      </div>
    )
  }

  return null
}