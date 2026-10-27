import { useMemo, useState } from 'react'
import { Check, Dumbbell, Plus, Search } from 'lucide-react'
import type { Exercise, MuscleGroup } from '../../types'
import { MUSCLE_GROUPS, MUSCLE_LABELS } from '../../types'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { cn } from '../../lib/cn'
import { useExercises } from '../../hooks/useSupabaseData'

interface ExercisePickerModalProps {
  open: boolean
  onClose: () => void
  onAdd: (exercise: Exercise) => Promise<void> | void
  onRequestCreate: () => void
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function ExercisePickerModal({ open, onClose, onAdd, onRequestCreate }: ExercisePickerModalProps) {
  const { data: exercisesData } = useExercises()
  const exercises = exercisesData ?? []
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState<MuscleGroup | ''>('')
  const [addedIds, setAddedIds] = useState<string[]>([])
  const [pendingId, setPendingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const term = normalize(search.trim())
    return exercises.filter((exercise) => {
      if (group && exercise.muscleGroup !== group) return false
      if (!term) return true
      return normalize(`${exercise.name} ${exercise.equipment ?? ''}`).includes(term)
    })
  }, [exercises, search, group])

  const handleAdd = async (exercise: Exercise) => {
    setPendingId(exercise.id)
    try {
      await onAdd(exercise)
      setAddedIds((current) => (current.includes(exercise.id) ? current : [...current, exercise.id]))
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Añadir ejercicio"
      description="Elige de tu biblioteca. Puedes añadir varios seguidos."
      icon={<Dumbbell className="h-4 w-4" />}
      size="md"
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar ejercicio…"
            className="input pl-9"
            aria-label="Buscar ejercicio"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setGroup('')}
            className={cn('chip shrink-0', !group && 'border-lime-500/40 text-accent')}
          >
            Todos
          </button>
          {MUSCLE_GROUPS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setGroup(item.value)}
              className={cn('chip shrink-0', group === item.value && 'border-lime-500/40 text-accent')}
            >
              {item.label}
            </button>
          ))}
        </div>

        {exercises.length === 0 ? (
          <EmptyState
            icon={<Dumbbell className="h-5 w-5" />}
            title="No hay ejercicios"
            description="Crea tu primer ejercicio para empezar a registrar series."
            action={<Button onClick={onRequestCreate}>Crear ejercicio</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title="Sin resultados"
            description="Cambia la búsqueda o el grupo muscular."
          />
        ) : (
          <div className="-mx-1 max-h-[50vh] space-y-1.5 overflow-y-auto px-1 py-1">
            {filtered.map((exercise) => {
              const added = addedIds.includes(exercise.id)
              return (
                <div
                  key={exercise.id}
                  className="flex items-center gap-3 rounded-xl border border-line bg-raised/60 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{exercise.name}</p>
                    <p className="mt-0.5 text-[10px] text-faint">
                      {MUSCLE_LABELS[exercise.muscleGroup]}
                      {exercise.equipment ? ` · ${exercise.equipment}` : ''}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={added ? 'secondary' : 'primary'}
                    className="px-2.5"
                    loading={pendingId === exercise.id}
                    onClick={() => void handleAdd(exercise)}
                    aria-label={`Añadir ${exercise.name}`}
                  >
                    {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {added ? 'Añadido' : 'Añadir'}
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={onRequestCreate} className="btn-ghost px-2 py-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Crear ejercicio nuevo
          </button>
          <Button variant="secondary" onClick={onClose}>
            Listo
          </Button>
        </div>
      </div>
    </Modal>
  )
}
