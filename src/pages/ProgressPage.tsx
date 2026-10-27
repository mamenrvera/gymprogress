import { useMemo, useState, type ReactNode } from 'react'
import {
  Activity,
  BarChart3,
  Dumbbell,
  Flame,
  Plus,
  Scale,
  TrendingUp,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Customized,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useApp } from '../context/AppContext'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'

import { WeightModal } from '../components/nutrition/WeightModal'
import {
  bodyWeightSummary,
  exerciseHistoryOptions,
  muscleGroupDistribution,
  nutritionPeriodSummary,
  personalRecords,
  sessionComparison,
  strengthHistory,
  trainingPeriodSummary,
  volumeByWeek,
  weeklyStrengthSummary,
} from '../lib/analytics'
import { bmi, bmiCategory, bmiBarPosition, BMI_BAR_MIN, BMI_BAR_MAX, weightPointColor } from '../lib/calculations'
import {
  addDaysISO,
  formatMediumEs,
  formatShortEs,
  startOfWeekISO,
  todayISO,
} from '../lib/dates'
import { formatGrams, formatKcal, formatKg, formatNumber, formatSigned } from '../lib/format'

import { cn } from '../lib/cn'
import { useEntries, useWorkouts, useWorkoutExercises, useSets, useBodyWeights } from '../hooks/useSupabaseData'

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


function KpiCard({
  label,
  value,
  unit,
  hint,
  tone = 'default',
}: {
  label: string
  value: string
  unit?: string
  hint?: string
  tone?: 'default' | 'accent'
}) {
  return (
    <div className="rounded-xl border border-line bg-raised/60 p-3">
      <p className="text-[9px] uppercase tracking-wide text-faint">{label}</p>
      <p className={cn('mt-1 font-display text-2xl font-semibold leading-none tabular', tone === 'accent' ? 'text-accent' : 'text-fg')}>
        {value}
        {unit ? <span className="ml-1 text-[11px] font-normal text-faint">{unit}</span> : null}
      </p>
      {hint ? <p className="mt-1 text-[9px] leading-tight text-faint">{hint}</p> : null}
    </div>
  )
}

export function ProgressPage() {
  const { settings } = useApp()
  const [period, setPeriod] = useState<Period>('week')
  const [weightRange, setWeightRange] = useState<WeightRange>('30')
  const [exerciseKey, setExerciseKey] = useState('')
  const [strengthMetric, setStrengthMetric] = useState<'e1rm' | 'maxWeight' | 'volume'>('e1rm')
  const [weightModalOpen, setWeightModalOpen] = useState(false)

  // Supabase data
  const { data: entriesData } = useEntries()
  const { data: workoutsData } = useWorkouts()
  const { data: workoutExercisesData } = useWorkoutExercises()
  const { data: setsData } = useSets()
  const { data: bodyWeightsData } = useBodyWeights()

  const entries = entriesData ?? []
  const workouts = workoutsData ?? []
  const workoutExercises = workoutExercisesData ?? []
  const sets = setsData ?? []
  const bodyWeights = bodyWeightsData ?? []

  const today = todayISO()
  const rangeStart = period === 'week' ? addDaysISO(today, -6) : addDaysISO(today, -29)
  const nutritionSummary = useMemo(() => nutritionPeriodSummary(entries, rangeStart, today), [entries, rangeStart, today])
  const trainingSummary = useMemo(() => trainingPeriodSummary(workouts, sets, rangeStart, today), [workouts, sets, rangeStart, today])
  const volumeSeries = useMemo(() => volumeByWeek(workouts, sets, today, 8), [workouts, sets, today])
  const muscleDistribution = useMemo(
    () => muscleGroupDistribution(workouts, workoutExercises, sets, rangeStart, today),
    [workouts, workoutExercises, sets, rangeStart, today],
  )
  const exerciseOptions = useMemo(() => exerciseHistoryOptions(workouts, workoutExercises, sets), [workouts, workoutExercises, sets])
  const selectedExerciseKey = exerciseKey || exerciseOptions[0]?.key || ''
  const strengthSeries = useMemo(
    () => (selectedExerciseKey ? strengthHistory(workouts, workoutExercises, sets, selectedExerciseKey) : []),
    [workouts, workoutExercises, sets, selectedExerciseKey],
  )
  const weightSummary = useMemo(() => bodyWeightSummary(bodyWeights), [bodyWeights])
  // macroSeries removed - not used

  // Weight range filtering
  const weightRangeStart = weightRange === '30' ? addDaysISO(today, -29) : weightRange === '90' ? addDaysISO(today, -89) : undefined
  const filteredWeights = useMemo(() => {
    if (!weightRangeStart) return bodyWeights
    return bodyWeights.filter(w => w.date >= weightRangeStart)
  }, [bodyWeights, weightRangeStart])

  if (!settings) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-12 w-56" />
        <div className="skeleton h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader
        eyebrow="Análisis"
        title="Progreso"
        subtitle="Compara periodos, sigue tu fuerza y observa cómo evoluciona tu peso junto a la nutrición."
      />

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="segmented" role="tablist" aria-label="Periodo de análisis">
          <button
            type="button"
            role="tab"
            aria-selected={period === 'week'}
            onClick={() => setPeriod('week')}
            className={cn('segmented-item', period === 'week' && 'segmented-item-active')}
          >
            7 días
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={period === 'month'}
            onClick={() => setPeriod('month')}
            className={cn('segmented-item', period === 'month' && 'segmented-item-active')}
          >
            30 días
          </button>
        </div>
      </div>

      {/* Nutrition KPIs */}
      <section className="card-pad">
        <SectionHeading icon={<Flame className="h-4 w-4" />} title="Nutrición" description={`Promedio de los últimos ${period === 'week' ? '7' : '30'} días`} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <KpiCard label="Calorías medias" value={formatKcal(nutritionSummary.avgCalories)} unit="kcal" />
          <KpiCard label="Proteína media" value={formatGrams(nutritionSummary.avgProtein)} unit="g" />
          <KpiCard label="Carbos medios" value={formatGrams(nutritionSummary.avgCarbs)} unit="g" />
          <KpiCard label="Grasas medias" value={formatGrams(nutritionSummary.avgFat)} unit="g" />
        </div>
        <p className="mt-2 text-[10px] text-faint">
          {nutritionSummary.loggedDays} de {nutritionSummary.days} días registrados
        </p>
      </section>

      {/* Training KPIs */}
      <section className="card-pad">
        <SectionHeading icon={<Dumbbell className="h-4 w-4" />} title="Entrenamiento" description={`Resumen de los últimos ${period === 'week' ? '7' : '30'} días`} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <KpiCard label="Sesiones" value={String(trainingSummary.sessions)} />
          <KpiCard label="Volumen" value={formatNumber(trainingSummary.volume, 0)} unit="kg" />
          <KpiCard label="Series ef." value={String(trainingSummary.effectiveSets)} />
          <KpiCard label="Reps" value={String(trainingSummary.reps)} />
        </div>
      </section>

      {/* Volume chart */}
      <section className="card-pad">
        <SectionHeading icon={<BarChart3 className="h-4 w-4" />} title="Volumen semanal" description="Últimas 8 semanas" />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--c-line))" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgb(var(--c-faint))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'rgb(var(--c-faint))' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="volume" fill="#bef264" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Muscle distribution */}
      <section className="card-pad">
        <SectionHeading icon={<Activity className="h-4 w-4" />} title="Distribución muscular" description={`Últimos ${period === 'week' ? '7' : '30'} días`} />
        {muscleDistribution.length === 0 ? (
          <EmptyState
            icon={<Dumbbell className="h-5 w-5" />}
            title="Sin datos de entrenamiento"
            description="Completa sesiones para ver la distribución por grupo muscular."
          />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={muscleDistribution}
                  dataKey="sets"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ label, sets }) => `${label}: ${sets}`}
                >
                  {muscleDistribution.map((_, i) => (
                    <Cell key={i} fill={MUSCLE_COLORS[i % MUSCLE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Strength history */}
      <section className="card-pad">
        <SectionHeading
          icon={<TrendingUp className="h-4 w-4" />}
          title="Evolución de fuerza"
          description="Selecciona un ejercicio para ver su progreso"
          action={
            <select
              value={selectedExerciseKey}
              onChange={(e) => setExerciseKey(e.target.value)}
              className="input text-xs py-1.5 w-48"
            >
              {exerciseOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.name} ({opt.sessions} ses.)
                </option>
              ))}
            </select>
          }
        />
        {strengthSeries.length === 0 ? (
          <EmptyState
            icon={<TrendingUp className="h-5 w-5" />}
            title="Sin historial de fuerza"
            description="Completa sesiones con el ejercicio seleccionado para ver su evolución."
          />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={strengthSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--c-line))" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgb(var(--c-faint))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'rgb(var(--c-faint))' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="e1rm" stroke="#bef264" strokeWidth={2} dot={{ r: 3 }} name="1RM est." />
                <Line type="monotone" dataKey="maxWeight" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} name="Peso máx." />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Progresión de fuerza */}
      <section className="card-pad">
        <SectionHeading
          icon={<TrendingUp className="h-4 w-4" />}
          title="Progresión de fuerza"
          description="Analiza tu evolución por ejercicio, récords y comparativas"
        />

        {exerciseOptions.length === 0 ? (
          <EmptyState
            icon={<Dumbbell className="h-5 w-5" />}
            title="Sin datos de fuerza"
            description="Completa sesiones de entrenamiento para ver tu progresión de fuerza."
          />
        ) : (
          <div className="space-y-5">
            {/* Exercise selector */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-xs font-medium text-fg">Ejercicio</label>
              <select
                value={selectedExerciseKey}
                onChange={(e) => setExerciseKey(e.target.value)}
                className="input text-xs py-1.5 w-full sm:w-64"
              >
                {exerciseOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.name} ({opt.sessions} ses.)
                  </option>
                ))}
              </select>
            </div>

            {/* Personal records */}
            {(() => {
              const records = personalRecords(workouts, workoutExercises, sets, selectedExerciseKey)
              if (records.length === 0) return null
              return (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {records.map((record) => (
                    <div key={record.type} className="rounded-xl border border-line bg-raised/60 p-3">
                      <p className="text-[9px] uppercase tracking-wide text-faint">{record.label}</p>
                      <p className="mt-1 font-display text-xl font-semibold leading-none tabular text-fg">
                        {formatNumber(record.value, record.value % 1 === 0 ? 0 : 1)}
                        <span className="ml-1 text-[10px] font-normal text-faint">{record.unit}</span>
                      </p>
                      <p className="mt-1 text-[9px] text-faint">
                        {formatMediumEs(record.date)}
                        {record.weightKg && record.reps ? ` · ${record.weightKg} kg × ${record.reps}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Metric selector + chart */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-fg">Métrica:</span>
                {(['e1rm', 'maxWeight', 'volume'] as const).map((metric) => (
                  <button
                    key={metric}
                    type="button"
                    onClick={() => setStrengthMetric(metric)}
                    className={cn('chip transition', strengthMetric === metric && 'border-lime-500/50 text-accent')}
                  >
                    {metric === 'e1rm' ? '1RM est.' : metric === 'maxWeight' ? 'Peso máx.' : 'Volumen'}
                  </button>
                ))}
              </div>
              {strengthSeries.length === 0 ? (
                <EmptyState
                  icon={<TrendingUp className="h-5 w-5" />}
                  title="Sin datos suficientes"
                  description="Necesitas al menos una sesión completada con este ejercicio."
                />
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={strengthSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--c-line))" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgb(var(--c-faint))' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'rgb(var(--c-faint))' }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line
                        type="monotone"
                        dataKey={strengthMetric === 'e1rm' ? 'e1rm' : strengthMetric === 'maxWeight' ? 'maxWeight' : 'volume'}
                        stroke="#bef264"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name={strengthMetric === 'e1rm' ? '1RM est.' : strengthMetric === 'maxWeight' ? 'Peso máx.' : 'Volumen'}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Session comparison */}
            {(() => {
              const comp = sessionComparison(workouts, workoutExercises, sets, selectedExerciseKey)
              if (!comp.lastSession) return null
              return (
                <div className="rounded-xl border border-line bg-raised/40 p-4">
                  <h3 className="text-xs font-semibold text-fg mb-3">Comparación de sesiones</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase text-faint mb-1">Última sesión</p>
                      <p className="text-xs text-fg">{formatMediumEs(comp.lastSession.date)}</p>
                      <p className="text-sm font-semibold tabular text-fg">{comp.lastSession.maxWeight} kg × {comp.lastSession.reps} reps</p>
                      <p className="text-[10px] text-faint">{comp.lastSession.sets} series · {formatNumber(comp.lastSession.volume, 0)} kg×reps</p>
                    </div>
                    {comp.previousSession ? (
                      <div>
                        <p className="text-[10px] uppercase text-faint mb-1">Sesión anterior</p>
                        <p className="text-xs text-fg">{formatMediumEs(comp.previousSession.date)}</p>
                        <p className="text-sm font-semibold tabular text-fg">{comp.previousSession.maxWeight} kg × {comp.previousSession.reps} reps</p>
                        <p className="text-[10px] text-faint">{comp.previousSession.sets} series · {formatNumber(comp.previousSession.volume, 0)} kg×reps</p>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <p className="text-[10px] text-faint">Sin sesión anterior para comparar</p>
                      </div>
                    )}
                  </div>
                  {comp.previousSession && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                      {comp.weightDiff !== null && (
                        <span className={cn('chip', comp.weightDiff > 0 ? 'border-lime-500/30 text-accent' : comp.weightDiff < 0 ? 'border-rose-500/30 text-rose-400' : '')}>
                          Peso: {comp.weightDiff > 0 ? '+' : ''}{comp.weightDiff} kg
                        </span>
                      )}
                      {comp.repsDiff !== null && (
                        <span className={cn('chip', comp.repsDiff > 0 ? 'border-lime-500/30 text-accent' : comp.repsDiff < 0 ? 'border-rose-500/30 text-rose-400' : '')}>
                          Reps: {comp.repsDiff > 0 ? '+' : ''}{comp.repsDiff}
                        </span>
                      )}
                      {comp.volumeDiff !== null && (
                        <span className={cn('chip', comp.volumeDiff > 0 ? 'border-lime-500/30 text-accent' : comp.volumeDiff < 0 ? 'border-rose-500/30 text-rose-400' : '')}>
                          Volumen: {comp.volumeDiff > 0 ? '+' : ''}{formatNumber(comp.volumeDiff, 0)} kg×reps
                        </span>
                      )}
                    </div>
                  )}
                  {comp.previousSession && comp.weightDiff !== null && (
                    <p className="mt-2 text-[10px] text-faint">
                      {comp.weightDiff > 0
                        ? `Has aumentado ${comp.weightDiff} kg respecto a la última sesión`
                        : comp.weightDiff < 0
                          ? `Has bajado ${Math.abs(comp.weightDiff)} kg respecto a la última sesión`
                          : 'Has mantenido el peso respecto a la última sesión'}
                      {comp.repsDiff !== null && comp.repsDiff !== 0
                        ? ` · ${comp.repsDiff > 0 ? '+' : ''}${comp.repsDiff} repeticiones`
                        : ''}
                    </p>
                  )}
                </div>
              )
            })()}

            {/* Weekly summary */}
            {(() => {
              const weekStart = startOfWeekISO(today)
              const weekEnd = addDaysISO(weekStart, 6)
              const summary = weeklyStrengthSummary(workouts, workoutExercises, sets, weekStart, weekEnd)
              if (summary.exercises.length === 0) return null
              return (
                <div className="rounded-xl border border-line bg-raised/40 p-4">
                  <h3 className="text-xs font-semibold text-fg mb-3">Resumen semanal de fuerza</h3>
                  <p className="text-[10px] text-faint mb-2">{summary.newPRs} nuevo(s) récord(s) esta semana</p>
                  <div className="space-y-2">
                    {summary.exercises.map((ex) => (
                      <div key={ex.key} className="flex items-center justify-between rounded-lg border border-line bg-raised/50 px-3 py-2">
                        <div>
                          <p className="text-xs font-medium text-fg">{ex.name}</p>
                          <p className="text-[10px] text-faint">{ex.sessions} sesiones · {formatNumber(ex.volume, 0)} kg×reps</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold tabular text-fg">{ex.maxWeight} kg</p>
                          {ex.change !== null && (
                            <p className={cn('text-[10px] font-medium', ex.change > 0 ? 'text-accent' : ex.change < 0 ? 'text-rose-400' : 'text-faint')}>
                              {ex.change > 0 ? '+' : ''}{ex.change} kg
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {summary.exercises.length < 2 && (
                    <p className="mt-2 text-[10px] text-faint">Necesitamos más sesiones para evaluar tu evolución.</p>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </section>

      {/* IMC card */}
      <section className="card-pad">
        <SectionHeading
          icon={<Scale className="h-4 w-4" />}
          title="Índice de masa corporal (IMC)"
          description="Calculado con tu peso actual y altura del perfil"
        />
        {weightSummary.latest ? (
          (() => {
            const currentBmi = bmi(weightSummary.latest.weightKg, settings.profile.heightCm)
            const category = bmiCategory(currentBmi)
            const position = bmiBarPosition(currentBmi)
            return (
              <div className="space-y-4">
                {/* BMI value and category */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-display text-5xl font-semibold leading-none tabular text-fg">
                      {currentBmi > 0 ? currentBmi.toFixed(1) : '—'}
                    </p>
                    <p className={cn('mt-1 text-sm font-medium', category.color)}>
                      {category.label}
                    </p>
                    <p className="mt-0.5 text-[10px] text-faint">
                      {weightSummary.latest.weightKg} kg · {settings.profile.heightCm} cm · {formatMediumEs(weightSummary.latest.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-faint">Rango: {category.range}</p>
                  </div>
                </div>

                {/* Explanation */}
                <p className="text-xs leading-relaxed text-muted">
                  {category.description} El IMC es una estimación general y no sustituye una evaluación médica.
                </p>

                {/* Color bar */}
                <div className="space-y-2">
                  <div className="relative h-4 w-full overflow-hidden rounded-full">
                    {/* Segments */}
                    <div className="absolute inset-0 flex">
                      {/* Bajo peso: 15-18.5 → (18.5-15)/30 = 11.67% */}
                      <div className="h-full bg-sky-400" style={{ width: `${((18.5 - BMI_BAR_MIN) / (BMI_BAR_MAX - BMI_BAR_MIN)) * 100}%` }} />
                      {/* Normal: 18.5-25 → (25-18.5)/30 = 21.67% */}
                      <div className="h-full bg-lime-400" style={{ width: `${((25 - 18.5) / (BMI_BAR_MAX - BMI_BAR_MIN)) * 100}%` }} />
                      {/* Sobrepeso: 25-30 → (30-25)/30 = 16.67% */}
                      <div className="h-full bg-amber-400" style={{ width: `${((30 - 25) / (BMI_BAR_MAX - BMI_BAR_MIN)) * 100}%` }} />
                      {/* Obesidad I: 30-35 → (35-30)/30 = 16.67% */}
                      <div className="h-full bg-orange-400" style={{ width: `${((35 - 30) / (BMI_BAR_MAX - BMI_BAR_MIN)) * 100}%` }} />
                      {/* Obesidad II: 35-40 → (40-35)/30 = 16.67% */}
                      <div className="h-full bg-rose-400" style={{ width: `${((40 - 35) / (BMI_BAR_MAX - BMI_BAR_MIN)) * 100}%` }} />
                      {/* Obesidad III: 40-45 → (45-40)/30 = 16.67% */}
                      <div className="h-full bg-rose-600" style={{ width: `${((45 - 40) / (BMI_BAR_MAX - BMI_BAR_MIN)) * 100}%` }} />
                    </div>
                    {/* Marker */}
                    {currentBmi > 0 && (
                      <div
                        className="absolute top-0 h-full w-1 bg-white shadow-lg transition-all duration-500"
                        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold tabular text-fg shadow-card">
                          {currentBmi.toFixed(1)}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Labels */}
                  <div className="flex text-[8px] text-faint sm:text-[9px]">
                    <span style={{ width: `${((18.5 - BMI_BAR_MIN) / (BMI_BAR_MAX - BMI_BAR_MIN)) * 100}%` }} className="text-center truncate">Bajo peso</span>
                    <span style={{ width: `${((25 - 18.5) / (BMI_BAR_MAX - BMI_BAR_MIN)) * 100}%` }} className="text-center truncate">Normal</span>
                    <span style={{ width: `${((30 - 25) / (BMI_BAR_MAX - BMI_BAR_MIN)) * 100}%` }} className="text-center truncate">Sobrepeso</span>
                    <span style={{ width: `${((35 - 30) / (BMI_BAR_MAX - BMI_BAR_MIN)) * 100}%` }} className="text-center truncate">Ob. I</span>
                    <span style={{ width: `${((40 - 35) / (BMI_BAR_MAX - BMI_BAR_MIN)) * 100}%` }} className="text-center truncate">Ob. II</span>
                    <span style={{ width: `${((45 - 40) / (BMI_BAR_MAX - BMI_BAR_MIN)) * 100}%` }} className="text-center truncate">Ob. III</span>
                  </div>
                </div>
              </div>
            )
          })()
        ) : (
          <EmptyState
            icon={<Scale className="h-5 w-5" />}
            title="Sin datos para calcular el IMC"
            description="Registra tu peso corporal para calcular tu índice de masa corporal."
            action={<Button onClick={() => setWeightModalOpen(true)}><Plus className="h-4 w-4" /> Registrar peso</Button>}
          />
        )}
      </section>

      {/* Body weight */}
      <section className="card-pad">
        <SectionHeading
          icon={<Scale className="h-4 w-4" />}
          title="Peso corporal"
          description="Evolución de tu peso"
          action={
            <div className="flex gap-2">
              {(['30', '90', 'all'] as WeightRange[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setWeightRange(r)}
                  className={cn('chip transition', weightRange === r && 'border-lime-500/50 text-accent')}
                >
                  {r === '30' ? '30d' : r === '90' ? '90d' : 'Todo'}
                </button>
              ))}
            </div>
          }
        />
        {filteredWeights.length === 0 ? (
          <EmptyState
            icon={<Scale className="h-5 w-5" />}
            title="Sin pesajes"
            description="Registra tu peso para ver la evolución."
            action={<Button onClick={() => setWeightModalOpen(true)}><Plus className="h-4 w-4" /> Registrar</Button>}
          />
        ) : (
          <>
            {(() => {
              const sorted = filteredWeights.slice().sort((a, b) => a.date.localeCompare(b.date))
              const chartData = sorted.map(w => ({ date: w.date, label: formatShortEs(w.date), weight: w.weightKg }))
              return (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--c-line))" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgb(var(--c-faint))' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'rgb(var(--c-faint))' }} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={tooltipStyle} />
                      {/* Single invisible line for tooltip and axis reference */}
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="transparent"
                        strokeWidth={0}
                        dot={false}
                        name="Peso (kg)"
                        isAnimationActive={false}
                      />
                      {/* Custom SVG overlay for colored segments */}
                      <Customized component={(props: { xAxisMap?: Record<string, { scale: (v: string) => number }>; yAxisMap?: Record<string, { scale: (v: number) => number }> }) => {
                        const xAxis = props?.xAxisMap ? Object.values(props.xAxisMap)[0] : null
                        const yAxis = props?.yAxisMap ? Object.values(props.yAxisMap)[0] : null
                        if (!xAxis || !yAxis) return null
                        const xScale = xAxis.scale
                        const yScale = yAxis.scale
                        return (
                          <g>
                            {/* Draw colored segments */}
                            {chartData.map((d, i) => {
                              if (i === 0) return null
                              const prev = chartData[i - 1]
                              const color = weightPointColor(d.weight, prev.weight)
                              const x1 = xScale(prev.label)
                              const y1 = yScale(prev.weight)
                              const x2 = xScale(d.label)
                              const y2 = yScale(d.weight)
                              return (
                                <line
                                  key={`seg-${i}`}
                                  x1={x1}
                                  y1={y1}
                                  x2={x2}
                                  y2={y2}
                                  stroke={color}
                                  strokeWidth={2.5}
                                  strokeLinecap="round"
                                />
                              )
                            })}
                            {/* Draw dots */}
                            {chartData.map((d, i) => {
                              const x = xScale(d.label)
                              const y = yScale(d.weight)
                              const prevWeight = i > 0 ? chartData[i - 1].weight : undefined
                              const color = weightPointColor(d.weight, prevWeight)
                              return (
                                <circle
                                  key={`dot-${i}`}
                                  cx={x}
                                  cy={y}
                                  r={4}
                                  fill={color}
                                  stroke="rgb(var(--c-surface))"
                                  strokeWidth={1.5}
                                />
                              )
                            })}
                          </g>
                        )
                      }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )
            })()}
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-fg">
                  Último: {formatKg(weightSummary.latest?.weightKg || 0)} kg · {weightSummary.latest ? formatMediumEs(weightSummary.latest.date) : ''}
                </p>
                <p className="text-[10px] text-faint">
                  {weightSummary.change !== 0 ? `${formatSigned(weightSummary.change, 'kg')} desde el inicio` : 'Sin cambios'}
                </p>
              </div>
              {weightSummary.latest ? (
                <span className="chip">IMC {formatNumber(bmi(weightSummary.latest.weightKg, settings.profile.heightCm))}</span>
              ) : null}
            </div>
          </>
        )}
      </section>

      <WeightModal open={weightModalOpen} onClose={() => setWeightModalOpen(false)} defaultDate={today} />
    </div>
  )
}

