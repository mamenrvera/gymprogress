import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Flame,
  Plus,
  Scale,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react'
import type { MealType, Workout } from '../types'
import { MEAL_LABELS, MEAL_TYPES } from '../types'
import { useApp } from '../context/AppContext'
import { PageHeader } from '../components/ui/PageHeader'
import { DateNavigator } from '../components/ui/DateNavigator'
import { MacroRing } from '../components/ui/MacroRing'
import { Button } from '../components/ui/Button'
import { MacroEnergyNotice } from '../components/nutrition/NutritionSummary'
import { AddFoodModal } from '../components/nutrition/AddFoodModal'
import { WeightModal } from '../components/nutrition/WeightModal'
import { sumEntries, progressValue, workoutStats, bmi } from '../lib/calculations'
import { bodyWeightSummary } from '../lib/analytics'
import { formatDuration, greetingForHour, isToday, minutesBetween, capitalize, formatLongEs } from '../lib/dates'
import { formatGrams, formatKcal, formatKg, formatNumber, formatPercent, formatSigned } from '../lib/format'
import { setWorkoutStatus } from '../lib/repositories'
import { cn } from '../lib/cn'
import { useEntries, useWorkouts, useWorkoutExercises, useSets, useBodyWeights } from '../hooks/useSupabaseData'
import { scoreFood, scoreDay, dailyScoreLabel } from '../lib/nutritionScore'

const STATUS_LABEL: Record<Workout['status'], string> = {
  planned: 'Planificada',
  in_progress: 'En curso',
  completed: 'Completada',
}

const STATUS_CLASS: Record<Workout['status'], string> = {
  planned: 'chip border-sky-500/30 bg-sky-500/10 text-sky-400',
  in_progress: 'chip border-amber-500/30 bg-amber-500/10 text-amber-400',
  completed: 'chip border-lime-500/30 bg-lime-400/10 text-accent',
}

export function HomePage() {
  const { settings, selectedDate, notify } = useApp()
  const navigate = useNavigate()
  const [addOpen, setAddOpen] = useState(false)
  const [addMeal, setAddMeal] = useState<MealType>('almuerzo')
  const [weightOpen, setWeightOpen] = useState(false)
  const [starting, setStarting] = useState(false)

  // Supabase data hooks
  const { data: entries, loading: entriesLoading } = useEntries(selectedDate)
  const { data: workouts, loading: workoutsLoading } = useWorkouts(selectedDate)
  const { data: bodyWeights } = useBodyWeights()

  const allEntries = entries ?? []
  const allWorkouts = workouts ?? []
  const allBodyWeights = bodyWeights ?? []

  // Derive workout exercises and sets from workouts
  const workoutIds = useMemo(() => allWorkouts.map(w => w.id), [allWorkouts])
  const { data: allWorkoutExercises } = useWorkoutExercises()
  const { data: allSets } = useSets()

  const workoutExercises = useMemo(() => {
    if (!allWorkoutExercises) return []
    return allWorkoutExercises.filter(we => workoutIds.includes(we.workoutId))
  }, [allWorkoutExercises, workoutIds])

  const sets = useMemo(() => {
    if (!allSets) return []
    return allSets.filter(s => workoutIds.includes(s.workoutId))
  }, [allSets, workoutIds])

  const totals = useMemo(() => sumEntries(allEntries), [allEntries])

  const dailyScore = useMemo(() => {
    const dailyEntries = allEntries.map((e) => ({
      foodName: e.foodName,
      grams: e.grams,
      per100: e.per100,
      foodScore: scoreFood({ per100: e.per100 }).score,
    }))
    return scoreDay({
      entries: dailyEntries,
      targets: settings?.targets
        ? { calories: settings.targets.calories, protein: settings.targets.protein, carbs: settings.targets.carbs, fat: settings.targets.fat }
        : { calories: 2000, protein: 150, carbs: 200, fat: 70 },
      date: selectedDate,
    })
  }, [allEntries, settings, selectedDate])
  const calories = progressValue(totals.calories, settings?.targets.calories ?? 0)
  const weightSummary = useMemo(() => bodyWeightSummary(allBodyWeights), [allBodyWeights])
  const latestWeight = weightSummary.latest
  const weightDelta =
    allBodyWeights.length >= 2 && latestWeight
      ? latestWeight.weightKg - allBodyWeights.slice().sort((a, b) => a.date.localeCompare(b.date))[0].weightKg
      : 0

  const primaryWorkout = useMemo(() => {
    const order: Record<Workout['status'], number> = { in_progress: 0, planned: 1, completed: 2 }
    return allWorkouts.slice().sort((a, b) => order[a.status] - order[b.status] || b.updatedAt.localeCompare(a.updatedAt))[0]
  }, [allWorkouts])

  const primaryExercises = primaryWorkout
    ? workoutExercises.filter((exercise) => exercise.workoutId === primaryWorkout.id)
    : []
  const primarySets = primaryWorkout ? sets.filter((set) => set.workoutId === primaryWorkout.id) : []
  const primaryStats = workoutStats(primarySets, primaryExercises.length)
  const primaryDuration =
    primaryWorkout?.startedAt && primaryWorkout.finishedAt
      ? minutesBetween(primaryWorkout.startedAt, primaryWorkout.finishedAt)
      : 0

  const meals = MEAL_TYPES.map((meal) => ({
    ...meal,
    entries: allEntries.filter((entry) => entry.meal === meal.value),
  })).map((meal) => ({ ...meal, totals: sumEntries(meal.entries) }))

  const visibleMeals = meals.filter((meal) => meal.entries.length > 0 || ['desayuno', 'almuerzo', 'comida', 'cena'].includes(meal.value))

  const openAdd = (meal: MealType) => {
    setAddMeal(meal)
    setAddOpen(true)
  }

  const handleStartWorkout = async (workout: Workout) => {
    setStarting(true)
    try {
      if (workout.status === 'planned') await setWorkoutStatus(workout.id, 'in_progress')
      navigate(`/entrenamiento/sesion/${workout.id}`)
    } catch {
      notify('No se pudo abrir la sesión', 'error')
    } finally {
      setStarting(false)
    }
  }

  if (!settings || entriesLoading || workoutsLoading) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-12 w-56" />
        <div className="skeleton h-16 w-full" />
        <div className="skeleton h-64 w-full" />
      </div>
    )
  }

  const dateLabel = isToday(selectedDate) ? 'hoy' : capitalize(formatLongEs(selectedDate))

  return (
    <div className="animate-fade-up space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow={isToday(selectedDate) ? greetingForHour() : 'Resumen del día'}
        title={settings.profile.name ? `Hola, ${settings.profile.name}` : 'Tu progreso diario'}
        subtitle={
          isToday(selectedDate)
            ? 'Cada comida y cada serie cuentan. Este es el resumen de tu día.'
            : `Estás consultando ${dateLabel}. Puedes registrar datos para esta fecha.`
        }
        actions={
          <Button variant="secondary" size="sm" onClick={() => setWeightOpen(true)}>
            <Scale className="h-4 w-4" />
            Registrar peso
          </Button>
        }
      />

      <DateNavigator />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="relative overflow-hidden rounded-2xl border border-lime-500/20 bg-gradient-to-br from-surface via-surface to-lime-400/[0.045] p-5 shadow-card sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-lime-400/10 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="eyebrow flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-accent" /> Energía diaria
              </p>
              <div className="flex items-center gap-1.5">
                <span className={cn('chip', calories.exceeded && 'chip-danger')}>
                  {formatPercent(calories.percent)} del objetivo
                </span>
                {calories.exceeded ? <span className="chip-danger">Exceso</span> : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
              <span
                className={cn(
                  'font-display text-[58px] font-semibold leading-[0.85] tracking-tight tabular sm:text-[72px]',
                  calories.exceeded ? 'text-rose-400' : 'text-fg',
                )}
              >
                {formatKcal(totals.calories)}
              </span>
              <span className="pb-1.5 text-sm text-muted">
                de <strong className="font-semibold text-fg">{formatKcal(settings.targets.calories)}</strong> kcal
              </span>
            </div>

            <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-700 ease-out',
                  calories.exceeded ? 'bg-rose-400' : 'bg-gradient-to-r from-lime-600 via-lime-400 to-lime-300',
                )}
                style={{ width: `${calories.visualPercent}%` }}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className={calories.exceeded ? 'text-rose-400' : 'text-muted'}>
                {calories.exceeded
                  ? `${formatKcal(Math.abs(calories.remaining))} kcal por encima`
                  : `Te quedan ${formatKcal(calories.remaining)} kcal`}
              </span>
              <span className="text-faint">
                Etiqueta {formatKcal(totals.calories)} kcal · macros {formatKcal(totals.caloriesEstimated)} kcal
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => openAdd('almuerzo')}>
                <Plus className="h-4 w-4" /> Añadir alimento
              </Button>
              <Link to="/alimentacion" className="btn-secondary px-3 py-2 text-xs">
                Ver diario completo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        <section className="card-pad flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow flex items-center gap-1.5">
              <Dumbbell className="h-3.5 w-3.5 text-accent" /> Entrenamiento
            </p>
            <Link to="/entrenamiento" className="text-[11px] font-medium text-faint transition hover:text-accent">
              Ver todo
            </Link>
          </div>

          {primaryWorkout ? (
            <div className="mt-3 flex flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-fg">{primaryWorkout.name}</h2>
                  <p className="mt-0.5 text-[10px] text-faint">
                    {allWorkouts.length > 1 ? `${allWorkouts.length} sesiones este día · ` : ''}
                    {primaryWorkout.status === 'completed'
                      ? primaryDuration > 0
                        ? `Duración ${formatDuration(primaryDuration)}`
                        : 'Sesión completada'
                      : primaryWorkout.status === 'in_progress'
                        ? 'Sesión en curso'
                        : 'Sesión programada'}
                  </p>
                </div>
                <span className={STATUS_CLASS[primaryWorkout.status]}>{STATUS_LABEL[primaryWorkout.status]}</span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-line bg-raised/60 p-2.5 text-center">
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-faint">Ejercicios</p>
                  <p className="mt-0.5 text-lg font-semibold tabular text-fg">{primaryStats.exerciseCount}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-faint">Series ef.</p>
                  <p className="mt-0.5 text-lg font-semibold tabular text-fg">{primaryStats.effectiveSets}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-faint">Volumen</p>
                  <p className="mt-0.5 text-lg font-semibold tabular text-fg">{formatNumber(primaryStats.volume, 0)}</p>
                  <p className="text-[9px] text-faint">kg</p>
                </div>
              </div>

              <div className="mt-auto pt-4">
                <Button
                  className="w-full"
                  variant={primaryWorkout.status === 'completed' ? 'secondary' : 'primary'}
                  loading={starting}
                  onClick={() => void handleStartWorkout(primaryWorkout)}
                >
                  {primaryWorkout.status === 'completed' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Ver sesión
                    </>
                  ) : (
                    <>
                      <Dumbbell className="h-4 w-4" />
                      {primaryWorkout.status === 'in_progress' ? 'Continuar sesión' : 'Comenzar sesión'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-start justify-center py-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-raised text-faint">
                <Dumbbell className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-medium text-fg">Sin entrenamiento registrado</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Crea una sesión o programa la de hoy para registrar tus series y pesos.
              </p>
              <Link to="/entrenamiento?nuevo=1" className="btn-primary mt-4 px-3 py-2 text-xs">
                <Plus className="h-4 w-4" /> Iniciar entrenamiento
              </Link>
            </div>
          )}
        </section>
      </div>

      <section className="grid grid-cols-3 gap-2 sm:gap-4" aria-label="Macronutrientes del día">
        <div className="card p-3 sm:p-4">
          <MacroRing label="Proteínas" consumed={totals.protein} target={settings.targets.protein} color="#38bdf8" />
        </div>
        <div className="card p-3 sm:p-4">
          <MacroRing label="Grasas" consumed={totals.fat} target={settings.targets.fat} color="#fbbf24" />
        </div>
        <div className="card p-3 sm:p-4">
          <MacroRing label="Carbohidratos" consumed={totals.carbs} target={settings.targets.carbs} color="#c084fc" />
        </div>
      </section>

      {dailyScore.isEmpty ? (
        <section className="card p-4">
          <p className="text-xs text-muted">Registra tus comidas para evaluar tu alimentación.</p>
        </section>
      ) : (
        <section className="card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-fg">Calidad de alimentación de hoy</p>
            <span className="chip">{dailyScore.score.toFixed(1)}/10 · {dailyScoreLabel(dailyScore.score)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500">
            <div
              className="h-full bg-surface/0"
              style={{ width: `${(dailyScore.score / 10) * 100}%`, boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.3)' }}
            />
          </div>
          <div className="relative h-1 -mt-2">
            <div
              className="absolute top-0 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-surface bg-fg"
              style={{ left: `${(dailyScore.score / 10) * 100}%` }}
            />
          </div>
          {dailyScore.provisional && <p className="text-[10px] text-amber-400">Puntuación provisional</p>}
          {dailyScore.strengths.length > 0 && (
            <p className="text-xs text-muted">✓ {dailyScore.strengths[0]}</p>
          )}
          {dailyScore.improvements.length > 0 && (
            <p className="text-xs text-muted">↑ {dailyScore.improvements[0]}</p>
          )}
          {dailyScore.tips.length > 0 && (
            <p className="text-[10px] text-faint">{dailyScore.tips[0]}</p>
          )}
        </section>
      )}

      <MacroEnergyNotice targets={settings.targets} compact className="hidden sm:flex" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-fg">Comidas del día</h2>
              <p className="mt-0.5 text-[10px] text-faint">
                {formatKcal(totals.calories)} kcal · {formatPercent(calories.percent)} del objetivo
              </p>
            </div>
            <Link to="/alimentacion" className="text-[11px] font-medium text-accent transition hover:underline">
              Abrir diario
            </Link>
          </div>
          <ul className="divide-y divide-line/70">
            {visibleMeals.map((meal) => (
              <li key={meal.value} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-fg">{MEAL_LABELS[meal.value]}</p>
                  <p className="mt-0.5 truncate text-[10px] tabular text-faint">
                    {meal.entries.length === 0
                      ? 'Sin registrar'
                      : `${meal.entries.length} ${meal.entries.length === 1 ? 'alimento' : 'alimentos'} · P ${formatGrams(
                          meal.totals.protein,
                        )} · C ${formatGrams(meal.totals.carbs)} · G ${formatGrams(meal.totals.fat)}`}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold tabular text-fg">
                  {formatKcal(meal.totals.calories)} <span className="font-normal text-faint">kcal</span>
                </span>
                <button
                  type="button"
                  onClick={() => openAdd(meal.value)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition hover:border-lime-500/40 hover:text-accent"
                  aria-label={`Añadir a ${MEAL_LABELS[meal.value].toLowerCase()}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <Link
            to="/alimentacion"
            className="flex items-center justify-center gap-1.5 border-t border-line px-4 py-2.5 text-[11px] font-medium text-muted transition hover:bg-raised hover:text-fg"
          >
            Ver todos los alimentos <ChevronRight className="h-3 w-3" />
          </Link>
        </section>

        <section className="card-pad flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5 text-accent" /> Peso corporal
            </p>
            <Link to="/progreso" className="text-[11px] font-medium text-faint transition hover:text-accent">
              Evolución
            </Link>
          </div>
          {latestWeight ? (
            <>
              <div className="mt-3 flex items-end justify-between gap-2">
                <div>
                  <p className="font-display text-[42px] font-semibold leading-none tabular text-fg">
                    {formatKg(latestWeight.weightKg)} <span className="text-sm font-normal text-faint">kg</span>
                  </p>
                  <p className="mt-1 text-[10px] text-faint">Último registro: {latestWeight.date}</p>
                </div>
                {allBodyWeights.length >= 2 ? (
                  <span
                    className={cn(
                      'chip',
                      weightDelta < 0
                        ? 'border-lime-500/30 text-accent'
                        : weightDelta > 0
                          ? 'border-amber-500/30 text-amber-400'
                          : '',
                    )}
                  >
                    {formatSigned(weightDelta, 'kg')} desde el inicio
                  </span>
                ) : (
                  <span className="chip">Primer registro</span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded-lg border border-line bg-raised/60 px-2.5 py-2">
                  <p className="text-faint">IMC estimado</p>
                  <p className="mt-0.5 font-semibold tabular text-fg">
                    {latestWeight ? formatNumber(bmi(latestWeight.weightKg, settings.profile.heightCm)) : '—'}
                  </p>
                </div>
                <div className="rounded-lg border border-line bg-raised/60 px-2.5 py-2">
                  <p className="text-faint">Altura</p>
                  <p className="mt-0.5 font-semibold tabular text-fg">{settings.profile.heightCm} cm</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-start justify-center py-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-raised text-faint">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-medium text-fg">Sin pesajes todavía</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Regístralo para ver tu tendencia junto al entrenamiento y la nutrición.
              </p>
            </div>
          )}
          <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => setWeightOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Registrar peso
          </Button>
        </section>
      </div>

      <section className="card-pad">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-fg">Accesos rápidos</h2>
          <span className="text-[10px] text-faint">Todo en un toque</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <button
            type="button"
            onClick={() => openAdd('almuerzo')}
            className="group flex items-center gap-2.5 rounded-xl border border-line bg-raised/50 px-3 py-2.5 text-left transition hover:border-lime-500/40 hover:bg-raised"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-protein/10 text-protein">
              <Plus className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-medium leading-tight text-fg">Añadir alimento</span>
          </button>
          <button
            type="button"
            onClick={() => openAdd('comida')}
            className="group flex items-center gap-2.5 rounded-xl border border-line bg-raised/50 px-3 py-2.5 text-left transition hover:border-lime-500/40 hover:bg-raised"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-carbs/10 text-carbs">
              <UtensilsCrossed className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-medium leading-tight text-fg">Añadir comida</span>
          </button>
          <Link
            to="/entrenamiento?nuevo=1"
            className="group flex items-center gap-2.5 rounded-xl border border-line bg-raised/50 px-3 py-2.5 text-left transition hover:border-lime-500/40 hover:bg-raised"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lime-400/10 text-accent">
              <Dumbbell className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-medium leading-tight text-fg">Iniciar entrenamiento</span>
          </Link>
          <Link
            to="/progreso"
            className="group flex items-center gap-2.5 rounded-xl border border-line bg-raised/50 px-3 py-2.5 text-left transition hover:border-lime-500/40 hover:bg-raised"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-400/10 text-sky-400">
              <TrendingUp className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-medium leading-tight text-fg">Consultar progreso</span>
          </Link>
          <button
            type="button"
            onClick={() => setWeightOpen(true)}
            className="group flex items-center gap-2.5 rounded-xl border border-line bg-raised/50 px-3 py-2.5 text-left transition hover:border-lime-500/40 hover:bg-raised"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-fat/10 text-fat">
              <Scale className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-medium leading-tight text-fg">Registrar peso</span>
          </button>
        </div>
      </section>

      <p className="text-center text-[10px] text-faint">
        {isToday(selectedDate) ? 'Datos guardados en este dispositivo. Sin nube, sin cuentas.' : `Editando ${dateLabel}.`}
      </p>

      <AddFoodModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        date={selectedDate}
        defaultMeal={addMeal}
      />
      <WeightModal open={weightOpen} onClose={() => setWeightOpen(false)} defaultDate={selectedDate} />
    </div>
  )
}