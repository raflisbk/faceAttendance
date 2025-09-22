// app/register/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RegistrationProgress } from '@/components/ui/progress'
import { RegistrationStep1 } from './step-1'
import { RegistrationStep2 } from './step-2'
import { RegistrationStep3 } from './step-3'
import { RegistrationStep4 } from './step-4'
import { RegistrationComplete } from './complete'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserPlus, Palette, Sparkles, Camera, Home } from 'lucide-react'

export interface RegistrationData {
  step1?: any
  step2?: any
  step3?: any
  step4?: any
  registrationId?: string
}

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [registrationData, setRegistrationData] = useState<RegistrationData>({})
  const router = useRouter()

  const updateRegistrationData = (step: string, data: any) => {
    setRegistrationData(prev => ({
      ...prev,
      [step]: data,
      // Keep registrationId at top level
      ...(data.registrationId && { registrationId: data.registrationId })
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
    'Security Setup',
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
            step1Data={registrationData.step1}
          />
        )
      case 3:
        return (
          <RegistrationStep3
            onNext={(data) => handleStepComplete(3, data)}
            onBack={handleBackStep}
            {...(registrationData.registrationId && { registrationId: registrationData.registrationId })}
            initialData={registrationData.step3}
            step1Data={registrationData.step1}
            step2Data={registrationData.step2}
          />
        )
      case 4:
        return (
          <RegistrationStep4
            onNext={(data) => handleStepComplete(4, data)}
            onBack={handleBackStep}
            {...(registrationData.registrationId && { registrationId: registrationData.registrationId })}
            initialData={registrationData.step4}
            step1Data={registrationData.step1}
            step2Data={registrationData.step2}
            step3Data={registrationData.step3}
          />
        )
      case 5:
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
    <div className="min-h-screen pixel-bg">
      {/* Header Area */}
      <div className="relative">
        {/* Header with FaceAttend text */}
        <div className="flex items-center justify-between h-20 px-12">
          <Link href="/" className="no-underline">
            <h1 className="heading-pixel-2 hover-pixel cursor-pointer mb-0">FaceAttend</h1>
          </Link>
          <h1 className="heading-pixel-2 mb-0">Join the System</h1>
        </div>

        {/* Header Separator */}
        <div className="w-full h-px bg-white pixel-shadow"></div>
      </div>

      <div className="relative overflow-hidden space-pixel-md flex items-center justify-center" style={{minHeight: 'calc(100vh - 5rem)', paddingTop: '2rem'}}>
        {/* Main Content */}

      {/* Pixel Background */}

      {/* Pixel Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => {
          // Use deterministic values based on index to avoid hydration mismatch
          const left = (i * 37 + 23) % 100; // Pseudo-random but deterministic
          const top = (i * 43 + 17) % 100;
          const delay = (i * 0.15) % 3;

          return (
            <div
              key={i}
              className="absolute bg-foreground animate-pixel-blink"
              style={{
                width: '2px',
                height: '2px',
                left: `${left}%`,
                top: `${top}%`,
                animationDelay: `${delay}s`,
                opacity: 0.3
              }}
            />
          );
        })}
      </div>

      {/* Pixel Corner Decorations */}
      <div className="absolute top-8 left-8 w-16 h-16 opacity-30">
        <div className="grid grid-cols-4 gap-1 w-full h-full">
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className="bg-foreground animate-pixel-blink"
              style={{
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
        </div>
      </div>
      <div className="absolute top-8 right-8 w-12 h-12 opacity-20">
        <div className="border-2 border-foreground w-full h-full pixel-border"></div>
      </div>

      <div className="relative w-full max-w-2xl container-pixel">
        {/* Welcome Section */}
        <div className="text-center space-pixel-lg relative">
          {/* Main welcome message */}
          <div className="space-pixel-lg">
            <h2 className="heading-pixel-1 space-pixel-sm animate-pixel-fade">
              Begin Your Journey
            </h2>
            <p className="text-pixel space-pixel-md">
              with our recognition system
            </p>
          </div>
        </div>

        {/* Registration Progress */}
        <div className="space-pixel-lg relative">
          <div className="pixel-card space-pixel-lg">
            <div className="text-center space-pixel-md">
              <h3 className="heading-pixel-2 space-pixel-sm">
                Registration Progress
              </h3>
              <p className="text-pixel-small text-muted-foreground">
                Complete each step to join our system
              </p>
            </div>
            <RegistrationProgress
              currentStep={currentStep}
              totalSteps={5}
              steps={steps}
            />
          </div>
        </div>

        {/* Pixel Content */}
        <Card className="pixel-card hover-pixel relative overflow-hidden">
          {/* Corner pixel elements */}
          <div className="absolute top-pixel-sm left-pixel-sm w-pixel h-pixel bg-foreground opacity-30"></div>
          <div className="absolute top-pixel-sm right-pixel-sm w-pixel h-pixel bg-foreground opacity-20"></div>
          <div className="absolute bottom-pixel-sm left-pixel-sm w-pixel h-pixel bg-foreground opacity-20"></div>
          <div className="absolute bottom-pixel-sm right-pixel-sm w-pixel-md h-pixel-md bg-foreground opacity-25"></div>

          <CardContent className="space-pixel-lg relative">
            {renderStep()}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}