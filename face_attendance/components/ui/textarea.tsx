// components/ui/textarea.tsx
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const textareaVariants = cva(
  "flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors",
  {
    variants: {
      variant: {
        default: 
          "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 focus-visible:ring-slate-950 dark:focus-visible:ring-slate-300",
        chalk:
          "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900 focus-visible:ring-slate-700 dark:focus-visible:ring-slate-400",
        outline:
          "border-slate-300 bg-transparent dark:border-slate-700 focus-visible:ring-slate-700 dark:focus-visible:ring-slate-400",
        ghost:
          "border-transparent bg-slate-100 dark:bg-slate-800 focus-visible:ring-slate-700 dark:focus-visible:ring-slate-400"
      },
      textareaSize: {
        default: "min-h-[80px]",
        sm: "min-h-[60px] text-xs",
        lg: "min-h-[120px] text-base",
        xl: "min-h-[200px] text-base"
      }
    },
    defaultVariants: {
      variant: "default",
      textareaSize: "default"
    }
  }
)

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  label?: string
  description?: string
  error?: string
  showCharCount?: boolean
  maxLength?: number
  resize?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    variant, 
    textareaSize, 
    label, 
    description, 
    error, 
    showCharCount, 
    maxLength,
    resize = false,
    value,
    onChange,
    ...props 
  }, ref) => {
    const [charCount, setCharCount] = React.useState(0)

    React.useEffect(() => {
      if (typeof value === 'string') {
        setCharCount(value.length)
      }
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length)
      onChange?.(e)
    }

    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          <textarea
            className={cn(
              textareaVariants({ variant, textareaSize }),
              resize && "resize-y",
              error && "border-red-500 focus-visible:ring-red-500",
              className
            )}
            ref={ref}
            value={value}
            onChange={handleChange}
            maxLength={maxLength}
            {...props}
          />
          
          {/* Character Count */}
          {showCharCount && (
            <div className="absolute bottom-2 right-2 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-1 rounded">
              {charCount}{maxLength && `/${maxLength}`}
            </div>
          )}
        </div>

        {/* Description */}
        {description && !error && (
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {description}
          </p>
        )}

        {/* Error Message */}
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
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

        {/* Character Limit Warning */}
        {maxLength && charCount > maxLength * 0.9 && (
          <p className={cn(
            "text-xs flex items-center gap-1",
            charCount >= maxLength 
              ? "text-red-600 dark:text-red-400" 
              : "text-yellow-600 dark:text-yellow-400"
          )}>
            <svg
              className="w-3 h-3"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {charCount >= maxLength 
              ? "Character limit reached" 
              : `${maxLength - charCount} characters remaining`
            }
          </p>
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea, textareaVariants }