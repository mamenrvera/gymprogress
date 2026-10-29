import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dumbbell, Plus } from 'lucide-react'
import type { Exercise } from '../../types'
import { MUSCLE_GROUPS } from '../../types'
import { exerciseSchema, type ExerciseFormValues } from '../../lib/validators'
import { saveExercise } from '../../lib/repositories'
import { newId } from '../../lib/id'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/cn'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { ExercisePhotoUpload } from './ExercisePhotoUpload'

interface ExerciseFormModalProps {
  open: boolean
  exercise?: Exercise
  onClose: () => void
  onSaved?: (exercise: Exercise) => void
}

export function ExerciseFormModal({ open, exercise, onClose, onSaved }: ExerciseFormModalProps) {
  const { notify } = useApp()
  const [imageUrl, setImageUrl] = useState<string | null>(exercise?.imageUrl ?? null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const { user } = useAuth()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: exercise?.name ?? '',
      muscleGroup: exercise?.muscleGroup ?? 'pecho',
      equipment: exercise?.equipment ?? '',
      notes: exercise?.notes ?? '',
    },
  })

  useEffect(() => {
    if (!open) return
    setImageUrl(exercise?.imageUrl ?? null)
    reset({
      name: exercise?.name ?? '',
      muscleGroup: exercise?.muscleGroup ?? 'pecho',
      equipment: exercise?.equipment ?? '',
      notes: exercise?.notes ?? '',
    })
  }, [open, exercise, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (!exercise?.id && pendingFile && user) {
        // New exercise with photo: generate ID, upload photo, then create exercise in a single INSERT
        // This avoids an UPDATE call, which is now restricted to admin only.
        const exerciseId = newId()
        try {
          const { compressImage, uploadExercisePhoto } = await import('../../lib/storage')
          const compressed = await compressImage(pendingFile, 800, 0.8)
          const compressedFile = new File([compressed], pendingFile.name, { type: compressed.type })
          const result = await uploadExercisePhoto(user.id, exerciseId, compressedFile)
          const saved = await saveExercise(values, undefined, result.path, exerciseId)
          saved.imageUrl = result.path
          notify('Ejercicio añadido a tu biblioteca')
          onSaved?.(saved)
          onClose()
        } catch (e) {
          notify(e instanceof Error ? e.message : 'Error al subir la imagen', 'error')
        }
      } else {
        const saved = await saveExercise(values, exercise?.id, imageUrl)
        notify(exercise ? 'Ejercicio actualizado' : 'Ejercicio añadido a tu biblioteca')
        onSaved?.(saved)
        onClose()
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No se pudo guardar el ejercicio'
      console.error('[ExerciseFormModal] Error saving exercise:', msg, error)
      notify(msg, 'error')
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={exercise ? 'Editar ejercicio' : 'Nuevo ejercicio'}
      description="Se guarda en tu biblioteca para reutilizarlo en cualquier sesión."
      icon={exercise ? <Dumbbell className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      size="sm"
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="exercise-name">
            Nombre
          </label>
          <input
            id="exercise-name"
            className={cn('input', errors.name && 'input-error')}
            placeholder="Ej. Sentadilla búlgara"
            {...register('name')}
          />
          {errors.name ? <p className="field-error">{errors.name.message}</p> : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="exercise-muscle">
              Grupo muscular
            </label>
            <select id="exercise-muscle" className="input" {...register('muscleGroup')}>
              {MUSCLE_GROUPS.map((group) => (
                <option key={group.value} value={group.value}>
                  {group.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="exercise-equipment">
              Material
            </label>
            <input
              id="exercise-equipment"
              className="input"
              placeholder="Barra, mancuernas…"
              {...register('equipment')}
            />
            {errors.equipment ? <p className="field-error">{errors.equipment.message}</p> : null}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="exercise-notes">
            Notas
          </label>
          <textarea
            id="exercise-notes"
            rows={2}
            className="input resize-none"
            placeholder="Opcional: técnica, rango de repeticiones…"
            {...register('notes')}
          />
          {errors.notes ? <p className="field-error">{errors.notes.message}</p> : null}
        </div>

        <ExercisePhotoUpload
          exerciseId={exercise?.id}
          currentImageUrl={imageUrl}
          onImageChange={setImageUrl}
          onFileSelect={setPendingFile}
          disabled={isSubmitting}
        />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {exercise ? 'Guardar cambios' : 'Crear ejercicio'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
