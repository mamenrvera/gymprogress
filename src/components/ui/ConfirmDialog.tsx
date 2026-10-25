import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => Promise<void> | void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false)

  const handleConfirm = async () => {
    setPending(true)
    try {
      await onConfirm()
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" icon={<AlertTriangle className="h-4 w-4" />}>
      <p className="text-sm leading-relaxed text-muted">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={pending}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={handleConfirm} loading={pending}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
