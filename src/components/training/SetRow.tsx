import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Check, Trash2 } from 'lucide-react'
import type { WorkoutSet } from '../../types'
import { cn } from '../../lib/cn'

interface SetRowProps {
  set: WorkoutSet
  exerciseName: string
  showCompleted?: boolean
  showRir?: boolean
  onUpdate: (patch: Partial<Pick<WorkoutSet, 'weightKg' | 'reps' | 'rir' | 'isWarmup' | 'completed'>>) => void
  onDelete: () => void
}

export function SetRow({ set, exerciseName, showCompleted = true, showRir = true, onUpdate, onDelete }: SetRowProps) {
  // Local state for inputs (strings to allow empty while typing)
  const [weight, setWeight] = useState(String(set.weightKg ?? ''))
  const [reps, setReps] = useState(String(set.reps ?? ''))
  const [rir, setRir] = useState(set.rir === undefined ? '' : String(set.rir))
  const [completed, setCompleted] = useState(set.completed)
  const weightRef = useRef(weight)
  const repsRef = useRef(reps)
  const rirRef = useRef(rir)
  useEffect(() => { weightRef.current = weight }, [weight])
  useEffect(() => { repsRef.current = reps }, [reps])
  useEffect(() => { rirRef.current = rir }, [rir])

  const focusedRef = useRef(false)
  const lastSyncedIdRef = useRef(set.id)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync from props only when the set identity changes (mount or different set).
  // Never overwrite local edits on refetch (prevents reverting to 0).
  useEffect(() => {
    if (lastSyncedIdRef.current !== set.id) {
      lastSyncedIdRef.current = set.id
      setWeight(String(set.weightKg ?? ''))
      setReps(String(set.reps ?? ''))
      setRir(set.rir === undefined ? '' : String(set.rir))
      setCompleted(set.completed)
    } else {
      setCompleted(set.completed)
    }
  }, [set.id, set.weightKg, set.reps, set.rir, set.completed])

  // Auto-save with debounce (500ms) after typing stops
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      save(weightRef.current, repsRef.current, rirRef.current)
    }, 500)
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
  }, [weight, reps, rir])

  const save = (w: string, r: string, ri: string) => {
    const trimmedW = w.trim()
    const trimmedR = r.trim()
    const trimmedRir = ri.trim()
    // Allow empty (don't convert to 0) — only save if at least one field has a value
    if (trimmedW === '' && trimmedR === '' && trimmedRir === '') return

    const patch: { weightKg?: number; reps?: number; rir?: number } = {}

    // Weight
    if (trimmedW !== '') {
      const parsedWeight = Number(trimmedW.replace(',', '.'))
      if (Number.isFinite(parsedWeight) && parsedWeight >= 0 && parsedWeight <= 1000) {
        if (parsedWeight !== set.weightKg) patch.weightKg = parsedWeight
      }
    }

    // Reps
    if (trimmedR !== '') {
      const parsedReps = Number(trimmedR.replace(',', '.'))
      if (Number.isFinite(parsedReps) && parsedReps >= 1 && parsedReps <= 100) {
        if (parsedReps !== set.reps) patch.reps = parsedReps
      }
    }

    // RIR
    if (trimmedRir === '') {
      if (set.rir !== undefined) patch.rir = undefined
    } else {
      const parsedRir = Number(trimmedRir.replace(',', '.'))
      if (Number.isFinite(parsedRir) && parsedRir >= 0 && parsedRir <= 10) {
        if (parsedRir !== set.rir) patch.rir = parsedRir
      }
    }

    if (Object.keys(patch).length === 0) return
    onUpdate(patch)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur()
    }
  }

  // Auto-save: debounce 400ms after typing stops
  useEffect(() => {
    const timer = setTimeout(() => {
      const w = weightRef.current
      const r = repsRef.current
      const ri = rirRef.current
      const trimmedW = w.trim()
      const trimmedR = r.trim()
      if (trimmedW === '' && trimmedR === '' && ri.trim() === '') return
      const parsedWeight = trimmedW === '' ? 0 : Number(trimmedW.replace(',', '.'))
      const parsedReps = trimmedR === '' ? 0 : Number(trimmedR.replace(',', '.'))
      const parsedRir = ri.trim() === '' ? undefined : Number(ri.replace(',', '.'))
      if (!Number.isFinite(parsedWeight) || parsedWeight < 0 || parsedWeight > 1000) return
      if (trimmedR !== '' && (!Number.isFinite(parsedReps) || parsedReps < 1 || parsedReps > 100)) return
      const nextRir = parsedRir !== undefined && Number.isFinite(parsedRir) && parsedRir >= 0 && parsedRir <= 10 ? parsedRir : undefined
      if (parsedWeight === set.weightKg && parsedReps === set.reps && nextRir === set.rir) return
      onUpdate({ weightKg: parsedWeight, reps: parsedReps, rir: nextRir })
    }, 400)
    return () => clearTimeout(timer)
  }, [weight, reps, rir])

  // Save pending changes on unmount
  useEffect(() => {
    return () => {
      save(weightRef.current, repsRef.current, rirRef.current)
    }
  }, [])

  return (
    <div
      className={cn(
        (showCompleted
          ? (showRir ? 'grid grid-cols-[30px_minmax(0,1fr)_minmax(0,1fr)_44px_32px_28px]' : 'grid grid-cols-[30px_minmax(0,1fr)_minmax(0,1fr)_32px_28px]')
          : (showRir ? 'grid grid-cols-[30px_minmax(0,1fr)_minmax(0,1fr)_44px_28px]' : 'grid grid-cols-[30px_minmax(0,1fr)_minmax(0,1fr)_28px]')) + ' items-center gap-1.5 rounded-lg px-1 py-1 transition',
        completed ? 'bg-lime-400/[0.045]' : 'bg-amber-400/[0.035]',
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
        onChange={(event) => { setWeight(event.target.value); weightRef.current = event.target.value }}
        onFocus={() => { focusedRef.current = true }}
        onBlur={() => { focusedRef.current = false; if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null } save(weightRef.current, repsRef.current, rirRef.current) }}
        onKeyDown={handleKeyDown}
        className={cn('input px-1.5 py-1.5 text-center text-sm tabular', !completed && 'border-amber-500/20')}
        aria-label={`${exerciseName}, serie ${set.setNumber}, peso en kilos`}
      />
      <input
        type="number"
        inputMode="numeric"
        min="1"
        max="100"
        step="1"
        value={reps}
        onChange={(event) => { setReps(event.target.value); repsRef.current = event.target.value }}
        onFocus={() => { focusedRef.current = true }}
        onBlur={() => { focusedRef.current = false; if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null } save(weightRef.current, repsRef.current, rirRef.current) }}
        onKeyDown={handleKeyDown}
        className={cn('input px-1.5 py-1.5 text-center text-sm tabular', !completed && 'border-amber-500/20')}
        aria-label={`${exerciseName}, serie ${set.setNumber}, repeticiones`}
      />
      {showRir && (
<input
        type="number"
        inputMode="numeric"
        min="0"
        max="10"
        step="1"
        value={rir}
        onChange={(event) => { setRir(event.target.value); rirRef.current = event.target.value }}
        onFocus={() => { focusedRef.current = true }}
        onBlur={() => { focusedRef.current = false; if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null } save(weightRef.current, repsRef.current, rirRef.current) }}
        onKeyDown={handleKeyDown}
        placeholder="–"
        className="input px-1 py-1.5 text-center text-xs tabular"
        aria-label={`${exerciseName}, serie ${set.setNumber}, RIR`}
        title="RIR: repeticiones en reserva (opcional)"
      />
      )}
      {showCompleted && (
      <button
        type="button"
        onClick={() => {
          setCompleted(!completed)
          onUpdate({ completed: !completed })
        }}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg border transition',
          completed
            ? 'border-lime-400/50 bg-lime-400/20 text-accent'
            : 'border-line bg-raised text-faint hover:border-lime-500/40 hover:text-accent',
        )}
        aria-label={completed ? `Marcar serie ${set.setNumber} como pendiente` : `Marcar serie ${set.setNumber} como completada`}
        title={completed ? 'Serie completada' : 'Marcar como completada'}
      >
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </button>
      )}
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
