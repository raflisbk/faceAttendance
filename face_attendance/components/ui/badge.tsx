// components/ui/badge.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
        warning:
          "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
        info:
          "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
        // Blackboard theme variants
        chalk:
          "border-transparent bg-slate-800 text-slate-100 dark:bg-slate-200 dark:text-slate-800",
        chalkGreen:
          "border-transparent bg-green-600 text-white dark:bg-green-500",
        chalkBlue:
          "border-transparent bg-blue-600 text-white dark:bg-blue-500",
        chalkRed:
          "border-transparent bg-red-600 text-white dark:bg-red-500",
        chalkYellow:
          "border-transparent bg-yellow-600 text-white dark:bg-yellow-500",
        chalkPurple:
          "border-transparent bg-purple-600 text-white dark:bg-purple-500",
        // Status variants
        present:
          "border-transparent bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300",
        absent:
          "border-transparent bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300",
        late:
          "border-transparent bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300",
        pending:
          "border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        approved:
          "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
        // Priority variants
        urgent:
          "border-transparent bg-red-500 text-white shadow-lg animate-pulse",
        high:
          "border-transparent bg-orange-500 text-white",
        medium:
          "border-transparent bg-yellow-500 text-white",
        low:
          "border-transparent bg-slate-500 text-white"
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
        xl: "px-4 py-1.5 text-base"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  children: React.ReactNode
}

function Badge({ className, variant, size, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {children}
    </div>
  )
}

export { Badge, badgeVariants }