import { Salad } from 'lucide-react'
import type { Food } from '../../types'
import { Modal } from '../ui/Modal'
import { FoodForm } from './FoodForm'

interface FoodFormModalProps {
  open: boolean
  food?: Food
  onClose: () => void
  onSaved?: (food: Food) => void
}

export function FoodFormModal({ open, food, onClose, onSaved }: FoodFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={food ? 'Editar alimento' : 'Nuevo alimento'}
      description="Introduce los valores del envase. Todo se calcula por 100 g."
      icon={<Salad className="h-4 w-4" />}
      size="lg"
    >
      <FoodForm
        initialFood={food}
        onCancel={onClose}
        onSaved={(saved) => {
          onSaved?.(saved)
          onClose()
        }}
      />
    </Modal>
  )
}
