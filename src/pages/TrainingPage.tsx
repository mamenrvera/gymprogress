import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  Dumbbell,
  HeartPulse,
  Pencil,
  Plus,
  Play,
  Search,
  Trash2,
} from 'lucide-react'
import type { Exercise, MuscleGroup, Workout } from '../types'
import type { CardioSession } from '../lib/cardio'
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
  minutesBetween,
  startOfWeekISO,
  weekLabel,
} from '../lib/dates'
import { formatNumber } from '../lib/format'
import { deleteExercise, createWorkout, fetchRoutines, fetchRoutineSchedules, startWorkoutFromRoutine } from '../lib/repositories'
import { cn } from '../lib/cn'
import { useWorkouts, useWorkoutExercises, useSets, useExercises, useCardioSessions } from '../hooks/useSupabaseData'
import { ExercisePhoto } from '../components/training/ExercisePhoto'
import { RoutinesTab } from '../components/training/RoutinesTab'
import { WorkoutEditor } from '../components/training/WorkoutEditor'
import { CardioFormModal } from '../components/training/CardioFormModal'
import { deleteCardioSession } from '../lib/repositories'
import { activityDisplayName, INTENSITY_LABELS } from '../lib/cardio'

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
  const tabParam = searchParams.get('tab')
  const tab = tabParam === 'ejercicios' ? 'ejercicios' : tabParam === 'rutinas' ? 'rutinas' : 'sesiones'

  const { data: workoutsData, loading: workoutsLoading, refetch: refetchWorkouts } = useWorkouts()
  const { data: workoutExercisesData } = useWorkoutExercises()
  const { data: setsData } = useSets()
  const { data: exercisesData } = useExercises()
  const { data: cardioData } = useCardioSessions()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [rts, ss] = await Promise.all([fetchRoutines(), fetchRoutineSchedules()])
        const day = selectedDate
        const dow = new Date(day).getDay()
        const matches = ss.filter((sch) => {
          if (sch.startDate > day || sch.endDate < day) return false
          if (sch.scheduleType === 'date') return sch.specificDate === day
          return (sch.weekdays || []).includes(dow)
        })
        const list = matches.map((sch) => {
          const r = rts.find((x) => x.id === sch.routineId)
          return r ? { routine: r, schedule: sch } : null
        }).filter(Boolean) as any[]
        if (!cancelled) setScheduledRoutines(list)
      } catch {
        if (!cancelled) setScheduledRoutines([])
      }
    })()
    return () => { cancelled = true }
  }, [selectedDate])

  const workouts = workoutsData ?? []





  const handleNewWorkout = async () => {
    try {
      const created = await createWorkout({ name: 'Nueva sesi\u00f3n', date: selectedDate, notes: '' }, { startNow: false })
      setActiveWorkoutId(created.id)
      void refetchWorkouts()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo crear la sesi\u00f3n', 'error')
    }
  }
  const workoutExercises = workoutExercisesData ?? []
  const sets = setsData ?? []

  const statsByWorkout = useMemo(() => {
    const exerciseCounts = new Map<string, number>()
    for (const we of workoutExercises) {
      exerciseCounts.set(we.workoutId, (exerciseCounts.get(we.workoutId) ?? 0) + 1)
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
  const exercises = exercisesData ?? []
  const equipmentOptions = Array.from(new Set(exercises.map((e) => e.equipment).filter(Boolean))).sort() as string[]
  const categoryOptions = Array.from(new Set(exercises.map((e) => e.category).filter(Boolean))).sort() as string[]
  const cardioSessions = cardioData ?? []

  const [workoutModalOpen, setWorkoutModalOpen] = useState(false)
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null)
  const [scheduledRoutines, setScheduledRoutines] = useState<{ routine: any; schedule: any }[]>([])
  const [openHistory, setOpenHistory] = useState<Set<string>>(new Set())
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | undefined>(undefined)
  const [deletingExercise, setDeletingExercise] = useState<Exercise | undefined>(undefined)
  const [cardioModalOpen, setCardioModalOpen] = useState(false)
  const [editingCardio, setEditingCardio] = useState<CardioSession | undefined>(undefined)
  const [deletingCardio, setDeletingCardio] = useState<CardioSession | undefined>(undefined)
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [exerciseGroup, setExerciseGroup] = useState<MuscleGroup | ''>('')
  const [exerciseEquipment, setExerciseEquipment] = useState('')
  const [exerciseCategory, setExerciseCategory] = useState('')
  const [historySearch, setHistorySearch] = useState('')

  useEffect(() => {
    if (!searchParams.get('nuevo')) return
    const next = new URLSearchParams(searchParams)
    next.delete('nuevo')
    setSearchParams(next, { replace: true })
    void handleNewWorkout()
  }, [searchParams, setSearchParams])

  const selectedWorkouts = workouts.filter((workout) => workout.date === selectedDate)
  const weekStart = startOfWeekISO(selectedDate)
  const weekEnd = endOfWeekISO(selectedDate)
  const weekSummary = trainingPeriodSummary(workouts, sets, weekStart, weekEnd)



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
      const matchesMuscle = !exerciseGroup || exercise.muscleGroup === exerciseGroup ||
        (exercise.primaryMuscles || []).some((m) => m === exerciseGroup) ||
        (exercise.secondaryMuscles || []).some((m) => m === exerciseGroup)
      // Note: primary/secondary store MuscleGroup slugs already mapped? We'll compare to exerciseGroup string.
      if (!matchesMuscle) return false
      if (exerciseEquipment && exercise.equipment !== exerciseEquipment) return false
      if (exerciseCategory && exercise.category !== exerciseCategory) return false
      if (!term) return true
      return normalize(`${exercise.name} ${exercise.equipment ?? ''} ${exercise.category ?? ''}`).includes(term)
    })
  }, [exercises, exerciseSearch, exerciseGroup, exerciseEquipment, exerciseCategory])

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

  const setTab = (nextTab: 'sesiones' | 'ejercicios' | 'rutinas') => {
    const next = new URLSearchParams(searchParams)
    if (nextTab === 'ejercicios') next.set('tab', 'ejercicios')
    else if (nextTab === 'rutinas') next.set('tab', 'rutinas')
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

  const handleDeleteCardio = async () => {
    if (!deletingCardio) return
    try {
      await deleteCardioSession(deletingCardio.id)
      notify('Actividad eliminada')
      setDeletingCardio(undefined)
    } catch (e) {
      notify(e instanceof Error ? e.message : 'No se pudo eliminar la actividad', 'error')
    }
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
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => { setEditingCardio(undefined); setCardioModalOpen(true) }}>
              <HeartPulse className="h-4 w-4" /> Cardio / deporte
            </Button>
            <Button size="sm" onClick={() => void handleNewWorkout()}>
              <Plus className="h-4 w-4" /> Nueva sesión
            </Button>
          </div>
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
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'rutinas'}
          onClick={() => setTab('rutinas')}
          className={cn('segmented-item flex items-center gap-1.5', tab === 'rutinas' && 'segmented-item-active')}
        >
          <CalendarDays className="h-3.5 w-3.5" /> Rutinas
        </button>
      </div>

      {tab === 'rutinas' ? (
        <RoutinesTab onWorkoutCreated={(id) => setActiveWorkoutId(id)} />
      ) : tab === 'sesiones' ? (
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
                  {weekSummary.avgMinutes > 0 ? (weekSummary.avgMinutes / 60).toFixed(1).replace('.', ',') : '—'}
                </p>
                <p className="text-[9px] text-faint">horas</p>
              </div>
            </div>
          </section>

                    {scheduledRoutines.length > 0 && (
            <div className="card-pad space-y-2">
              <p className="text-xs font-semibold text-fg">Rutinas programadas para hoy</p>
              {scheduledRoutines.map(({ routine }) => (
                <div key={routine.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-raised/50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg truncate">{routine.name}</p>
                    {routine.muscleGroup && <p className="text-[10px] text-faint">{routine.muscleGroup}</p>}
                  </div>
                  <Button size="sm" onClick={() => void (async () => { try { const w = await startWorkoutFromRoutine(routine.id, selectedDate); notify('Sesión creada desde la rutina'); setActiveWorkoutId(w.id); void refetchWorkouts() } catch (e) { notify(e instanceof Error ? e.message : 'No se pudo iniciar', 'error') } })()}>
                    <Play className="h-3.5 w-3.5" /> Iniciar entrenamiento
                  </Button>
                </div>
              ))}
            </div>
          )}

<section>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fg">Sesiones del día seleccionado</h2>
              <span className="text-[10px] text-faint">{formatShortEs(selectedDate)}</span>
            </div>
            {activeWorkoutId ? (
              <div className="card overflow-hidden">
                <WorkoutEditor workoutId={activeWorkoutId} onClose={() => { setActiveWorkoutId(null); void refetchWorkouts() }} inline />
              </div>
            ) : null}

            {selectedWorkouts.length === 0 && !activeWorkoutId ? (
              <div className="card">
                <EmptyState
                  icon={<Dumbbell className="h-5 w-5" />}
                  title="Sin sesiones para este día"
                  description="Crea una sesión nueva o programa un entrenamiento para esta fecha."
                  action={
                    <Button onClick={() => void handleNewWorkout()}>
                      <Plus className="h-4 w-4" /> Crear sesión
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="space-y-4">
                {selectedWorkouts.map((workout) => (
                  <div key={workout.id} className="card overflow-hidden">
                    <WorkoutEditor workoutId={workout.id} onClose={() => { void refetchWorkouts() }} inline />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fg">Actividades cardio y deportes del día</h2>
              <span className="text-[10px] text-faint">{formatShortEs(selectedDate)}</span>
            </div>
            {cardioSessions.filter((c) => c.date === selectedDate).length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={<HeartPulse className="h-5 w-5" />}
                  title="Sin actividades para este día"
                  description="Registra cardio, carrera, pádel u otros deportes para esta fecha."
                  action={
                    <Button size="sm" onClick={() => { setEditingCardio(undefined); setCardioModalOpen(true) }}>
                      <Plus className="h-4 w-4" /> Añadir actividad
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {cardioSessions
                  .filter((c) => c.date === selectedDate)
                  .map((session) => (
                    <article key={session.id} className="card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-fg">{activityDisplayName(session)}</h3>
                          <p className="mt-0.5 text-[10px] text-faint">
                            {formatDuration(session.durationMin)}
                            {session.distanceKm ? ` · ${session.distanceKm} km` : ''}
                            {session.avgSpeedKmh ? ` · ${session.avgSpeedKmh} km/h` : ''}
                          </p>
                        </div>
                        <span className="chip">{INTENSITY_LABELS[session.intensity]}</span>
                      </div>
                      {session.notes ? <p className="mt-2 line-clamp-2 text-[11px] text-muted">{session.notes}</p> : null}
                      <div className="mt-3 flex justify-end gap-1.5">
                        <button type="button" onClick={() => { setEditingCardio(session); setCardioModalOpen(true) }} className="btn-icon h-8 w-8" aria-label={`Editar ${activityDisplayName(session)}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setDeletingCardio(session)} className="btn-icon h-8 w-8 hover:text-rose-400" aria-label={`Eliminar ${activityDisplayName(session)}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </article>
                  ))}
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
                      {monthWorkouts.filter((w) => w.id !== activeWorkoutId).map((workout) => {
                        const stats = statsByWorkout.get(workout.id) ?? workoutStats([])
                        const duration =
                          workout.startedAt && workout.finishedAt
                            ? minutesBetween(workout.startedAt, workout.finishedAt)
                            : 0
                        const isOpen = openHistory.has(workout.id)
                        return (
                          <div key={workout.id} className="card overflow-hidden">
                            <div className="flex items-center gap-3 px-3.5 py-3">
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
                                  <span className="text-[10px] text-faint">{formatShortEs(workout.date)}</span>
                                </div>
                                <p className="mt-0.5 text-[10px] tabular text-faint">
                                  {stats.exerciseCount} ejercicios · {stats.effectiveSets} series · {formatNumber(stats.volume, 0)} kg
                                  {duration > 0 ? ` · ${formatDuration(duration)}` : ''}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenHistory((prev) => {
                                    const next = new Set(prev)
                                    if (next.has(workout.id)) next.delete(workout.id)
                                    else next.add(workout.id)
                                    return next
                                  })
                                }
                                className="btn-secondary px-3 py-1.5 text-[11px]"
                              >
                                {isOpen ? 'Cerrar sesión' : 'Abrir sesión'}
                              </button>
                            </div>
                            {isOpen ? (
                              <div className="border-t border-line">
                                <WorkoutEditor
                                  workoutId={workout.id}
                                  onClose={() => {
                                    setOpenHistory((prev) => {
                                      const next = new Set(prev)
                                      next.delete(workout.id)
                                      return next
                                    })
                                    void refetchWorkouts()
                                  }}
                                  inline
                                />
                              </div>
                            ) : null}
                          </div>
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
            <select
              value={exerciseEquipment}
              onChange={(event) => setExerciseEquipment(event.target.value)}
              className="input sm:w-40"
              aria-label="Filtrar por equipamiento"
            >
              <option value="">Todo el equipo</option>
              {equipmentOptions.map((eq) => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>
            <select
              value={exerciseCategory}
              onChange={(event) => setExerciseCategory(event.target.value)}
              className="input sm:w-40"
              aria-label="Filtrar por categoría"
            >
              <option value="">Todas las categorías</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <Button size="sm" onClick={openNewExercise}>
              <Plus className="h-4 w-4" /> Nuevo
            </Button>
          </div>

          <p className="text-[10px] text-faint">
            Exercise data by <a href="https://repdb.co" target="_blank" rel="noopener noreferrer" className="underline">RepDB (repdb.co)</a>
          </p>

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
                          {exercise.category ? ` · ${exercise.category}` : ''}
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
          void refetchWorkouts()
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
      <CardioFormModal
        open={cardioModalOpen}
        session={editingCardio}
        defaultDate={selectedDate}
        onClose={() => { setCardioModalOpen(false); setEditingCardio(undefined) }}
        onSaved={() => { /* refresh handled by hook */ }}
      />
      <ConfirmDialog
        open={Boolean(deletingCardio)}
        title="Eliminar actividad"
        message={`¿Quieres eliminar «${deletingCardio ? activityDisplayName(deletingCardio) : ''}»?`}
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDeleteCardio}
        onClose={() => setDeletingCardio(undefined)}
      />
    </div>
  )
}