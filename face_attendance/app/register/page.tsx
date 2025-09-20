// app/register/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RegistrationProgress } from '@/components/ui/progress'
import { RegistrationStep1 } from './step-1'
import { RegistrationStep2 } from './step-2'
import { RegistrationStep3 } from './step-3'
import { RegistrationComplete } from './complete'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserPlus, Palette, Sparkles, Camera, Home } from 'lucide-react'

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
    <div className="min-h-screen pixel-bg relative overflow-hidden space-pixel-md flex items-center justify-center">
      {/* Home Button */}
      <Link href="/" className="absolute top-pixel-md right-pixel-md z-50">
        <Button variant="outline" size="sm" className="btn-pixel gap-pixel-xs">
          <Home className="w-pixel h-pixel" />
          Home
        </Button>
      </Link>

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
        {/* Pixel Header */}
        <div className="text-center space-pixel-lg relative">
          {/* Pixel icon */}
          <div className="relative inline-block space-pixel-lg">
            <div className="w-24 h-24 pixel-card flex items-center justify-center pixel-shadow hover-pixel">
              <Palette className="w-10 h-10 text-foreground" />
            </div>
            {/* Pixel particles around icon */}
            <div className="absolute -top-2 -right-2 w-2 h-2 bg-foreground animate-pixel-blink"></div>
            <div className="absolute -bottom-3 -left-3 w-2 h-2 bg-foreground animate-pixel-blink" style={{animationDelay: '0.5s'}}></div>
            <div className="absolute top-3 right-10 w-2 h-2 bg-foreground animate-pixel-blink" style={{animationDelay: '1s'}}></div>
            <div className="absolute bottom-5 left-8 w-2 h-2 bg-foreground animate-pixel-blink" style={{animationDelay: '1.5s'}}></div>
          </div>

          {/* Pixel title */}
          <h1 className="heading-pixel-1 space-pixel-md animate-pixel-fade">
            Join the System
          </h1>

          {/* Pixel decorative line */}
          <div className="flex justify-center items-center space-pixel-md">
            <div className="w-20 h-px bg-foreground"></div>
            <Sparkles className="mx-4 w-6 h-6 text-foreground animate-pixel-blink" />
            <div className="w-20 h-px bg-foreground"></div>
          </div>

          <p className="text-pixel">
            Begin your journey with our recognition system
          </p>
          <p className="text-pixel-small text-muted-foreground margin-pixel-xs">
            "Every journey starts with a single step"
          </p>
        </div>

        {/* Pixel Progress */}
        <div className="space-pixel-lg relative">
          {/* Pixel frame */}
          <div className="absolute -top-4 -left-4 -right-4 -bottom-4 border border-border pointer-events-none"></div>
          <div className="pixel-card space-pixel-md">
            <h3 className="text-center heading-pixel-3 space-pixel-md flex items-center justify-center">
              <Camera className="mr-3 w-5 h-5" />
              Your Registration Journey
              <Camera className="ml-3 w-5 h-5" />
            </h3>
            <RegistrationProgress
              currentStep={currentStep}
              totalSteps={4}
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
  )
}