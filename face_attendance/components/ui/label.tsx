// components/ui/label.tsx
"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-pixel font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      variant: {
        default: "text-foreground",
        secondary: "text-muted-foreground",
        muted: "text-muted-foreground",
        destructive: "text-destructive",
        success: "text-foreground",
        warning: "text-foreground",
        info: "text-foreground",
        // Pixel theme variants
        pixel: "text-foreground",
        pixelBold: "text-foreground font-bold",
        pixelMuted: "text-muted-foreground",
        chalk: "text-foreground",
        chalkBold: "text-foreground font-bold",
        chalkMuted: "text-muted-foreground",
        // Required field variant
        required: "text-foreground after:content-['*'] after:text-destructive after:ml-1"
      },
      size: {
        default: "text-pixel",
        sm: "text-pixel-small",
        lg: "text-pixel",
        xl: "text-pixel"
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
    <div className="flex-pixel-col">
      <LabelPrimitive.Root
        ref={ref}
        className={cn(labelVariants({ variant: labelVariant, size }), className)}
        title={tooltip}
        {...props}
      >
        {children}
      </LabelPrimitive.Root>
      {description && (
        <p className="text-pixel-small text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
})
Label.displayName = LabelPrimitive.Root.displayName

export { Label, labelVariants }