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
            {...(registrationData.registrationId && { registrationId: registrationData.registrationId })}
            initialData={registrationData.step2}
          />
        )
      case 3:
        return (
          <RegistrationStep3
            onNext={(data) => handleStepComplete(3, data)}
            onBack={handleBackStep}
            {...(registrationData.registrationId && { registrationId: registrationData.registrationId })}
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