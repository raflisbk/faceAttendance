import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  variant?: 'default' | 'destructive' | 'warning' | 'info'
  loading?: boolean
  disabled?: boolean
}

const variantConfig = {
  default: {
    icon: CheckCircle,
    iconColor: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    confirmVariant: 'chalk' as const
  },
  destructive: {
    icon: XCircle,
    iconColor: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    confirmVariant: 'destructive' as const
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    confirmVariant: 'chalk' as const
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    confirmVariant: 'chalk' as const
  }
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  loading = false,
  disabled = false
}) => {
  const config = variantConfig[variant]
  const Icon = config.icon

  const handleConfirm = async () => {
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (error) {
      // Error handling is done by the parent component
      console.error('Confirm action failed:', error)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              config.bgColor
            )}>
              <Icon className={cn("w-5 h-5", config.iconColor)} />
            </div>
            <DialogTitle className="text-left">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-left pl-13">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="chalkOutline"
            onClick={handleCancel}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {cancelText}
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={handleConfirm}
            disabled={disabled || loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook untuk menggunakan confirm dialog
export const useConfirmDialog = () => {
  const [dialogState, setDialogState] = React.useState<{
    open: boolean
    config: Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>
  }>({
    open: false,
    config: {
      title: '',
      description: '',
      onConfirm: () => {}
    }
  })

  const showConfirm = (config: Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>) => {
    setDialogState({
      open: true,
      config
    })
  }

  const hideConfirm = () => {
    setDialogState(prev => ({ ...prev, open: false }))
  }

  const ConfirmDialogComponent = () => (
    <ConfirmDialog
      {...dialogState.config}
      open={dialogState.open}
      onOpenChange={hideConfirm}
    />
  )

  return {
    showConfirm,
    hideConfirm,
    ConfirmDialog: ConfirmDialogComponent
  }
}

// Preset confirm dialogs
export const useDeleteConfirm = () => {
  const { showConfirm, ConfirmDialog } = useConfirmDialog()

  const showDeleteConfirm = (itemName: string, onConfirm: () => void | Promise<void>) => {
    showConfirm({
      title: 'Delete Confirmation',
      description: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
      onConfirm
    })
  }

  return { showDeleteConfirm, ConfirmDialog }
}

export const useLogoutConfirm = () => {
  const { showConfirm, ConfirmDialog } = useConfirmDialog()

  const showLogoutConfirm = (onConfirm: () => void | Promise<void>) => {
    showConfirm({
      title: 'Sign Out',
      description: 'Are you sure you want to sign out of your account?',
      confirmText: 'Sign Out',
      variant: 'warning',
      onConfirm
    })
  }

  return { showLogoutConfirm, ConfirmDialog }
}