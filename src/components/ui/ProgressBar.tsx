import { progressValue } from '../../lib/calculations'
import { formatGrams } from '../../lib/format'
import { cn } from '../../lib/cn'

interface ProgressBarProps {
  label?: string
  consumed: number
  target: number
  unit?: string
  color?: string
  showRemaining?: boolean
  className?: string
  compact?: boolean
}

export function ProgressBar({
  label,
  consumed,
  target,
  unit = 'g',
  color = '#bef264',
  showRemaining = false,
  className,
  compact = false,
}: ProgressBarProps) {
  const progress = progressValue(consumed, target)
  return (
    <div className={cn('w-full', className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        {label ? (
          <span className={cn('flex items-center gap-1.5 font-medium text-muted', compact ? 'text-[11px]' : 'text-xs')}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </span>
        ) : (
          <span />
        )}
        <span className={cn('tabular text-faint', compact ? 'text-[10px]' : 'text-[11px]')}>
          <strong className={cn('font-semibold', progress.exceeded ? 'text-rose-400' : 'text-fg')}>
            {formatGrams(consumed)}
          </strong>{' '}
          / {formatGrams(target)} {unit}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${progress.visualPercent}%`, backgroundColor: color }}
        />
      </div>
      {showRemaining ? (
        <p className={cn('mt-1 text-[10px]', progress.exceeded ? 'text-rose-400' : 'text-faint')}>
          {progress.exceeded
            ? `Exceso de ${formatGrams(Math.abs(progress.remaining))} ${unit}`
            : `Faltan ${formatGrams(progress.remaining)} ${unit}`}
        </p>
      ) : null}
    </div>
  )
}
