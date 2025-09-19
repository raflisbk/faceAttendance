'use client'

import { Button } from '@/components/ui/button'

interface RegistrationStep1Props {
  onNext: (data: any) => void
  initialData?: any
}

export function RegistrationStep1({ onNext }: RegistrationStep1Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Basic Information</h2>
      <p className="text-slate-400">Component in development...</p>
      <Button
        onClick={() => onNext({ placeholder: true })}
        className="w-full"
      >
        Continue
      </Button>
    </div>
  )
}