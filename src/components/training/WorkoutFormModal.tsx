import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarPlus, Pencil, Play } from 'lucide-react'
import type { Workout } from '../../types'
import { workoutSchema, type WorkoutFormValues } from '../../lib/validators'
import { createWorkout, updateWorkoutDetails } from '../../lib/repositories'
import { useApp } from '../../context/AppContext'
import { cn } from '../../lib/cn'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface WorkoutFormModalProps {
  open: boolean
  onClose: () => void
  defaultDate: string
  workout?: Workout
  onSaved?: (workout: Workout) => void
}

const SUGGESTIONS = ['Torso A', 'Torso B', 'Pierna', 'Full body', 'Empuje', 'Tirón']

export function WorkoutFormModal({ open, onClose, defaultDate, workout, onSaved }: WorkoutFormModalProps) {
  const { notify } = useApp()
  const [startNow, setStartNow] = useState(true)
  const isEditing = Boolean(workout)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutSchema),
    defaultValues: {
      name: workout?.name ?? '',
      date: workout?.date ?? defaultDate,
      notes: workout?.notes ?? '',
    },
  })

  useEffect(() => {
    if (!open) return
    reset({
      name: workout?.name ?? '',
      date: workout?.date ?? defaultDate,
      notes: workout?.notes ?? '',
    })
    setStartNow(!workout)
  }, [open, workout, defaultDate, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (workout) {
        await updateWorkoutDetails(workout.id, values)
        notify('Sesión actualizada')
        onSaved?.({ ...workout, ...values, updatedAt: new Date().toISOString() })
      } else {
        const created = await createWorkout(values, { startNow })
        notify(startNow ? 'Sesión creada. ¡A por ello!' : 'Sesión programada')
        onSaved?.(created)
      }
      onClose()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo guardar la sesión', 'error')
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar sesión' : 'Nueva sesión'}
      description={
        isEditing
          ? 'Cambia el nombre, la fecha o las notas de la sesión.'
          : 'Ponle nombre, elige la fecha y decide si empiezas ahora o la programas.'
      }
      icon={isEditing ? <Pencil className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}
      size="sm"
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="workout-name">
            Nombre de la sesión
          </label>
          <input
            id="workout-name"
            className={cn('input', errors.name && 'input-error')}
            placeholder="Ej. Torso A"
            {...register('name')}
          />
          {errors.name ? <p className="field-error">{errors.name.message}</p> : null}
          {!isEditing ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="chip transition hover:border-lime-500/40 hover:text-fg"
                  onClick={() => setValue('name', suggestion, { shouldValidate: true })}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <label className="label" htmlFor="workout-date">
            Fecha
          </label>
          <input
            id="workout-date"
            type="date"
            className={cn('input', errors.date && 'input-error')}
            {...register('date')}
          />
          {errors.date ? <p className="field-error">{errors.date.message}</p> : null}
        </div>

        <div>
          <label className="label" htmlFor="workout-notes">
            Notas
          </label>
          <textarea
            id="workout-notes"
            rows={2}
            className="input resize-none"
            placeholder="Opcional: sensaciones, objetivos del día…"
            {...register('notes')}
          />
          {errors.notes ? <p className="field-error">{errors.notes.message}</p> : null}
        </div>

        {!isEditing ? (
          <button
            type="button"
            onClick={() => setStartNow((value) => !value)}
            className="flex w-full items-center justify-between rounded-xl border border-line bg-raised px-3 py-2.5 text-left"
          >
            <span className="flex items-center gap-2 text-xs font-medium text-fg">
              <Play className="h-3.5 w-3.5 text-accent" />
              {startNow ? 'Empezar ahora' : 'Solo programar'}
            </span>
            <span className="relative h-5 w-9 rounded-full bg-line">
              <span
                className={cn(
                  'absolute top-0.5 h-4 w-4 rounded-full bg-lime-400 transition-transform',
                  startNow ? 'translate-x-[18px]' : 'translate-x-0.5',
                )}
              />
            </span>
          </button>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEditing ? 'Guardar cambios' : startNow ? 'Crear y empezar' : 'Programar sesión'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
