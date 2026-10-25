import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import type { Exercise, WorkoutExercise } from '../types'
import { MUSCLE_LABELS } from '../types'
import { db } from '../lib/db'
import { useApp } from '../context/AppContext'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { WorkoutFormModal } from '../components/training/WorkoutFormModal'
import { ExerciseFormModal } from '../components/training/ExerciseFormModal'
import { ExercisePickerModal } from '../components/training/ExercisePickerModal'
import { SetRow } from '../components/training/SetRow'
import { addExerciseToWorkout, addSet, deleteSet, deleteWorkout, removeWorkoutExercise, setWorkoutStatus, updateSet } from '../lib/repositories'
import { epley1RM, workoutStats } from '../lib/calculations'
import {
  formatDuration,
  formatLongEs,
  formatShortEs,
  minutesBetween,
} from '../lib/dates'
import { formatNumber } from '../lib/format'
import { WORKOUT_STATUS_CLASSES, WORKOUT_STATUS_LABELS } from '../lib/workoutUi'

interface PreviousPerformance {
  date: string
  setsCount: number
  bestWeight: number
  bestReps: number
  bestE1rm: number
  lastWeight: number
  lastReps: number
  lastRir?: number
}

export function WorkoutEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { notify } = useApp()

  const workout = useLiveQuery(
    async () => (id ? ((await db.workouts.get(id)) ?? null) : null),
    [id],
  )
  const workoutExercises =
    useLiveQuery(
      async () =>
        id
          ? (await db.workoutExercises.where('workoutId').equals(id).toArray()).sort((a, b) => a.order - b.order)
          : [],
      [id],
    ) ?? []
  const sets = useLiveQuery(async () => (id ? await db.sets.where('workoutId').equals(id).toArray() : []), [id]) ?? []
  const allWorkouts = useLiveQuery(() => db.workouts.toArray(), []) ?? []
  const allWorkoutExercises = useLiveQuery(() => db.workoutExercises.toArray(), []) ?? []
  const allSets = useLiveQuery(() => db.sets.toArray(), []) ?? []

  const [pickerOpen, setPickerOpen] = useState(false)
  const [newExerciseOpen, setNewExerciseOpen] = useState(false)
  const [editWorkoutOpen, setEditWorkoutOpen] = useState(false)
  const [removingExercise, setRemovingExercise] = useState<WorkoutExercise | undefined>(undefined)
  const [deletingWorkout, setDeletingWorkout] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [statusPending, setStatusPending] = useState(false)

  const workoutMap = useMemo(() => new Map(allWorkouts.map((item) => [item.id, item])), [allWorkouts])
  const stats = workoutStats(sets, workoutExercises.length)
  const duration =
    workout?.startedAt && workout.finishedAt ? minutesBetween(workout.startedAt, workout.finishedAt) : 0

  const getPrevious = (exercise: WorkoutExercise): PreviousPerformance | null => {
    if (!workout) return null
    const candidates = allWorkoutExercises
      .filter((other) => {
        if (other.workoutId === workout.id) return false
        if (exercise.exerciseId && other.exerciseId) return other.exerciseId === exercise.exerciseId
        return other.exerciseName === exercise.exerciseName
      })
      .map((other) => ({ other, session: workoutMap.get(other.workoutId) }))
      .filter(
        (item) =>
          item.session &&
          item.session.status === 'completed' &&
          item.session.date <= workout.date,
      )
      .sort((a, b) => b.session!.date.localeCompare(a.session!.date))

    for (const candidate of candidates) {
      const effectiveSets = allSets
        .filter(
          (set) =>
            set.workoutExerciseId === candidate.other.id && set.completed && !set.isWarmup,
        )
        .sort((a, b) => a.setNumber - b.setNumber)
      if (effectiveSets.length === 0) continue
      let best = effectiveSets[0]
      for (const set of effectiveSets) {
        if (epley1RM(set.weightKg, set.reps) > epley1RM(best.weightKg, best.reps)) best = set
      }
      const last = effectiveSets[effectiveSets.length - 1]
      return {
        date: candidate.session!.date,
        setsCount: effectiveSets.length,
        bestWeight: best.weightKg,
        bestReps: best.reps,
        bestE1rm: epley1RM(best.weightKg, best.reps),
        lastWeight: last.weightKg,
        lastReps: last.reps,
        lastRir: last.rir,
      }
    }
    return null
  }

  const handleAddExercise = async (exercise: Exercise) => {
    if (!workout) return
    try {
      await addExerciseToWorkout(workout.id, {
        id: exercise.id,
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
      })
      notify(`${exercise.name} añadido a la sesión`)
    } catch {
      notify('No se pudo añadir el ejercicio', 'error')
    }
  }

  const handleAddSet = async (exercise: WorkoutExercise, exerciseSets: typeof sets) => {
    if (!workout) return
    const sorted = exerciseSets.slice().sort((a, b) => a.setNumber - b.setNumber)
    const currentLast = sorted[sorted.length - 1]
    const previous = getPrevious(exercise)
    let weightKg = 0
    let reps = 10
    let rir: number | undefined
    let completed = false
    if (currentLast) {
      weightKg = currentLast.weightKg
      reps = currentLast.reps
      rir = currentLast.rir
      completed = currentLast.completed
    } else if (previous) {
      weightKg = previous.lastWeight
      reps = previous.lastReps
      rir = previous.lastRir
      completed = true
    }
    try {
      await addSet({
        workoutExerciseId: exercise.id,
        workoutId: workout.id,
        weightKg,
        reps,
        rir,
        completed,
      })
      if (!currentLast && !previous) {
        notify('Serie en blanco: ajusta el peso y las repeticiones, y márcala como completada.', 'info')
      }
    } catch {
      notify('No se pudo añadir la serie', 'error')
    }
  }

  const handleStatus = async (status: 'planned' | 'in_progress' | 'completed') => {
    if (!workout) return
    setStatusPending(true)
    try {
      await setWorkoutStatus(workout.id, status)
      if (status === 'completed') {
        notify('Sesión completada. Buen trabajo.')
        navigate('/entrenamiento')
      } else if (status === 'in_progress') {
        notify(workout.status === 'completed' ? 'Sesión reabierta' : 'Sesión iniciada. ¡A entrenar!')
      }
    } catch {
      notify('No se pudo actualizar la sesión', 'error')
    } finally {
      setStatusPending(false)
    }
  }

  const handleFinish = async () => {
    if (stats.effectiveSets === 0) {
      setConfirmFinish(true)
      return
    }
    await handleStatus('completed')
  }

  const handleDeleteWorkout = async () => {
    if (!workout) return
    try {
      await deleteWorkout(workout.id)
      notify('Sesión eliminada')
      navigate('/entrenamiento')
    } catch {
      notify('No se pudo eliminar la sesión', 'error')
    }
  }

  const handleRemoveExercise = async () => {
    if (!removingExercise) return
    try {
      await removeWorkoutExercise(removingExercise.id)
      notify('Ejercicio eliminado de la sesión')
      setRemovingExercise(undefined)
    } catch {
      notify('No se pudo eliminar el ejercicio', 'error')
    }
  }

  if (workout === undefined) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-10 w-40" />
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-64 w-full" />
      </div>
    )
  }

  if (workout === null) {
    return (
      <div className="card">
        <EmptyState
          icon={<Dumbbell className="h-5 w-5" />}
          title="Sesión no encontrada"
          description="Puede que se haya eliminado o que el enlace no sea válido."
          action={
            <Link to="/entrenamiento" className="btn-primary">
              Volver a entrenamiento
            </Link>
          }
        />
      </div>
    )
  }

  const exerciseSets = (workoutExerciseId: string) =>
    sets.filter((set) => set.workoutExerciseId === workoutExerciseId).sort((a, b) => a.setNumber - b.setNumber)

  return (
    <div className="animate-fade-up mx-auto max-w-4xl space-y-4">
      <div className="flex items-start gap-2.5">
        <Link to="/entrenamiento" className="btn-icon mt-0.5 shrink-0" aria-label="Volver a entrenamiento">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-faint">
            <span className="capitalize">{formatLongEs(workout.date)}</span>
            <span className={WORKOUT_STATUS_CLASSES[workout.status]}>{WORKOUT_STATUS_LABELS[workout.status]}</span>
          </div>
          <h1 className="mt-1 truncate font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            {workout.name}
          </h1>
          {workout.notes ? <p className="mt-1 text-xs leading-relaxed text-muted">{workout.notes}</p> : null}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            className="btn-icon h-9 w-9"
            onClick={() => setEditWorkoutOpen(true)}
            aria-label="Editar datos de la sesión"
            title="Editar sesión"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="btn-icon h-9 w-9 hover:text-rose-400"
            onClick={() => setDeletingWorkout(true)}
            aria-label="Eliminar sesión"
            title="Eliminar sesión"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <section className="card-pad">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-xl border border-line bg-raised/60 px-3 py-2.5">
            <p className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-faint">
              <Clock className="h-3 w-3" /> Duración
            </p>
            <p className="mt-1 font-display text-xl font-semibold leading-none text-fg">
              {duration > 0 ? formatDuration(duration) : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-raised/60 px-3 py-2.5">
            <p className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-faint">
              <Dumbbell className="h-3 w-3" /> Ejercicios
            </p>
            <p className="mt-1 font-display text-xl font-semibold leading-none text-fg">{stats.exerciseCount}</p>
          </div>
          <div className="rounded-xl border border-line bg-raised/60 px-3 py-2.5">
            <p className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-faint">
              <CheckCircle2 className="h-3 w-3" /> Series ef.
            </p>
            <p className="mt-1 font-display text-xl font-semibold leading-none text-fg">
              {stats.effectiveSets}
              {stats.pendingSets > 0 ? (
                <span className="ml-1.5 text-[10px] font-normal text-amber-400">({stats.pendingSets} pend.)</span>
              ) : null}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-raised/60 px-3 py-2.5">
            <p className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-faint">
              <TrendingUp className="h-3 w-3" /> Volumen
            </p>
            <p className="mt-1 font-display text-xl font-semibold leading-none text-fg">
              {formatNumber(stats.volume, 0)} <span className="text-[10px] font-normal text-faint">kg</span>
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {stats.bestSet ? (
            <span className="chip">
              Mejor serie: {stats.bestSet.weightKg} kg × {stats.bestSet.reps} · 1RM est. {formatNumber(stats.bestSet.e1rm)} kg
            </span>
          ) : (
            <span className="chip">Aún no hay series efectivas</span>
          )}
          {stats.warmupSets > 0 ? <span className="chip">Calentamiento: {stats.warmupSets}</span> : null}
          <span className="chip">{stats.reps} repeticiones</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {workout.status === 'planned' ? (
            <Button onClick={() => void handleStatus('in_progress')} loading={statusPending}>
              <Play className="h-4 w-4" /> Comenzar sesión
            </Button>
          ) : null}
          {workout.status === 'in_progress' ? (
            <Button onClick={() => void handleFinish()} loading={statusPending}>
              <CheckCircle2 className="h-4 w-4" /> Finalizar sesión
            </Button>
          ) : null}
          {workout.status === 'completed' ? (
            <Button variant="secondary" onClick={() => void handleStatus('in_progress')} loading={statusPending}>
              <RotateCcw className="h-4 w-4" /> Reabrir sesión
            </Button>
          ) : null}
          <Link to="/progreso" className="btn-ghost px-3 py-2 text-xs">
            Ver progreso <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-fg">Ejercicios y series</h2>
            <p className="mt-0.5 text-[10px] text-faint">
              Pulsa el número de serie para marcar calentamiento. Los cambios se guardan al salir del campo.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Ejercicio
          </Button>
        </div>

        {workoutExercises.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<Dumbbell className="h-5 w-5" />}
              title="Añade tu primer ejercicio"
              description="Elige un ejercicio de tu biblioteca y empieza a registrar series, repeticiones y peso."
              action={<Button onClick={() => setPickerOpen(true)}>Añadir ejercicio</Button>}
            />
          </div>
        ) : (
          workoutExercises.map((exercise, index) => {
            const currentSets = exerciseSets(exercise.id)
            const exerciseStats = workoutStats(currentSets, 1)
            const previous = getPrevious(exercise)
            return (
              <article key={exercise.id} className="card overflow-hidden">
                <div className="flex items-start gap-2.5 border-b border-line px-3.5 py-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-raised font-display text-sm font-semibold text-muted">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-fg">{exercise.exerciseName}</h3>
                      <span className="chip">{MUSCLE_LABELS[exercise.muscleGroup]}</span>
                    </div>
                    <p className="mt-1 text-[10px] leading-relaxed text-faint">
                      {previous
                        ? `Última vez (${formatShortEs(previous.date)}): ${previous.setsCount} series · mejor ${previous.bestWeight} kg × ${previous.bestReps} · 1RM est. ${formatNumber(previous.bestE1rm)} kg`
                        : 'Primera vez con este ejercicio'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRemovingExercise(exercise)}
                    className="btn-icon h-8 w-8 shrink-0 hover:text-rose-400"
                    aria-label={`Quitar ${exercise.exerciseName} de la sesión`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="p-2.5">
                  {currentSets.length > 0 ? (
                    <div className="grid grid-cols-[30px_minmax(0,1fr)_minmax(0,1fr)_44px_32px_28px] gap-1.5 px-1 pb-1.5 text-center text-[9px] uppercase tracking-wide text-faint">
                      <span>Serie</span>
                      <span>kg</span>
                      <span>Reps</span>
                      <span>RIR</span>
                      <span>Hecha</span>
                      <span />
                    </div>
                  ) : null}

                  <div className="space-y-1">
                    {currentSets.map((set) => (
                      <SetRow
                        key={set.id}
                        set={set}
                        exerciseName={exercise.exerciseName}
                        onUpdate={(patch) => void updateSet(set.id, patch)}
                        onDelete={() => void deleteSet(set.id)}
                      />
                    ))}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
                    <Button size="sm" variant="secondary" className="px-2.5 py-1.5 text-xs" onClick={() => void handleAddSet(exercise, currentSets)}>
                      <Plus className="h-3.5 w-3.5" /> Añadir serie
                    </Button>
                    <span className="text-[10px] tabular text-faint">
                      {exerciseStats.effectiveSets} ef. · {formatNumber(exerciseStats.volume, 0)} kg
                      {exerciseStats.bestSet ? ` · top ${exerciseStats.bestSet.weightKg} kg` : ''}
                    </span>
                  </div>
                </div>
              </article>
            )
          })
        )}

        {workoutExercises.length > 0 ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-3 text-xs font-medium text-muted transition hover:border-lime-500/40 hover:text-accent"
          >
            <Plus className="h-4 w-4" /> Añadir otro ejercicio
          </button>
        ) : null}

        <p className="px-1 text-[10px] leading-relaxed text-faint">
          El volumen se calcula con peso × repeticiones de las series completadas y efectivas. Las series marcadas como
          calentamiento no suman. En ejercicios a peso corporal puedes dejar 0 kg; el volumen externo será 0.
        </p>
      </section>

      <ExercisePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdd={handleAddExercise}
        onRequestCreate={() => {
          setPickerOpen(false)
          setNewExerciseOpen(true)
        }}
      />
      <ExerciseFormModal
        open={newExerciseOpen}
        onClose={() => setNewExerciseOpen(false)}
        onSaved={(exercise) => {
          void handleAddExercise(exercise)
        }}
      />
      <WorkoutFormModal
        open={editWorkoutOpen}
        onClose={() => setEditWorkoutOpen(false)}
        defaultDate={workout.date}
        workout={workout}
      />

      <ConfirmDialog
        open={Boolean(removingExercise)}
        title="Quitar ejercicio"
        message={`Se eliminarán también las series registradas de «${removingExercise?.exerciseName ?? ''}» en esta sesión.`}
        confirmLabel="Quitar ejercicio"
        danger
        onConfirm={handleRemoveExercise}
        onClose={() => setRemovingExercise(undefined)}
      />
      <ConfirmDialog
        open={deletingWorkout}
        title="Eliminar sesión"
        message={`¿Quieres eliminar «${workout.name}» y todas sus series? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar sesión"
        danger
        onConfirm={handleDeleteWorkout}
        onClose={() => setDeletingWorkout(false)}
      />
      <ConfirmDialog
        open={confirmFinish}
        title="Finalizar sin series"
        message="No has marcado ninguna serie efectiva como completada. ¿Quieres finalizar la sesión de todos modos?"
        confirmLabel="Finalizar igualmente"
        onConfirm={async () => {
          setConfirmFinish(false)
          await handleStatus('completed')
        }}
        onClose={() => setConfirmFinish(false)}
      />
    </div>
  )
}
