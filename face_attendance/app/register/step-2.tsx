'use client'

import { Button } from '@/components/ui/button'

interface RegistrationStep2Props {
  onNext: (data: any) => void
  onBack: () => void
  registrationId?: string
  initialData?: any
}

export function RegistrationStep2({ onNext, onBack, registrationId, initialData }: RegistrationStep2Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Document Upload</h2>
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
          Continue
        </Button>
      </div>
    </div>
  )
}