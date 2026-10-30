import { Info } from 'lucide-react'
import type { Settings } from '../../types'
import { kcalFromMacros, progressValue } from '../../lib/calculations'
import { formatGrams, formatKcal, formatPercent } from '../../lib/format'
import { ProgressBar } from '../ui/ProgressBar'
import { CalorieSegmentBar } from './CalorieSegmentBar'
import { cn } from '../../lib/cn'

export function MacroEnergyNotice({
  targets,
  className,
  compact = false,
}: {
  targets: Settings['targets']
  className?: string
  compact?: boolean
}) {
  const macroKcal = kcalFromMacros(targets.protein, targets.carbs, targets.fat)
  const difference = targets.calories - macroKcal
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-xl border border-sky-500/20 bg-sky-500/[0.06] text-sky-300',
        compact ? 'px-3 py-2.5 text-[10px]' : 'p-3.5 text-[11px]',
        className,
      )}
    >
      <Info className={cn('shrink-0', compact ? 'mt-px h-3 w-3' : 'mt-0.5 h-3.5 w-3.5')} />
      <p className="leading-relaxed">
        Tus macros suman <strong className="font-semibold">{formatKcal(macroKcal)} kcal</strong> (P{' '}
        {formatGrams(targets.protein)} × 4 + C {formatGrams(targets.carbs)} × 4 + G {formatGrams(targets.fat)} × 9),
        mientras que el objetivo energético es de <strong className="font-semibold">{formatKcal(targets.calories)} kcal</strong>
        {difference !== 0 ? ` (${difference > 0 ? 'faltan' : 'sobran'} ${formatKcal(Math.abs(difference))} kcal)` : ''}. Son
        objetivos independientes y no se modifican automáticamente.
      </p>
    </div>
  )
}

interface NutritionSummaryProps {
  totals: {
    calories: number
    caloriesEstimated: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  targets: Settings['targets']
  showEnergyNotice?: boolean
  mealSegments?: { meal: string; kcal: number }[]
}

export function NutritionSummary({ totals, targets, showEnergyNotice = true, mealSegments }: NutritionSummaryProps) {
  const calories = progressValue(totals.calories, targets.calories)
  const carbsInRange =
    totals.carbs >= Math.min(targets.carbMin, targets.carbMax) && totals.carbs <= Math.max(targets.carbMin, targets.carbMax)
  const macroKcal = kcalFromMacros(totals.protein, totals.carbs, totals.fat)

  return (
    <div className="card-pad">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-fg">Resumen del día</h2>
        <span className={cn('chip', calories.exceeded ? 'chip-danger' : '')}>{formatPercent(calories.percent)} kcal</span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                'font-display text-[42px] font-semibold leading-none tracking-tight tabular',
                calories.exceeded ? 'text-rose-400' : 'text-fg',
              )}
            >
              {formatKcal(totals.calories)}
            </span>
            <span className="text-sm text-faint">/ {formatKcal(targets.calories)} kcal</span>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {calories.exceeded
              ? `Exceso de ${formatKcal(Math.abs(calories.remaining))} kcal`
              : `Te quedan ${formatKcal(calories.remaining)} kcal`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-faint">Cumplimiento</p>
          <p className={cn('text-lg font-semibold tabular', calories.exceeded ? 'text-rose-400' : 'text-accent')}>
            {formatPercent(calories.percent)}
          </p>
        </div>
      </div>

      {mealSegments && mealSegments.length > 0 ? (
        <div className="mt-3">
          <CalorieSegmentBar segments={mealSegments} target={targets.calories} heightClassName="h-2" />
        </div>
      ) : (
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-500 ease-out',
              calories.exceeded ? 'bg-rose-400' : 'bg-gradient-to-r from-lime-600 to-lime-300',
            )}
            style={{ width: `${calories.visualPercent}%` }}
          />
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-line bg-raised/60 p-2.5 text-[10px]">
        <div>
          <p className="text-faint">Etiqueta</p>
          <p className="mt-0.5 font-semibold tabular text-fg">{formatKcal(totals.calories)} kcal</p>
        </div>
        <div>
          <p className="text-faint">Calculado de macros</p>
          <p className="mt-0.5 font-semibold tabular text-fg">{formatKcal(totals.caloriesEstimated)} kcal</p>
        </div>
      </div>

      <div className="mt-4 space-y-3.5">
        <ProgressBar label="Proteínas" consumed={totals.protein} target={targets.protein} color="#38bdf8" showRemaining />
        <ProgressBar label="Grasas" consumed={totals.fat} target={targets.fat} color="#fbbf24" showRemaining />
        <ProgressBar label="Carbohidratos" consumed={totals.carbs} target={targets.carbs} color="#c084fc" showRemaining />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className={cn('chip', carbsInRange ? 'border-lime-500/30 text-accent' : '')}>
          Rango carbos: {formatGrams(targets.carbMin)}–{formatGrams(targets.carbMax)} g
        </span>
        <span className="chip">Fibra {formatGrams(totals.fiber)} g</span>
        <span className="chip">Macros {formatKcal(macroKcal)} kcal</span>
      </div>

      {showEnergyNotice ? <MacroEnergyNotice targets={targets} className="mt-3" /> : null}
    </div>
  )
}
