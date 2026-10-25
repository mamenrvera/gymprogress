import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Activity,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Dumbbell,
  Flame,
  LineChart as LineChartIcon,
  Plus,
  Scale,
  Trash2,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { BodyWeight } from '../types'
import { db } from '../lib/db'
import { useApp } from '../context/AppContext'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ProgressBar } from '../components/ui/ProgressBar'
import { WeightModal } from '../components/nutrition/WeightModal'
import { MacroEnergyNotice } from '../components/nutrition/NutritionSummary'
import {
  bodyWeightSummary,
  dailyNutritionSeries,
  exerciseHistoryOptions,
  muscleGroupDistribution,
  nutritionPeriodSummary,
  strengthHistory,
  trainingPeriodSummary,
  volumeByWeek,
} from '../lib/analytics'
import { bmi, macroDistribution } from '../lib/calculations'
import {
  addDaysISO,
  formatLongEs,
  formatMediumEs,
  formatShortEs,
  startOfWeekISO,
  todayISO,
  weekLabel,
} from '../lib/dates'
import { formatGrams, formatKcal, formatKg, formatNumber, formatPercent, formatSigned } from '../lib/format'
import { deleteBodyWeight } from '../lib/repositories'
import { cn } from '../lib/cn'

type Period = 'week' | 'month'
type WeightRange = '30' | '90' | 'all'

const tooltipStyle = {
  background: 'rgb(var(--c-elevated))',
  border: '1px solid rgb(var(--c-line))',
  borderRadius: '12px',
  fontSize: '11px',
  color: 'rgb(var(--c-fg))',
  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
}

const MUSCLE_COLORS = ['#bef264', '#38bdf8', '#c084fc', '#fbbf24', '#fb7185', '#34d399', '#f472b6', '#60a5fa', '#facc15', '#a3e635', '#94a3b8', '#e879f9']

function SectionHeading({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-2.5 flex items-end justify-between gap-2">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-lime-400/10 text-accent">
          {icon}
        </span>
        <div>
          <h2 className="text-sm font-semibold text-fg">{title}</h2>
          {description ? <p className="mt-0.5 text-[10px] text-faint">{description}</p> : null}
        </div>
      </div>
      {action}
    </div>
  )
}

function DeltaBadge({ delta, unit, decimals = 1 }: { delta: number | null; unit: string; decimals?: number }) {
  if (delta === null) {
    return <span className="text-[10px] text-faint">Sin periodo anterior</span>
  }
  const positive = delta > 0
  const zero = delta === 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular',
        zero ? 'bg-line/60 text-faint' : positive ? 'bg-lime-400/10 text-accent' : 'bg-amber-500/10 text-amber-400',
      )}
    >
      {zero ? null : positive ? <TrendingUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
      {formatSigned(delta, unit, decimals)}
    </span>
  )
}

function KpiCard({
  label,
  value,
  unit,
  hint,
  delta,
  deltaUnit,
  icon,
  decimals = 0,
}: {
  label: string
  value: number
  unit: string
  hint: string
  delta: number | null
  deltaUnit: string
  icon: ReactNode
  decimals?: number
}) {
  return (
    <div className="card-pad">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-faint">{label}</p>
        <span className="text-faint">{icon}</span>
      </div>
      <p className="mt-2 font-display text-3xl font-semibold leading-none tabular text-fg">
        {formatNumber(value, decimals)} <span className="text-xs font-normal text-faint">{unit}</span>
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <DeltaBadge delta={delta} unit={deltaUnit} decimals={decimals} />
        <span className="text-[9px] text-faint">{hint}</span>
      </div>
    </div>
  )
}

export function ProgressPage() {
  const { settings, notify } = useApp()
  const [period, setPeriod] = useState<Period>('week')
  const [weightRange, setWeightRange] = useState<WeightRange>('90')
  const [weightOpen, setWeightOpen] = useState(false)
  const [deletingWeight, setDeletingWeight] = useState<BodyWeight | undefined>(undefined)
  const [strengthKey, setStrengthKey] = useState('')

  const entries = useLiveQuery(() => db.entries.toArray(), []) ?? []
  const workouts = useLiveQuery(() => db.workouts.toArray(), []) ?? []
  const workoutExercises = useLiveQuery(() => db.workoutExercises.toArray(), []) ?? []
  const sets = useLiveQuery(() => db.sets.toArray(), []) ?? []
  const bodyWeights = useLiveQuery(() => db.bodyWeights.orderBy('date').toArray(), []) ?? []

  const endISO = todayISO()
  const days = period === 'week' ? 7 : 30
  const startISO = addDaysISO(endISO, -(days - 1))
  const previousEndISO = addDaysISO(startISO, -1)
  const previousStartISO = addDaysISO(previousEndISO, -(days - 1))

  const nutrition = nutritionPeriodSummary(entries, startISO, endISO)
  const previousNutrition = nutritionPeriodSummary(entries, previousStartISO, previousEndISO)
  const training = trainingPeriodSummary(workouts, sets, startISO, endISO)
  const previousTraining = trainingPeriodSummary(workouts, sets, previousStartISO, previousEndISO)
  const daily = dailyNutritionSeries(entries, startISO, endISO)
  const weeklyVolume = volumeByWeek(workouts, sets, endISO, period === 'week' ? 8 : 12)
  const muscleGroups = muscleGroupDistribution(workouts, workoutExercises, sets, startISO, endISO)
  const exerciseOptions = useMemo(
    () => exerciseHistoryOptions(workouts, workoutExercises, sets),
    [workouts, workoutExercises, sets],
  )
  const strength = useMemo(
    () => (strengthKey ? strengthHistory(workouts, workoutExercises, sets, strengthKey) : []),
    [workouts, workoutExercises, sets, strengthKey],
  )
  const selectedExercise = exerciseOptions.find((exercise) => exercise.key === strengthKey)

  useEffect(() => {
    if (exerciseOptions.length === 0) {
      if (strengthKey) setStrengthKey('')
      return
    }
    if (!strengthKey || !exerciseOptions.some((exercise) => exercise.key === strengthKey)) {
      setStrengthKey(exerciseOptions[0].key)
    }
  }, [exerciseOptions, strengthKey])

  const weightSummary = bodyWeightSummary(bodyWeights)
  const periodWeights = bodyWeightSummary(bodyWeights, startISO, endISO)
  const previousWeights = bodyWeightSummary(bodyWeights, previousStartISO, previousEndISO)
  const weightDeltaPeriod =
    periodWeights.entries.length >= 2
      ? periodWeights.entries[periodWeights.entries.length - 1].weightKg - periodWeights.entries[0].weightKg
      : null
  const previousWeightDelta =
    previousWeights.entries.length >= 2
      ? previousWeights.entries[previousWeights.entries.length - 1].weightKg - previousWeights.entries[0].weightKg
      : null

  const weightChartData = useMemo(() => {
    const limit = weightRange === '30' ? 30 : weightRange === '90' ? 90 : null
    const minDate = limit ? addDaysISO(endISO, -(limit - 1)) : null
    return bodyWeights
      .filter((weight) => !minDate || weight.date >= minDate)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((weight) => ({ ...weight, label: formatShortEs(weight.date) }))
  }, [bodyWeights, weightRange, endISO])

  const recentWeights = useMemo(() => {
    const sorted = bodyWeights.slice().sort((a, b) => a.date.localeCompare(b.date))
    return sorted
      .map((weight, index) => ({
        ...weight,
        delta: index > 0 ? weight.weightKg - sorted[index - 1].weightKg : null,
      }))
      .reverse()
      .slice(0, 8)
  }, [bodyWeights])

  const macroAvg = {
    protein: nutrition.avgProtein,
    carbs: nutrition.avgCarbs,
    fat: nutrition.avgFat,
    calories: nutrition.avgCaloriesLogged,
  }
  const macroPie = macroDistribution({
    calories: macroAvg.calories,
    caloriesEstimated: 0,
    protein: macroAvg.protein,
    carbs: macroAvg.carbs,
    fat: macroAvg.fat,
    fiber: nutrition.avgFiber,
  }).filter((item) => item.value > 0)
  const macroPieKcal = macroPie.reduce((sum, item) => sum + item.value, 0)
  const hasNutritionData = nutrition.loggedDays > 0
  const hasWeeklyVolume = weeklyVolume.some((week) => week.volume > 0)
  const strengthMax = strength.reduce((max, point) => Math.max(max, point.e1rm), 0)
  const strengthPr = strength.reduce(
    (best, point) => (point.maxWeight > (best?.maxWeight ?? 0) ? point : best),
    undefined as (typeof strength)[number] | undefined,
  )

  const comparisonRows = [
    {
      label: 'Calorías medias / día',
      current: nutrition.loggedDays ? nutrition.avgCaloriesLogged : null,
      previous: previousNutrition.loggedDays ? previousNutrition.avgCaloriesLogged : null,
      unit: 'kcal',
      decimals: 0,
    },
    {
      label: 'Proteína media / día',
      current: nutrition.loggedDays ? nutrition.avgProtein : null,
      previous: previousNutrition.loggedDays ? previousNutrition.avgProtein : null,
      unit: 'g',
      decimals: 1,
    },
    {
      label: 'Carbohidratos medios / día',
      current: nutrition.loggedDays ? nutrition.avgCarbs : null,
      previous: previousNutrition.loggedDays ? previousNutrition.avgCarbs : null,
      unit: 'g',
      decimals: 1,
    },
    {
      label: 'Grasas medias / día',
      current: nutrition.loggedDays ? nutrition.avgFat : null,
      previous: previousNutrition.loggedDays ? previousNutrition.avgFat : null,
      unit: 'g',
      decimals: 1,
    },
    { label: 'Días con registro', current: nutrition.loggedDays, previous: previousNutrition.loggedDays, unit: 'días', decimals: 0 },
    { label: 'Sesiones completadas', current: training.sessions, previous: previousTraining.sessions, unit: '', decimals: 0 },
    { label: 'Series efectivas', current: training.effectiveSets, previous: previousTraining.effectiveSets, unit: '', decimals: 0 },
    { label: 'Volumen total', current: training.volume, previous: previousTraining.volume, unit: 'kg', decimals: 0 },
    {
      label: 'Cambio de peso',
      current: weightDeltaPeriod,
      previous: previousWeightDelta,
      unit: 'kg',
      decimals: 1,
    },
  ]

  const handleDeleteWeight = async () => {
    if (!deletingWeight) return
    try {
      await deleteBodyWeight(deletingWeight.id)
      notify('Registro de peso eliminado')
      setDeletingWeight(undefined)
    } catch {
      notify('No se pudo eliminar el registro', 'error')
    }
  }

  if (!settings) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-12 w-56" />
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-64 w-full" />
      </div>
    )
  }

  const weightMin = weightChartData.length ? Math.floor(Math.min(...weightChartData.map((item) => item.weightKg)) - 1) : 50
  const weightMax = weightChartData.length ? Math.ceil(Math.max(...weightChartData.map((item) => item.weightKg)) + 1) : 70

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader
        eyebrow="Análisis"
        title="Progreso"
        subtitle="Compara tu alimentación, tu volumen de entrenamiento y tu peso entre la semana o el mes actual y el periodo anterior."
        actions={
          <Button size="sm" onClick={() => setWeightOpen(true)}>
            <Plus className="h-4 w-4" /> Registrar peso
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="segmented" role="group" aria-label="Periodo de análisis">
          <button
            type="button"
            onClick={() => setPeriod('week')}
            className={cn('segmented-item', period === 'week' && 'segmented-item-active')}
          >
            Últimos 7 días
          </button>
          <button
            type="button"
            onClick={() => setPeriod('month')}
            className={cn('segmented-item', period === 'month' && 'segmented-item-active')}
          >
            Últimos 30 días
          </button>
        </div>
        <p className="text-[10px] text-faint">
          {formatMediumEs(startISO)} – {formatMediumEs(endISO)} · comparado con {formatMediumEs(previousStartISO)} –{' '}
          {formatMediumEs(previousEndISO)}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiCard
          label="Calorías / día"
          value={nutrition.loggedDays ? nutrition.avgCaloriesLogged : 0}
          unit="kcal"
          hint={`${nutrition.loggedDays} de ${days} días`}
          delta={nutrition.loggedDays && previousNutrition.loggedDays ? nutrition.avgCaloriesLogged - previousNutrition.avgCaloriesLogged : null}
          deltaUnit="kcal"
          icon={<Flame className="h-4 w-4" />}
        />
        <KpiCard
          label="Proteína / día"
          value={nutrition.loggedDays ? nutrition.avgProtein : 0}
          unit="g"
          hint={`objetivo ${formatGrams(settings.targets.protein)} g`}
          delta={nutrition.loggedDays && previousNutrition.loggedDays ? nutrition.avgProtein - previousNutrition.avgProtein : null}
          deltaUnit="g"
          icon={<UtensilsCrossed className="h-4 w-4" />}
          decimals={1}
        />
        <KpiCard
          label="Sesiones"
          value={training.sessions}
          unit="completadas"
          hint={`${training.effectiveSets} series efectivas`}
          delta={training.sessions - previousTraining.sessions}
          deltaUnit="ses."
          icon={<Dumbbell className="h-4 w-4" />}
        />
        <KpiCard
          label="Volumen total"
          value={training.volume}
          unit="kg"
          hint={training.avgMinutes > 0 ? `${training.avgMinutes} min por sesión` : 'peso × repeticiones'}
          delta={training.volume - previousTraining.volume}
          deltaUnit="kg"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </section>

      <section>
        <SectionHeading
          icon={<BarChart3 className="h-4 w-4" />}
          title="Nutrición"
          description={`Media por día registrado · ${formatPercent(
            nutrition.loggedDays ? (nutrition.avgCaloriesLogged / settings.targets.calories) * 100 : 0,
          )} del objetivo calórico`}
          action={<Link to="/alimentacion" className="text-[10px] font-medium text-accent hover:underline">Ver diario</Link>}
        />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="card-pad">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-fg">Calorías por día</h3>
                <p className="mt-0.5 text-[10px] text-faint">Calorías declaradas en las etiquetas</p>
              </div>
              <span className="chip border-lime-500/25 text-accent">{formatKcal(settings.targets.calories)} kcal objetivo</span>
            </div>
            {hasNutritionData ? (
              <div className="h-[230px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daily} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
                    <CartesianGrid stroke="rgb(var(--c-line))" strokeDasharray="3 4" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: 'rgb(var(--c-faint))', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      interval={period === 'week' ? 0 : 4}
                    />
                    <YAxis
                      tick={{ fill: 'rgb(var(--c-faint))', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      width={38}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: 'rgb(var(--c-muted))', fontSize: 10 }}
                      cursor={{ fill: 'rgb(var(--c-line) / 0.35)' }}
                      formatter={(value) => [`${formatKcal(Number(value))} kcal`, 'Consumidas']}
                    />
                    <ReferenceLine y={settings.targets.calories} stroke="#bef264" strokeDasharray="5 5" strokeOpacity={0.75} />
                    <Bar dataKey="calories" fill="#a3e635" radius={[4, 4, 0, 0]} maxBarSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={<Flame className="h-5 w-5" />}
                title="Sin datos de nutrición"
                description={`No hay comidas registradas en los últimos ${days} días.`}
                action={
                  <Link to="/alimentacion" className="btn-primary px-3 py-2 text-xs">
                    Registrar comida
                  </Link>
                }
                className="py-8"
              />
            )}
            <div className="mt-2 flex items-center justify-between text-[10px] text-faint">
              <span>{nutrition.loggedDays} días con registro</span>
              <span>Etiqueta {formatKcal(nutrition.totalCalories)} kcal en total</span>
            </div>
          </div>

          <div className="card-pad">
            <h3 className="text-xs font-semibold text-fg">Reparto de macronutrientes</h3>
            <p className="mt-0.5 text-[10px] text-faint">Media diaria de los días registrados</p>
            {hasNutritionData ? (
              <>
                <div className="relative mt-2 h-[150px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={macroPie}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={66}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {macroPie.map((item) => (
                          <Cell key={item.name} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => [`${formatNumber(Number(value), 0)} kcal`, 'Energía']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-2xl font-semibold leading-none tabular text-fg">
                      {formatKcal(macroPieKcal)}
                    </span>
                    <span className="mt-1 text-[9px] text-faint">kcal/día de macros</span>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <ProgressBar label="Proteínas" consumed={macroAvg.protein} target={settings.targets.protein} color="#38bdf8" compact />
                  <ProgressBar label="Grasas" consumed={macroAvg.fat} target={settings.targets.fat} color="#fbbf24" compact />
                  <ProgressBar label="Carbohidratos" consumed={macroAvg.carbs} target={settings.targets.carbs} color="#c084fc" compact />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="chip">Etiqueta {formatKcal(nutrition.avgCaloriesLogged)} kcal/día</span>
                  <span className="chip">Macros {formatKcal(nutrition.avgCaloriesEstimated)} kcal/día</span>
                </div>
              </>
            ) : (
              <EmptyState
                icon={<UtensilsCrossed className="h-5 w-5" />}
                title="Aún sin medias"
                description="Registra comidas para ver el reparto de proteínas, grasas y carbohidratos."
                className="py-8"
              />
            )}
          </div>
        </div>

        <MacroEnergyNotice targets={settings.targets} className="mt-3" compact />
      </section>

      <section>
        <SectionHeading
          icon={<Dumbbell className="h-4 w-4" />}
          title="Entrenamiento"
          description={`${training.sessions} sesiones completadas · ${formatNumber(training.volume, 0)} kg de volumen`}
          action={<Link to="/entrenamiento" className="text-[10px] font-medium text-accent hover:underline">Ver sesiones</Link>}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card-pad">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-fg">Volumen por semana</h3>
                <p className="mt-0.5 text-[10px] text-faint">Peso × repeticiones de series efectivas</p>
              </div>
              <span className="chip">{period === 'week' ? '8 semanas' : '12 semanas'}</span>
            </div>
            {hasWeeklyVolume ? (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyVolume} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="rgb(var(--c-line))" strokeDasharray="3 4" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: 'rgb(var(--c-faint))', fontSize: 9 }} axisLine={false} tickLine={false} interval={period === 'week' ? 0 : 1} />
                    <YAxis tick={{ fill: 'rgb(var(--c-faint))', fontSize: 9 }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: 'rgb(var(--c-line) / 0.35)' }}
                      formatter={(value, name) =>
                        name === 'volume'
                          ? [`${formatNumber(Number(value), 0)} kg`, 'Volumen']
                          : [`${formatNumber(Number(value), 0)}`, 'Sesiones']
                      }
                    />
                    <Bar dataKey="volume" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={<BarChart3 className="h-5 w-5" />}
                title="Sin volumen registrado"
                description="Completa una sesión con series efectivas para ver la evolución semanal."
                className="py-8"
              />
            )}
            <p className="mt-2 text-[10px] text-faint">Semana actual: {weekLabel(startOfWeekISO(endISO))}</p>
          </div>

          <div className="card-pad">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-fg">Series por grupo muscular</h3>
                <p className="mt-0.5 text-[10px] text-faint">Series efectivas del periodo</p>
              </div>
              <span className="chip">{training.effectiveSets} series</span>
            </div>
            {muscleGroups.length > 0 ? (
              <div style={{ height: Math.max(190, muscleGroups.length * 30) }} className="w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={muscleGroups} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
                    <CartesianGrid stroke="rgb(var(--c-line))" strokeDasharray="3 4" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'rgb(var(--c-faint))', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fill: 'rgb(var(--c-muted))', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={84}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: 'rgb(var(--c-line) / 0.35)' }}
                      formatter={(value) => [`${formatNumber(Number(value), 0)} series`, 'Efectivas']}
                    />
                    <Bar dataKey="sets" radius={[0, 4, 4, 0]} maxBarSize={18}>
                      {muscleGroups.map((group, index) => (
                        <Cell key={group.muscleGroup} fill={MUSCLE_COLORS[index % MUSCLE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={<Activity className="h-5 w-5" />}
                title="Sin series en el periodo"
                description="Las series efectivas completadas aparecerán agrupadas por músculo."
                className="py-8"
              />
            )}
          </div>
        </div>

        <div className="card-pad mt-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                <LineChartIcon className="h-3.5 w-3.5 text-accent" /> Evolución de fuerza
              </h3>
              <p className="mt-0.5 text-[10px] text-faint">Peso máximo por sesión y 1RM estimado (Epley)</p>
            </div>
            {exerciseOptions.length > 0 ? (
              <select
                value={strengthKey}
                onChange={(event) => setStrengthKey(event.target.value)}
                className="input py-1.5 text-xs sm:w-64"
                aria-label="Elegir ejercicio para la evolución de fuerza"
              >
                {exerciseOptions.map((exercise) => (
                  <option key={exercise.key} value={exercise.key}>
                    {exercise.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {strength.length > 0 ? (
            <>
              <div className="h-[230px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={strength} margin={{ top: 6, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="rgb(var(--c-line))" strokeDasharray="3 4" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: 'rgb(var(--c-faint))', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgb(var(--c-faint))', fontSize: 9 }} axisLine={false} tickLine={false} width={34} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, name) => [
                        `${formatNumber(Number(value), 1)} kg`,
                        name === 'e1rm' ? '1RM estimado' : 'Peso máximo',
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="maxWeight"
                      stroke="#bef264"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#bef264', strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="e1rm"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      dot={{ r: 2.5, fill: '#38bdf8', strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="flex items-center gap-1.5 text-[10px] text-muted">
                  <span className="h-1.5 w-4 rounded-full bg-lime-400" /> Peso máximo
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-muted">
                  <span className="h-1.5 w-4 rounded-full bg-sky-400" /> 1RM estimado
                </span>
                <span className="ml-auto text-[10px] text-faint">
                  {selectedExercise?.name} · {strength.length} sesiones
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-line bg-raised/60 px-2.5 py-2">
                  <p className="text-[9px] uppercase text-faint">Mejor peso</p>
                  <p className="mt-0.5 text-sm font-semibold tabular text-fg">
                    {strengthPr ? `${formatNumber(strengthPr.maxWeight, 1)} kg` : '—'}
                  </p>
                </div>
                <div className="rounded-lg border border-line bg-raised/60 px-2.5 py-2">
                  <p className="text-[9px] uppercase text-faint">Mejor 1RM est.</p>
                  <p className="mt-0.5 text-sm font-semibold tabular text-fg">
                    {strengthMax > 0 ? `${formatNumber(strengthMax, 1)} kg` : '—'}
                  </p>
                </div>
                <div className="rounded-lg border border-line bg-raised/60 px-2.5 py-2">
                  <p className="text-[9px] uppercase text-faint">Última sesión</p>
                  <p className="mt-0.5 text-sm font-semibold tabular text-fg">
                    {strength[strength.length - 1]?.date ? formatShortEs(strength[strength.length - 1].date) : '—'}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              icon={<LineChartIcon className="h-5 w-5" />}
              title="Sin historial de fuerza"
              description="Completa sesiones con series efectivas para comparar tu fuerza entre fechas."
              action={
                <Link to="/entrenamiento" className="btn-primary px-3 py-2 text-xs">
                  Ir a entrenamiento
                </Link>
              }
              className="py-8"
            />
          )}
        </div>
      </section>

      <section>
        <SectionHeading
          icon={<Scale className="h-4 w-4" />}
          title="Peso corporal"
          description="Tendencia y variaciones registradas"
          action={
            <Button size="sm" variant="secondary" onClick={() => setWeightOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Añadir
            </Button>
          }
        />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="card-pad">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xs font-semibold text-fg">Evolución del peso</h3>
                <p className="mt-0.5 text-[10px] text-faint">
                  {bodyWeights.length > 0 ? `${bodyWeights.length} registros en total` : 'Sin registros'}
                </p>
              </div>
              <div className="segmented">
                {(['30', '90', 'all'] as WeightRange[]).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setWeightRange(range)}
                    className={cn('segmented-item px-2 py-1 text-[10px]', weightRange === range && 'segmented-item-active')}
                  >
                    {range === '30' ? '30 d' : range === '90' ? '90 d' : 'Todo'}
                  </button>
                ))}
              </div>
            </div>

            {weightChartData.length > 0 ? (
              <div className="h-[230px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightChartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke="rgb(var(--c-line))" strokeDasharray="3 4" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: 'rgb(var(--c-faint))', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis
                      domain={[weightMin, weightMax]}
                      tick={{ fill: 'rgb(var(--c-faint))', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      width={38}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelFormatter={(label, payload) => {
                        const item = payload?.[0]?.payload as { date?: string } | undefined
                        return item?.date ? formatMediumEs(item.date) : String(label)
                      }}
                      formatter={(value) => [`${formatNumber(Number(value), 1)} kg`, 'Peso']}
                    />
                    <ReferenceLine
                      y={settings.profile.initialWeightKg}
                      stroke="#bef264"
                      strokeDasharray="4 4"
                      strokeOpacity={0.55}
                    />
                    <Line
                      type="monotone"
                      dataKey="weightKg"
                      stroke="#bef264"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#bef264', strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={<Scale className="h-5 w-5" />}
                title="Sin pesajes en este rango"
                description="Registra tu peso para ver la tendencia. La línea discontinua marca tu peso inicial."
                action={<Button onClick={() => setWeightOpen(true)}>Registrar peso</Button>}
                className="py-8"
              />
            )}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-faint">
              <span>Peso inicial de referencia: {formatKg(settings.profile.initialWeightKg)} kg</span>
              {weightSummary.latest ? (
                <span>Último: {formatKg(weightSummary.latest.weightKg)} kg · {formatMediumEs(weightSummary.latest.date)}</span>
              ) : null}
            </div>
          </div>

          <div className="card-pad">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-fg">Últimos registros</h3>
              {weightSummary.latest ? (
                <span className="chip">IMC {formatNumber(bmi(weightSummary.latest.weightKg, settings.profile.heightCm))}</span>
              ) : null}
            </div>
            {weightSummary.latest ? (
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <p className="font-display text-4xl font-semibold leading-none tabular text-fg">
                    {formatKg(weightSummary.latest.weightKg)} <span className="text-xs font-normal text-faint">kg</span>
                  </p>
                  <p className="mt-1 text-[10px] text-faint">
                    {weightSummary.change !== 0
                      ? `${formatSigned(weightSummary.change, 'kg')} desde el primer registro`
                      : 'Sin cambios desde el primer registro'}
                  </p>
                </div>
                <div className="text-right text-[10px] text-faint">
                  <p>Mín. {weightSummary.min !== undefined ? `${formatKg(weightSummary.min)} kg` : '—'}</p>
                  <p className="mt-0.5">Máx. {weightSummary.max !== undefined ? `${formatKg(weightSummary.max)} kg` : '—'}</p>
                </div>
              </div>
            ) : null}

            {recentWeights.length > 0 ? (
              <ul className="mt-3 divide-y divide-line/70">
                {recentWeights.map((weight) => (
                  <li key={weight.id} className="flex items-center gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium tabular text-fg">
                        {formatKg(weight.weightKg)} kg
                        {weight.delta !== null ? (
                          <span className={cn('ml-2 text-[10px]', weight.delta < 0 ? 'text-accent' : weight.delta > 0 ? 'text-amber-400' : 'text-faint')}>
                            {formatSigned(weight.delta, 'kg')}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-faint">
                        {formatShortEs(weight.date)}
                        {weight.note ? ` · ${weight.note}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeletingWeight(weight)}
                      className="btn-icon h-7 w-7 hover:text-rose-400"
                      aria-label={`Eliminar registro de ${weight.date}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-[11px] leading-relaxed text-faint">
                Aún no hay registros. Pésate en condiciones similares y guarda el dato para ver la tendencia.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-fg">
            <CalendarDays className="h-4 w-4 text-accent" /> Comparativa con el periodo anterior
          </h2>
          <p className="mt-0.5 text-[10px] text-faint">
            {formatLongEs(startISO)} – {capitalizeDate(endISO)} vs {formatMediumEs(previousStartISO)} –{' '}
            {formatMediumEs(previousEndISO)}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead className="bg-raised/50">
              <tr>
                <th className="table-head px-4 py-2.5">Métrica</th>
                <th className="table-head px-3 py-2.5 text-right">Actual</th>
                <th className="table-head px-3 py-2.5 text-right">Anterior</th>
                <th className="table-head px-4 py-2.5 text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {comparisonRows.map((row) => {
                const diff =
                  row.current !== null && row.previous !== null
                    ? row.current - row.previous
                    : null
                return (
                  <tr key={row.label} className="transition hover:bg-raised/30">
                    <td className="px-4 py-2.5 text-muted">{row.label}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular text-fg">
                      {row.current === null ? '—' : `${formatNumber(row.current, row.decimals)} ${row.unit}`}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular text-faint">
                      {row.previous === null ? '—' : `${formatNumber(row.previous, row.decimals)} ${row.unit}`}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {diff === null ? (
                        <span className="text-faint">—</span>
                      ) : (
                        <span className={cn('font-semibold tabular', diff > 0 ? 'text-accent' : diff < 0 ? 'text-amber-400' : 'text-faint')}>
                          {formatSigned(diff, row.unit, row.decimals)}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-4 py-2.5 text-[10px] leading-relaxed text-faint">
          Las medias nutricionales se calculan solo con los días que tienen al menos una comida registrada. El volumen y
          las series solo incluyen sesiones completadas y series efectivas. El cambio de peso compara el primer y el
          último pesaje de cada periodo.
        </p>
      </section>

      <WeightModal open={weightOpen} onClose={() => setWeightOpen(false)} />
      <ConfirmDialog
        open={Boolean(deletingWeight)}
        title="Eliminar pesaje"
        message={`¿Quieres eliminar el registro de ${deletingWeight ? formatMediumEs(deletingWeight.date) : ''} (${deletingWeight ? formatKg(deletingWeight.weightKg) : ''} kg)?`}
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDeleteWeight}
        onClose={() => setDeletingWeight(undefined)}
      />
    </div>
  )
}

function capitalizeDate(iso: string): string {
  const text = formatMediumEs(iso)
  return text.charAt(0).toUpperCase() + text.slice(1)
}
