'use client'

import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'

interface RegistrationCompleteProps {
  registrationData: any
  onComplete: () => void
}

export function RegistrationComplete({ registrationData, onComplete }: RegistrationCompleteProps) {
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <CheckCircle className="w-16 h-16 text-green-500" />
      </div>
      <h2 className="text-xl font-semibold text-white">Registration Complete!</h2>
      <p className="text-slate-400">Your account has been created successfully.</p>
      <Button
        onClick={onComplete}
        className="w-full"
      >
        Go to Login
      </Button>
    </div>
  )
}