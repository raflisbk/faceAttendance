import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
      "bg-gray-200 dark:bg-gray-700",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "h-full w-full flex-1 bg-primary transition-all",
        "bg-gray-800 dark:bg-gray-300",
        // Blackboard theme - chalk-like progress
        "bg-gradient-to-r from-gray-600 to-gray-800 dark:from-gray-200 dark:to-gray-400",
        "shadow-sm"
      )}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

// Registration Progress Component
interface RegistrationProgressProps {
  currentStep: number
  totalSteps: number
  steps: string[]
  className?: string
}

const RegistrationProgress: React.FC<RegistrationProgressProps> = ({
  currentStep,
  totalSteps,
  steps,
  className
}) => {
  const progressPercentage = (currentStep / totalSteps) * 100

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Progress Bar */}
      <div className="relative">
        <Progress value={progressPercentage} className="h-2" />
        <div className="absolute -top-1 left-0 w-full flex justify-between">
          {Array.from({ length: totalSteps }, (_, index) => (
            <div
              key={index}
              className={cn(
                "w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center",
                index < currentStep
                  ? "border-gray-800 bg-gray-800 dark:border-gray-300 dark:bg-gray-300"
                  : index === currentStep - 1
                  ? "border-gray-600 bg-slate-600 dark:border-gray-400 dark:bg-slate-400"
                  : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
              )}
            >
              {index < currentStep && (
                <svg
                  className="w-2 h-2 text-white dark:text-gray-800"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Labels */}
      <div className="flex justify-between text-xs">
        {steps.map((step, index) => (
          <div
            key={index}
            className={cn(
              "text-center font-medium max-w-[80px]",
              index < currentStep
                ? "text-gray-800 dark:text-gray-200"
                : index === currentStep - 1
                ? "text-gray-600 dark:text-gray-400"
                : "text-gray-400 dark:text-gray-600"
            )}
          >
            {step}
          </div>
        ))}
      </div>

      {/* Current Step Info */}
      <div className="text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Step {currentStep} of {totalSteps}: {steps[currentStep - 1]}
        </p>
      </div>
    </div>
  )
}

export { Progress, RegistrationProgress }