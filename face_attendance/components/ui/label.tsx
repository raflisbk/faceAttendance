// components/ui/label.tsx
"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      variant: {
        default: "text-slate-700 dark:text-slate-300",
        secondary: "text-slate-600 dark:text-slate-400", 
        muted: "text-slate-500 dark:text-slate-500",
        destructive: "text-red-600 dark:text-red-400",
        success: "text-green-600 dark:text-green-400",
        warning: "text-yellow-600 dark:text-yellow-400",
        info: "text-blue-600 dark:text-blue-400",
        // Blackboard theme variants
        chalk: "text-slate-800 dark:text-slate-200 font-semibold",
        chalkBold: "text-slate-900 dark:text-slate-100 font-bold",
        chalkMuted: "text-slate-600 dark:text-slate-400",
        // Required field variant
        required: "text-slate-700 dark:text-slate-300 after:content-['*'] after:text-red-500 after:ml-1"
      },
      size: {
        default: "text-sm",
        sm: "text-xs",
        lg: "text-base",
        xl: "text-lg"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants> & {
      required?: boolean
      tooltip?: string
      description?: string
    }
>(({ className, variant, size, required, tooltip, description, children, ...props }, ref) => {
  const labelVariant = required ? "required" : variant

  return (
    <div className="space-y-1">
      <LabelPrimitive.Root
        ref={ref}
        className={cn(labelVariants({ variant: labelVariant, size }), className)}
        title={tooltip}
        {...props}
      >
        {children}
      </LabelPrimitive.Root>
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
    </div>
  )
})
Label.displayName = LabelPrimitive.Root.displayName

export { Label, labelVariants }