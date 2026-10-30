import { MEAL_LABELS } from '../../types'
import { formatKcal } from '../../lib/format'
import { cn } from '../../lib/cn'

export const MEAL_COLORS: Record<string, string> = {
  desayuno: '#5B8DEF',
  almuerzo: '#9B82D8',
  comida: '#36A6A0',
  merienda: '#D477A8',
  snack: '#8293A8',
  cena: '#5276A5',
}

export interface CalorieSegment {
  meal: string
  kcal: number
}

interface Props {
  segments: CalorieSegment[]
  target: number
  heightClassName?: string
  showLegend?: boolean
  legendClassName?: string
}

export function CalorieSegmentBar({
  segments,
  target,
  heightClassName = 'h-2.5',
  showLegend = true,
  legendClassName,
}: Props) {
  const valid = segments.filter((s) => s.kcal > 0)
  const total = valid.reduce((a, s) => a + s.kcal, 0)
  const scale = total > target && target > 0 ? target / total : 1

  return (
    <>
      <div className={`${heightClassName} w-full overflow-hidden rounded-full bg-line flex`}>
        {valid.map((seg) => {
          const width = target > 0 ? (seg.kcal * scale / target) * 100 : 0
          const color = MEAL_COLORS[seg.meal] ?? '#8293A8'
          const label = (MEAL_LABELS as Record<string, string>)[seg.meal] ?? seg.meal
          return (
            <div
              key={seg.meal}
              className="h-full transition-[width] duration-700 ease-out"
              style={{ width: `${width}%`, backgroundColor: color }}
              title={`${label}: ${formatKcal(seg.kcal)} kcal`}
            />
          )
        })}
      </div>
      {showLegend && valid.length > 0 && (
        <div className={cn('mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]', legendClassName)}>
          {valid.map((seg) => {
            const label = (MEAL_LABELS as Record<string, string>)[seg.meal] ?? seg.meal
            return (
              <span key={seg.meal} className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: MEAL_COLORS[seg.meal] ?? '#8293A8' }}
                />
                <span className="text-faint">{label}</span>
                <span className="font-medium tabular text-fg">{formatKcal(seg.kcal)} kcal</span>
              </span>
            )
          })}
        </div>
      )}
    </>
  )
}
