import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  ChevronRight,
  Dumbbell,
  ListChecks,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import type { Exercise, MuscleGroup, Workout } from '../types'
import { MUSCLE_GROUPS, MUSCLE_LABELS } from '../types'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { PageHeader } from '../components/ui/PageHeader'
import { DateNavigator } from '../components/ui/DateNavigator'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { WorkoutFormModal } from '../components/training/WorkoutFormModal'
import { ExerciseFormModal } from '../components/training/ExerciseFormModal'
import { trainingPeriodSummary } from '../lib/analytics'
import { workoutStats } from '../lib/calculations'
import {
  endOfWeekISO,
  formatDuration,
  formatMonthYear,
  formatShortEs,
  formatWeekdayShortEs,
  minutesBetween,
  startOfWeekISO,
  weekLabel,
} from '../lib/dates'
import { formatNumber } from '../lib/format'
import { deleteExercise } from '../lib/repositories'
import { WORKOUT_STATUS_CLASSES, WORKOUT_STATUS_LABELS } from '../lib/workoutUi'
import { cn } from '../lib/cn'
import { useWorkouts, useWorkoutExercises, useSets, useExercises } from '../hooks/useSupabaseData'
import { ExercisePhoto } from '../components/training/ExercisePhoto'

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function TrainingPage() {
  const { selectedDate, settings, notify } = useApp()
  const { user } = useAuth()
  const isAdmin = user?.email === 'mamenromerovera@gmail.com'
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'ejercicios' ? 'ejercicios' : 'sesiones'

  const { data: workoutsData, loading: workoutsLoading } = useWorkouts()
  const { data: workoutExercisesData } = useWorkoutExercises()
  const { data: setsData } = useSets()
  const { data: exercisesData } = useExercises()

  const workouts = workoutsData ?? []
  const workoutExercises = workoutExercisesData ?? []
  const sets = setsData ?? []
  const exercises = exercisesData ?? []

  const [workoutModalOpen, setWorkoutModalOpen] = useState(false)
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | undefined>(undefined)
  const [deletingExercise, setDeletingExercise] = useState<Exercise | undefined>(undefined)
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [exerciseGroup, setExerciseGroup] = useState<MuscleGroup | ''>('')
  const [historySearch, setHistorySearch] = useState('')

  useEffect(() => {
    if (!searchParams.get('nuevo')) return
    setWorkoutModalOpen(true)
    const next = new URLSearchParams(searchParams)
    next.delete('nuevo')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const selectedWorkouts = workouts.filter((workout) => workout.date === selectedDate)
  const weekStart = startOfWeekISO(selectedDate)
  const weekEnd = endOfWeekISO(selectedDate)
  const weekSummary = trainingPeriodSummary(workouts, sets, weekStart, weekEnd)

  const statsByWorkout = useMemo(() => {
    const exerciseCounts = new Map<string, number>()
    for (const exercise of workoutExercises) {
      exerciseCounts.set(exercise.workoutId, (exerciseCounts.get(exercise.workoutId) ?? 0) + 1)
    }
    const setsByWorkout = new Map<string, typeof sets>()
    for (const set of sets) {
      const list = setsByWorkout.get(set.workoutId) ?? []
      list.push(set)
      setsByWorkout.set(set.workoutId, list)
    }
    return new Map(
      workouts.map((workout) => [
        workout.id,
        workoutStats(setsByWorkout.get(workout.id) ?? [], exerciseCounts.get(workout.id) ?? 0),
      ]),
    )
  }, [workouts, workoutExercises, sets])

  const usageByExercise = useMemo(() => {
    const map = new Map<string, number>()
    for (const exercise of workoutExercises) {
      if (exercise.exerciseId) map.set(exercise.exerciseId, (map.get(exercise.exerciseId) ?? 0) + 1)
    }
    return map
  }, [workoutExercises])

  const filteredExercises = useMemo(() => {
    const term = normalize(exerciseSearch.trim())
    return exercises.filter((exercise) => {
      if (exerciseGroup && exercise.muscleGroup !== exerciseGroup) return false
      if (!term) return true
      return normalize(`${exercise.name} ${exercise.equipment ?? ''}`).includes(term)
    })
  }, [exercises, exerciseSearch, exerciseGroup])

  const historyGroups = useMemo(() => {
    const term = normalize(historySearch.trim())
    const filtered = workouts
      .filter((workout) => workout.date !== selectedDate)
      .filter((workout) => !term || normalize(workout.name).includes(term))
      .slice(0, 40)
    const groups = new Map<string, Workout[]>()
    for (const workout of filtered) {
      const key = formatMonthYear(workout.date)
      const list = groups.get(key) ?? []
      list.push(workout)
      groups.set(key, list)
    }
    return Array.from(groups.entries())
  }, [workouts, selectedDate, historySearch])

  const setTab = (nextTab: 'sesiones' | 'ejercicios') => {
    const next = new URLSearchParams(searchParams)
    if (nextTab === 'ejercicios') next.set('tab', 'ejercicios')
    else next.delete('tab')
    setSearchParams(next, { replace: true })
  }

  const openNewExercise = () => {
    setEditingExercise(undefined)
    setExerciseModalOpen(true)
  }

  const handleDeleteExercise = async () => {
    if (!deletingExercise) return
    try {
      await deleteExercise(deletingExercise.id)
      notify('Ejercicio eliminado de la biblioteca. Su historial se conserva.')
      setDeletingExercise(undefined)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar el ejercicio'
      notify(msg, 'error')
    }
  }

  const renderWorkoutCard = (workout: Workout) => {
    const stats = statsByWorkout.get(workout.id) ?? workoutStats([])
    const duration =
      workout.startedAt && workout.finishedAt ? minutesBetween(workout.startedAt, workout.finishedAt) : 0
    return (
      <article key={workout.id} className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-fg">{workout.name}</h3>
            <p className="mt-0.5 text-[10px] text-faint">
              {formatWeekdayShortEs(workout.date)} {formatShortEs(workout.date)}
              {duration > 0 ? ` · ${formatDuration(duration)}` : ''}
            </p>
          </div>
          <span className={WORKOUT_STATUS_CLASSES[workout.status]}>{WORKOUT_STATUS_LABELS[workout.status]}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted">
          <span className="flex items-center gap-1">
            <Dumbbell className="h-3 w-3 text-faint" /> {stats.exerciseCount} ejercicios
          </span>
          <span className="flex items-center gap-1">
            <ListChecks className="h-3 w-3 text-faint" /> {stats.effectiveSets} series ef.
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-faint" /> {formatNumber(stats.volume, 0)} kg
          </span>
          {stats.pendingSets > 0 ? <span className="text-amber-400">{stats.pendingSets} pendientes</span> : null}
        </div>
        {workout.notes ? <p className="mt-2 line-clamp-2 text-[11px] text-muted">{workout.notes}</p> : null}
        <Link
          to={`/entrenamiento/sesion/${workout.id}`}
          className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-line py-2 text-[11px] font-medium text-muted transition hover:border-lime-500/40 hover:text-accent"
        >
          Abrir sesión <ChevronRight className="h-3 w-3" />
        </Link>
      </article>
    )
  }

  if (!settings || workoutsLoading) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-12 w-60" />
        <div className="skeleton h-16 w-full" />
        <div className="skeleton h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader
        eyebrow="Fuerza"
        title="Entrenamiento"
        subtitle="Registra cada serie con su peso y repeticiones. El volumen y las series efectivas se calculan solos."
        actions={
          <Button size="sm" onClick={() => setWorkoutModalOpen(true)}>
            <Plus className="h-4 w-4" /> Nueva sesión
          </Button>
        }
      />

      <DateNavigator />

      <div className="segmented" role="tablist" aria-label="Secciones de entrenamiento">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'sesiones'}
          onClick={() => setTab('sesiones')}
          className={cn('segmented-item flex items-center gap-1.5', tab === 'sesiones' && 'segmented-item-active')}
        >
          <CalendarDays className="h-3.5 w-3.5" /> Sesiones
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'ejercicios'}
          onClick={() => setTab('ejercicios')}
          className={cn('segmented-item flex items-center gap-1.5', tab === 'ejercicios' && 'segmented-item-active')}
        >
          <Dumbbell className="h-3.5 w-3.5" /> Ejercicios
          <span className="rounded-full bg-line px-1.5 py-0.5 text-[9px] tabular">{exercises.length}</span>
        </button>
      </div>

      {tab === 'sesiones' ? (
        <div className="space-y-5">
          <section className="card-pad bg-gradient-to-br from-surface to-lime-400/[0.035]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="eyebrow">Semana actual</p>
                <p className="mt-1 text-xs text-muted">{weekLabel(weekStart)}</p>
              </div>
              <span className="chip">{weekSummary.sessions} sesiones</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-line bg-raised/60 p-2.5">
                <p className="text-[9px] uppercase tracking-wide text-faint">Volumen</p>
                <p className="mt-1 font-display text-2xl font-semibold leading-none tabular text-fg">
                  {formatNumber(weekSummary.volume, 0)}
                </p>
                <p className="text-[9px] text-faint">kg levantados</p>
              </div>
              <div className="rounded-xl border border-line bg-raised/60 p-2.5">
                <p className="text-[9px] uppercase tracking-wide text-faint">Series ef.</p>
                <p className="mt-1 font-display text-2xl font-semibold leading-none tabular text-fg">
                  {weekSummary.effectiveSets}
                </p>
                <p className="text-[9px] text-faint">sin calentamiento</p>
              </div>
              <div className="rounded-xl border border-line bg-raised/60 p-2.5">
                <p className="text-[9px] uppercase tracking-wide text-faint">Duración media</p>
                <p className="mt-1 font-display text-2xl font-semibold leading-none tabular text-fg">
                  {weekSummary.avgMinutes > 0 ? weekSummary.avgMinutes : '—'}
                </p>
                <p className="text-[9px] text-faint">minutos</p>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fg">Sesiones del día seleccionado</h2>
              <span className="text-[10px] text-faint">{formatShortEs(selectedDate)}</span>
            </div>
            {selectedWorkouts.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={<Dumbbell className="h-5 w-5" />}
                  title="Sin sesiones para este día"
                  description="Crea una sesión nueva o programa un entrenamiento para esta fecha."
                  action={
                    <Button onClick={() => setWorkoutModalOpen(true)}>
                      <Plus className="h-4 w-4" /> Crear sesión
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {selectedWorkouts.map(renderWorkoutCard)}
              </div>
            )}
          </section>

          <section>
            <div className="mb-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-fg">Historial</h2>
                <p className="mt-0.5 text-[10px] text-faint">Tus últimas sesiones, ordenadas por fecha.</p>
              </div>
              <div className="relative sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
                <input
                  type="search"
                  value={historySearch}
                  onChange={(event) => setHistorySearch(event.target.value)}
                  placeholder="Buscar sesión…"
                  className="input py-2 pl-8 text-xs"
                  aria-label="Buscar en el historial"
                />
              </div>
            </div>

            {workouts.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={<CalendarDays className="h-5 w-5" />}
                  title="Tu historial está vacío"
                  description="Cuando completes tu primera sesión aparecerá aquí, con su volumen y sus series."
                />
              </div>
            ) : historyGroups.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={<Search className="h-5 w-5" />}
                  title="Sin coincidencias"
                  description="No hay sesiones que coincidan con la búsqueda."
                />
              </div>
            ) : (
              <div className="space-y-5">
                {historyGroups.map(([month, monthWorkouts]) => (
                  <div key={month}>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-faint">{month}</p>
                    <div className="card divide-y divide-line/70 overflow-hidden">
                      {monthWorkouts.map((workout) => {
                        const stats = statsByWorkout.get(workout.id) ?? workoutStats([])
                        const duration =
                          workout.startedAt && workout.finishedAt
                            ? minutesBetween(workout.startedAt, workout.finishedAt)
                            : 0
                        return (
                          <Link
                            key={workout.id}
                            to={`/entrenamiento/sesion/${workout.id}`}
                            className="flex items-center gap-3 px-3.5 py-3 transition hover:bg-raised/50"
                          >
                            <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-line bg-raised">
                              <span className="font-display text-base font-semibold leading-none text-fg">
                                {Number(workout.date.slice(8, 10))}
                              </span>
                              <span className="mt-0.5 text-[8px] uppercase text-faint">
                                {formatShortEs(workout.date).split(' ')[1]}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-[13px] font-medium text-fg">{workout.name}</p>
                                <span className={cn(WORKOUT_STATUS_CLASSES[workout.status], 'hidden sm:inline-flex')}>
                                  {WORKOUT_STATUS_LABELS[workout.status]}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[10px] tabular text-faint">
                                {stats.effectiveSets} series · {formatNumber(stats.volume, 0)} kg
                                {duration > 0 ? ` · ${formatDuration(duration)}` : ''}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-faint" />
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
              <input
                type="search"
                value={exerciseSearch}
                onChange={(event) => setExerciseSearch(event.target.value)}
                placeholder="Buscar por nombre o material…"
                className="input pl-9"
                aria-label="Buscar ejercicio en la biblioteca"
              />
            </div>
            <select
              value={exerciseGroup}
              onChange={(event) => setExerciseGroup(event.target.value as MuscleGroup | '')}
              className="input sm:w-48"
              aria-label="Filtrar por grupo muscular"
            >
              <option value="">Todos los grupos</option>
              {MUSCLE_GROUPS.map((group) => (
                <option key={group.value} value={group.value}>
                  {group.label}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={openNewExercise}>
              <Plus className="h-4 w-4" /> Nuevo
            </Button>
          </div>

          {exercises.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<Dumbbell className="h-5 w-5" />}
                title="Biblioteca de ejercicios vacía"
                description="Crea tus ejercicios para registrar pesos y comparar tu fuerza con el tiempo."
                action={<Button onClick={openNewExercise}>Crear ejercicio</Button>}
              />
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<Search className="h-5 w-5" />}
                title="Sin resultados"
                description="Prueba con otro nombre o cambia el grupo muscular."
              />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredExercises.map((exercise) => {
                const usage = usageByExercise.get(exercise.id) ?? 0
                return (
                  <article key={exercise.id} className="card flex flex-col p-4">
                    <div className="flex items-start gap-3">
                      <ExercisePhoto imagePath={exercise.imageUrl} alt={exercise.name} size="md" />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-fg">{exercise.name}</h3>
                        <p className="mt-0.5 text-[10px] text-faint">
                          {MUSCLE_LABELS[exercise.muscleGroup]}
                          {exercise.equipment ? ` · ${exercise.equipment}` : ''}
                        </p>
                      </div>
                    </div>
                    {exercise.notes ? <p className="mt-2 line-clamp-2 text-[11px] text-muted">{exercise.notes}</p> : null}
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
                      <span className="text-[10px] text-faint">
                        {usage > 0 ? `${usage} ${usage === 1 ? 'sesión' : 'sesiones'}` : 'Sin usar aún'}
                      </span>
                      <div className="flex gap-1.5">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingExercise(exercise)
                              setExerciseModalOpen(true)
                            }}
                            className="btn-icon h-8 w-8"
                            aria-label={`Editar ${exercise.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setDeletingExercise(exercise)}
                            className="btn-icon h-8 w-8 hover:text-rose-400"
                            aria-label={`Eliminar ${exercise.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      <WorkoutFormModal
        open={workoutModalOpen}
        onClose={() => setWorkoutModalOpen(false)}
        defaultDate={selectedDate}
        onSaved={() => {
          // Refresh data after creating a workout
        }}
      />
      <ExerciseFormModal
        open={exerciseModalOpen}
        exercise={editingExercise}
        onClose={() => {
          setExerciseModalOpen(false)
          setEditingExercise(undefined)
        }}
        onSaved={() => {
          // Refresh data after creating/editing exercise
        }}
      />
      <ConfirmDialog
        open={Boolean(deletingExercise)}
        title="Eliminar ejercicio"
        message={`¿Quieres eliminar «${deletingExercise?.name ?? ''}» de la biblioteca? Las sesiones anteriores conservan su nombre y sus series.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDeleteExercise}
        onClose={() => setDeletingExercise(undefined)}
      />
    </div>
  )
}