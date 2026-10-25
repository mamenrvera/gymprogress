import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Calculator, Trash2, UtensilsCrossed } from 'lucide-react'
import type { FoodEntry } from '../../types'
import { MEAL_TYPES } from '../../types'
import { entrySchema, type EntryFormValues } from '../../lib/validators'
import { nutritionForGrams } from '../../lib/calculations'
import { formatGrams, formatKcal } from '../../lib/format'
import { deleteFoodEntry, updateFoodEntry } from '../../lib/repositories'
import { capitalize, formatLongEs } from '../../lib/dates'
import { useApp } from '../../context/AppContext'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { cn } from '../../lib/cn'

interface EditFoodEntryModalProps {
  entry?: FoodEntry
  open: boolean
  onClose: () => void
}

export function EditFoodEntryModal({ entry, open, onClose }: EditFoodEntryModalProps) {
  const { notify } = useApp()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EntryFormValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      grams: entry?.grams ?? 100,
      meal: entry?.meal ?? 'almuerzo',
    },
  })

  useEffect(() => {
    if (!open || !entry) return
    setConfirmingDelete(false)
    reset({ grams: entry.grams, meal: entry.meal })
  }, [open, entry, reset])

  if (!entry) return null

  const grams = Number(watch('grams')) || 0
  const preview = nutritionForGrams(entry.per100, grams)

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateFoodEntry(entry.id, values)
      notify('Registro actualizado')
      onClose()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo actualizar el registro', 'error')
    }
  })

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteFoodEntry(entry.id)
      notify('Alimento eliminado del día')
      onClose()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo eliminar', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar registro"
      description={`${capitalize(formatLongEs(entry.date))} · ${entry.brand ? `${entry.foodName} (${entry.brand})` : entry.foodName}`}
      icon={<UtensilsCrossed className="h-4 w-4" />}
      size="sm"
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="edit-grams">
              Cantidad (g)
            </label>
            <input
              id="edit-grams"
              type="number"
              inputMode="decimal"
              min="0.1"
              max="5000"
              step="any"
              className={cn('input text-lg font-semibold tabular', errors.grams && 'input-error')}
              {...register('grams', { valueAsNumber: true })}
            />
            {errors.grams ? <p className="field-error">{errors.grams.message}</p> : null}
          </div>
          <div>
            <label className="label" htmlFor="edit-meal">
              Comida
            </label>
            <select id="edit-meal" className="input" {...register('meal')}>
              {MEAL_TYPES.map((meal) => (
                <option key={meal.value} value={meal.value}>
                  {meal.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-raised p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted">Nuevo aporte</span>
            <span className="font-display text-xl font-semibold tabular text-fg">
              {formatKcal(preview.caloriesDeclared)} <span className="text-xs font-normal text-faint">kcal</span>
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
            <span>P <strong className="text-protein">{formatGrams(preview.protein)} g</strong></span>
            <span>C <strong className="text-carbs">{formatGrams(preview.carbs)} g</strong></span>
            <span>G <strong className="text-fat">{formatGrams(preview.fat)} g</strong></span>
          </div>
          <p className="mt-2 flex items-center gap-1 text-[10px] text-faint">
            <Calculator className="h-3 w-3" /> Calculado de macros: {formatKcal(preview.caloriesEstimated)} kcal
          </p>
        </div>

        {confirmingDelete ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
            <p className="text-xs text-rose-300">¿Eliminar este alimento del día? Esta acción no se puede deshacer.</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="danger" onClick={() => void handleDelete()} loading={deleting}>
                Sí, eliminar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <Button variant="ghost" size="sm" className="text-rose-400 hover:text-rose-300" onClick={() => setConfirmingDelete(true)}>
            <Trash2 className="h-3.5 w-3.5" /> Eliminar
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Guardar
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
