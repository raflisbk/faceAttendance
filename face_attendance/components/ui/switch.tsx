// components/ui/switch.tsx
"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const switchVariants = cva(
  "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-950",
  {
    variants: {
      variant: {
        default: 
          "data-[state=checked]:bg-slate-900 data-[state=unchecked]:bg-slate-200 focus-visible:ring-slate-950 dark:data-[state=checked]:bg-slate-50 dark:data-[state=unchecked]:bg-slate-800 dark:focus-visible:ring-slate-300",
        chalk:
          "data-[state=checked]:bg-slate-700 data-[state=unchecked]:bg-slate-300 focus-visible:ring-slate-700 dark:data-[state=checked]:bg-slate-400 dark:data-[state=unchecked]:bg-slate-700 dark:focus-visible:ring-slate-400",
        success:
          "data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-slate-200 focus-visible:ring-green-600 dark:data-[state=checked]:bg-green-500 dark:data-[state=unchecked]:bg-slate-800 dark:focus-visible:ring-green-500",
        warning:
          "data-[state=checked]:bg-yellow-600 data-[state=unchecked]:bg-slate-200 focus-visible:ring-yellow-600 dark:data-[state=checked]:bg-yellow-500 dark:data-[state=unchecked]:bg-slate-800 dark:focus-visible:ring-yellow-500",
        destructive:
          "data-[state=checked]:bg-red-600 data-[state=unchecked]:bg-slate-200 focus-visible:ring-red-600 dark:data-[state=checked]:bg-red-500 dark:data-[state=unchecked]:bg-slate-800 dark:focus-visible:ring-red-500",
        info:
          "data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-200 focus-visible:ring-blue-600 dark:data-[state=checked]:bg-blue-500 dark:data-[state=unchecked]:bg-slate-800 dark:focus-visible:ring-blue-500"
      },
      size: {
        default: "h-6 w-11",
        sm: "h-5 w-9",
        lg: "h-7 w-13",
        xl: "h-8 w-15"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

const switchThumbVariants = cva(
  "pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform",
  {
    variants: {
      size: {
        default: "h-5 w-5 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        sm: "h-4 w-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
        lg: "h-6 w-6 data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-0", 
        xl: "h-7 w-7 data-[state=checked]:translate-x-7 data-[state=unchecked]:translate-x-0"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
)

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>,
    VariantProps<typeof switchVariants> {
  label?: string
  description?: string
  error?: string
  required?: boolean
  onIcon?: React.ReactNode
  offIcon?: React.ReactNode
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ 
  className, 
  variant, 
  size, 
  label, 
  description, 
  error, 
  required,
  onIcon,
  offIcon,
  checked,
  onCheckedChange,
  ...props 
}, ref) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-3">
        <SwitchPrimitives.Root
          className={cn(switchVariants({ variant, size }), className)}
          ref={ref}
          checked={checked}
          onCheckedChange={onCheckedChange}
          {...props}
        >
          <SwitchPrimitives.Thumb
            className={cn(
              switchThumbVariants({ size }),
              "bg-white dark:bg-slate-950 relative"
            )}
          >
            {/* Icons inside the thumb */}
            {(onIcon || offIcon) && (
              <div className="absolute inset-0 flex items-center justify-center">
                {checked ? (
                  onIcon && (
                    <div className="w-3 h-3 text-slate-600 dark:text-slate-400">
                      {onIcon}
                    </div>
                  )
                ) : (
                  offIcon && (
                    <div className="w-3 h-3 text-slate-600 dark:text-slate-400">
                      {offIcon}
                    </div>
                  )
                )}
              </div>
            )}
          </SwitchPrimitives.Thumb>
        </SwitchPrimitives.Root>

        {/* Label */}
        {label && (
          <label 
            className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer",
              error ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-slate-300"
            )}
            onClick={() => onCheckedChange?.(!checked)}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
      </div>

      {/* Description */}
      {description && !error && (
        <p className="text-xs text-slate-600 dark:text-slate-400 ml-14">
          {description}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 ml-14">
          <svg
            className="w-3 h-3"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
})
Switch.displayName = SwitchPrimitives.Root.displayName

// Compound component for better UX
interface SwitchGroupProps {
  children: React.ReactNode
  label?: string
  description?: string
  className?: string
}

const SwitchGroup = ({ children, label, description, className }: SwitchGroupProps) => {
  return (
    <div className={cn("space-y-3", className)}>
      {label && (
        <div>
          <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {label}
          </h3>
          {description && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}

// Enhanced Switch with loading state
interface EnhancedSwitchProps extends SwitchProps {
  loading?: boolean
  loadingText?: string
}

const EnhancedSwitch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  EnhancedSwitchProps
>(({ loading, loadingText = "Processing...", ...props }, ref) => {
  return (
    <div className="relative">
      <Switch
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      />
      
      {loading && (
        <div className="absolute inset-0 flex items-center">
          <div className="flex items-center space-x-2 ml-14">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {loadingText}
            </span>
          </div>
        </div>
      )}
    </div>
  )
})
EnhancedSwitch.displayName = "EnhancedSwitch"

export { Switch, SwitchGroup, EnhancedSwitch, switchVariants }