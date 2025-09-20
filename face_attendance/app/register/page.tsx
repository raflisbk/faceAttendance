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
import { UserPlus, Palette, Sparkles, Camera } from 'lucide-react'

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
    <div className="min-h-screen bg-blackboard text-white relative overflow-hidden p-4 flex items-center justify-center">
      {/* Artistic Blackboard Background */}
      <div className="absolute inset-0 bg-blackboard"></div>
      <div className="absolute inset-0 bg-blackboard-texture opacity-30"></div>
      <div className="absolute inset-0 bg-chalk-dust opacity-25"></div>
      <div className="absolute inset-0 bg-grid-chalk opacity-15"></div>

      {/* Floating Chalk Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full animate-pulse"
            style={{
              width: `${0.5 + Math.random() * 2}px`,
              height: `${0.5 + Math.random() * 2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: 0.2 + Math.random() * 0.5
            }}
          />
        ))}
      </div>

      {/* Decorative Corner Art */}
      <div className="absolute top-8 left-8 w-24 h-24 opacity-20">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path d="M20,20 Q50,10 80,20 Q90,50 80,80 Q50,90 20,80 Q10,50 20,20"
                stroke="white" strokeWidth="2" fill="none" strokeDasharray="10,5"
                className="animate-pulse" />
          <circle cx="50" cy="50" r="15" stroke="white" strokeWidth="1"
                  fill="none" strokeDasharray="5,5" className="animate-spin"
                  style={{animationDuration: '10s'}} />
        </svg>
      </div>
      <div className="absolute top-8 right-8 w-20 h-20 opacity-15">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <rect x="20" y="20" width="60" height="60" stroke="white"
                strokeWidth="2" fill="none" strokeDasharray="8,6"
                className="animate-pulse" style={{animationDelay: '1s'}} />
        </svg>
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Artistic Header */}
        <div className="text-center mb-12 relative">
          {/* Artist's easel icon */}
          <div className="relative inline-block mb-8">
            <div className="w-24 h-24 card-chalk flex items-center justify-center border-2 border-white/40 rounded-xl shadow-chalk animate-chalk-glow">
              <Palette className="w-10 h-10 text-white" />
            </div>
            {/* Chalk dust around icon */}
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-white/60 rounded-full animate-pulse"></div>
            <div className="absolute -bottom-3 -left-3 w-3 h-3 bg-white/40 rounded-full animate-pulse delay-500"></div>
            <div className="absolute top-3 right-10 w-2 h-2 bg-white/80 rounded-full animate-pulse delay-1000"></div>
            <div className="absolute bottom-5 left-8 w-1 h-1 bg-white/60 rounded-full animate-pulse delay-1500"></div>
          </div>

          {/* Hand-drawn title */}
          <h1 className="text-5xl md:text-6xl font-bold font-chalk text-chalk-drawn mb-6 animate-chalk-write">
            🎨 Join the Studio
          </h1>

          {/* Decorative underline */}
          <div className="flex justify-center items-center mb-6">
            <div className="w-20 h-px bg-white/60 rounded-full"></div>
            <Sparkles className="mx-4 w-6 h-6 text-white/70 animate-pulse" />
            <div className="w-20 h-px bg-white/60 rounded-full"></div>
          </div>

          <p className="text-white/80 font-chalk text-xl">
            Begin your artistic journey with our recognition canvas
          </p>
          <p className="text-white/60 font-chalk text-lg mt-2 italic">
            "Every masterpiece starts with a single brushstroke"
          </p>
        </div>

        {/* Artistic Progress Gallery */}
        <div className="mb-10 relative">
          {/* Gallery frame */}
          <div className="absolute -top-4 -left-4 -right-4 -bottom-4 border border-white/20 rounded-lg pointer-events-none"></div>
          <div className="bg-white/5 border border-white/30 rounded-lg p-6 backdrop-blur-sm">
            <h3 className="text-center font-chalk text-xl text-white/90 mb-6 flex items-center justify-center">
              <Camera className="mr-3 w-5 h-5" />
              Your Creative Journey
              <Camera className="ml-3 w-5 h-5" />
            </h3>
            <RegistrationProgress
              currentStep={currentStep}
              totalSteps={4}
              steps={steps}
            />
          </div>
        </div>

        {/* Artistic Canvas Content */}
        <Card className="card-chalk backdrop-blur-lg border-2 border-white/30 shadow-blackboard relative overflow-hidden">
          {/* Corner artistic elements */}
          <div className="absolute top-4 left-4 text-3xl opacity-60">
            🎨
          </div>
          <div className="absolute top-4 right-4 text-2xl opacity-40">
            ✨
          </div>
          <div className="absolute bottom-4 left-4 w-10 h-10 opacity-30">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <path d="M20,50 Q50,20 80,50 Q50,80 20,50" stroke="white"
                    strokeWidth="2" fill="none" strokeDasharray="8,4"
                    className="animate-pulse" />
            </svg>
          </div>
          <div className="absolute bottom-4 right-4 w-8 h-8 opacity-25">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="50" r="30" stroke="white" strokeWidth="2"
                      fill="none" strokeDasharray="6,6" className="animate-spin"
                      style={{animationDuration: '8s'}} />
            </svg>
          </div>

          <CardContent className="p-10 relative z-10">
            <div className="chalk-particles">
              {renderStep()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}