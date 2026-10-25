import { useEffect, useState, type KeyboardEvent } from 'react'
import { Check, Trash2 } from 'lucide-react'
import type { WorkoutSet } from '../../types'
import { cn } from '../../lib/cn'

interface SetRowProps {
  set: WorkoutSet
  exerciseName: string
  onUpdate: (patch: Partial<Pick<WorkoutSet, 'weightKg' | 'reps' | 'rir' | 'isWarmup' | 'completed'>>) => void
  onDelete: () => void
}

export function SetRow({ set, exerciseName, onUpdate, onDelete }: SetRowProps) {
  const [weight, setWeight] = useState(String(set.weightKg))
  const [reps, setReps] = useState(String(set.reps))
  const [rir, setRir] = useState(set.rir === undefined ? '' : String(set.rir))

  useEffect(() => {
    setWeight(String(set.weightKg))
    setReps(String(set.reps))
    setRir(set.rir === undefined ? '' : String(set.rir))
  }, [set.weightKg, set.reps, set.rir])

  const commit = () => {
    const parsedWeight = Number(weight.replace(',', '.'))
    const parsedReps = Number(reps.replace(',', '.'))
    const parsedRir = rir.trim() === '' ? undefined : Number(rir.replace(',', '.'))
    if (!Number.isFinite(parsedWeight) || parsedWeight < 0 || parsedWeight > 1000) {
      setWeight(String(set.weightKg))
      return
    }
    if (!Number.isFinite(parsedReps) || parsedReps < 1 || parsedReps > 100) {
      setReps(String(set.reps))
      return
    }
    const nextRir = parsedRir !== undefined && Number.isFinite(parsedRir) && parsedRir >= 0 && parsedRir <= 10 ? parsedRir : undefined
    if (parsedWeight === set.weightKg && parsedReps === set.reps && nextRir === set.rir) return
    onUpdate({ weightKg: parsedWeight, reps: parsedReps, rir: nextRir })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur()
    }
  }

  return (
    <div
      className={cn(
        'grid grid-cols-[30px_minmax(0,1fr)_minmax(0,1fr)_44px_32px_28px] items-center gap-1.5 rounded-lg px-1 py-1 transition',
        set.completed ? 'bg-lime-400/[0.045]' : 'bg-amber-400/[0.035]',
      )}
    >
      <button
        type="button"
        onClick={() => onUpdate({ isWarmup: !set.isWarmup })}
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-md border text-[10px] font-semibold transition',
          set.isWarmup
            ? 'border-amber-500/40 bg-amber-500/15 text-amber-400'
            : 'border-line bg-raised text-muted hover:border-ink-500',
        )}
        title={set.isWarmup ? 'Serie de calentamiento (no cuenta en el volumen)' : 'Marcar como calentamiento'}
        aria-label={
          set.isWarmup
            ? `Serie ${set.setNumber}, calentamiento. Pulsa para marcar como serie efectiva`
            : `Serie ${set.setNumber}. Pulsa para marcar como calentamiento`
        }
      >
        {set.isWarmup ? 'C' : set.setNumber}
      </button>

      <input
        type="number"
        inputMode="decimal"
        min="0"
        max="1000"
        step="0.5"
        value={weight}
        onChange={(event) => setWeight(event.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className={cn('input px-1.5 py-1.5 text-center text-sm tabular', !set.completed && 'border-amber-500/20')}
        aria-label={`${exerciseName}, serie ${set.setNumber}, peso en kilos`}
      />
      <input
        type="number"
        inputMode="numeric"
        min="1"
        max="100"
        step="1"
        value={reps}
        onChange={(event) => setReps(event.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className={cn('input px-1.5 py-1.5 text-center text-sm tabular', !set.completed && 'border-amber-500/20')}
        aria-label={`${exerciseName}, serie ${set.setNumber}, repeticiones`}
      />
      <input
        type="number"
        inputMode="numeric"
        min="0"
        max="10"
        step="1"
        value={rir}
        onChange={(event) => setRir(event.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        placeholder="—"
        className="input px-1 py-1.5 text-center text-xs tabular"
        aria-label={`${exerciseName}, serie ${set.setNumber}, RIR`}
        title="RIR: repeticiones en reserva (opcional)"
      />
      <button
        type="button"
        onClick={() => onUpdate({ completed: !set.completed })}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg border transition',
          set.completed
            ? 'border-lime-400/50 bg-lime-400/20 text-accent'
            : 'border-line bg-raised text-faint hover:border-lime-500/40 hover:text-accent',
        )}
        aria-label={set.completed ? `Marcar serie ${set.setNumber} como pendiente` : `Marcar serie ${set.setNumber} como completada`}
        title={set.completed ? 'Serie completada' : 'Marcar como completada'}
      >
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="flex h-7 w-7 items-center justify-center rounded-md text-faint transition hover:bg-rose-500/10 hover:text-rose-400"
        aria-label={`Eliminar serie ${set.setNumber} de ${exerciseName}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
