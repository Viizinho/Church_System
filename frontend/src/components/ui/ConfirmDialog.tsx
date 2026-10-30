import { ReactNode } from 'react'
import Modal from './Modal'
import Button from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  /** 'danger' para ações destrutivas/recusas, 'success' para aprovações */
  tone?: 'danger' | 'success'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open, title, children, confirmLabel, tone = 'danger', loading, onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} width="max-w-md">
      <div className="space-y-4">
        <div className="text-sm text-gray-600 space-y-2">{children}</div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>Cancelar</Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            className={tone === 'success' ? '!bg-green-600 hover:!bg-green-700' : ''}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
