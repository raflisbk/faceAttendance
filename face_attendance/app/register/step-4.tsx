'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, ArrowLeft, ArrowRight, Shield, AlertTriangle, CheckCircle } from 'lucide-react'
import { usePixelToast, PixelToastContainer } from '@/components/ui/pixel-toast'

interface PasswordSetupData {
  password: string
  confirmPassword: string
  hasAcceptedTerms: boolean
}

interface RegistrationStep4Props {
  onNext: (data: PasswordSetupData) => void
  onBack: () => void
  registrationId?: string
  initialData?: PasswordSetupData
  step1Data?: any
  step2Data?: any
  step3Data?: any
}

export function RegistrationStep4({
  onNext,
  onBack,
  registrationId,
  initialData,
  step1Data,
  step2Data,
  step3Data
}: RegistrationStep4Props) {
  const [password, setPassword] = useState(initialData?.password || '')
  const [confirmPassword, setConfirmPassword] = useState(initialData?.confirmPassword || '')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(initialData?.hasAcceptedTerms || false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toast = usePixelToast()

  // Password validation
  const passwordRequirements = [
    { label: 'At least 8 characters', check: password.length >= 8 },
    { label: 'Contains uppercase letter', check: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', check: /[a-z]/.test(password) },
    { label: 'Contains number', check: /\d/.test(password) },
    { label: 'Contains special character', check: /[!@#$%^&*(),.?":{}|<>]/.test(password) }
  ]

  const isPasswordValid = passwordRequirements.every(req => req.check)
  const passwordsMatch = password === confirmPassword && password.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isPasswordValid) {
      setError('Please ensure your password meets all requirements')
      toast.error('Invalid password', 'Please check password requirements')
      return
    }

    if (!passwordsMatch) {
      setError('Passwords do not match')
      toast.error('Password mismatch', 'Please ensure both passwords match')
      return
    }

    if (!hasAcceptedTerms) {
      setError('Please accept the terms and conditions to continue')
      toast.error('Terms required', 'Please accept terms and conditions')
      return
    }

    setIsProcessing(true)

    try {
      const passwordData: PasswordSetupData = {
        password,
        confirmPassword,
        hasAcceptedTerms
      }

      toast.success('Password setup completed!', 'Security Setup')
      onNext(passwordData)

    } catch (error) {
      console.error('Password setup error:', error)
      setError('Failed to setup password. Please try again.')
      toast.error('Setup failed', 'Please try again')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <PixelToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      <div className="space-y-8">
        <div className="text-center space-pixel-lg">
          <h2 className="heading-pixel-1">Security Setup</h2>
          <p className="text-pixel">Step 4 of 5 - Create your account password</p>
        </div>

        {error && (
          <Alert variant="destructive" className="pixel-frame">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-pixel-small">{error}</AlertDescription>
          </Alert>
        )}

        <Card className="pixel-card hover-pixel">
          <CardHeader>
            <CardTitle className="heading-pixel-3 flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              Password Creation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Password Input */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-pixel font-medium">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-pixel w-full pr-10"
                    placeholder="Enter a strong password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-pixel font-medium">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-pixel w-full pr-10"
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-pixel-small text-red-500">Passwords do not match</p>
                )}
                {confirmPassword && passwordsMatch && (
                  <p className="text-pixel-small text-green-500 flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Passwords match
                  </p>
                )}
              </div>

              {/* Password Requirements */}
              <div className="space-y-3">
                <h4 className="text-pixel font-medium">Password Requirements:</h4>
                <div className="grid grid-cols-1 gap-2">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        req.check ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                      <span className={`text-pixel-small ${
                        req.check ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={hasAcceptedTerms}
                    onChange={(e) => setHasAcceptedTerms(e.target.checked)}
                    className="mt-1"
                    required
                  />
                  <label htmlFor="terms" className="text-pixel-small text-gray-600">
                    I agree to the{' '}
                    <a href="/terms" className="text-blue-600 hover:underline" target="_blank">
                      Terms and Conditions
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" className="text-blue-600 hover:underline" target="_blank">
                      Privacy Policy
                    </a>
                  </label>
                </div>
              </div>

              {/* User Information Summary */}
              {step1Data && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="text-pixel font-medium mb-2">Account Summary:</h4>
                  <div className="text-pixel-small space-y-1">
                    <p><strong>Name:</strong> {step1Data.name}</p>
                    <p><strong>Email:</strong> {step1Data.email}</p>
                    <p><strong>Role:</strong> {step1Data.role}</p>
                    <p><strong>ID:</strong> {step1Data.studentId}</p>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  onClick={onBack}
                  variant="outline"
                  className="btn-pixel flex-1"
                  disabled={isProcessing}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Face Enrollment
                </Button>
                <Button
                  type="submit"
                  disabled={!isPasswordValid || !passwordsMatch || !hasAcceptedTerms || isProcessing}
                  className="btn-pixel flex-1"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      Complete Registration
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-pixel-small text-muted-foreground">
            Your password will be securely encrypted and stored. Make sure to remember it for future logins.
          </p>
        </div>
      </div>
    </>
  )
}

export default RegistrationStep4