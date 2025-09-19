'use client'

import { Button } from '@/components/ui/button'

interface RegistrationStep3Props {
  onNext: (data: any) => void
  onBack: () => void
  registrationId?: string
  initialData?: any
}

export function RegistrationStep3({ onNext, onBack }: RegistrationStep3Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Face Enrollment</h2>
      <p className="text-slate-400">Component in development...</p>
      <div className="flex gap-4">
        <Button
          onClick={onBack}
          variant="outline"
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={() => onNext({ placeholder: true })}
          className="flex-1"
        >
          Complete
        </Button>
      </div>
    </div>
  )
}