import { useEffect, useId, useState, type ReactNode } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import { progressValue } from '../../lib/calculations'
import { formatGrams, formatPercent } from '../../lib/format'
import { cn } from '../../lib/cn'

interface MacroRingProps {
  label: string
  consumed: number
  target: number
  unit?: string
  color: string
  icon?: ReactNode
  className?: string
}

export function MacroRing({ label, consumed, target, unit = 'g', color, icon, className }: MacroRingProps) {
  const gradientId = `ring-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const progress = progressValue(consumed, target)
  const [animatedPercent, setAnimatedPercent] = useState(0)
  const size = 132
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimatedPercent(progress.visualPercent))
    return () => cancelAnimationFrame(frame)
  }, [progress.visualPercent])

  const offset = circumference - (animatedPercent / 100) * circumference
  const over = progress.exceeded
  const remainingText = over
    ? `Exceso de ${formatGrams(Math.abs(progress.remaining))} ${unit}`
    : `Faltan ${formatGrams(progress.remaining)} ${unit}`

  return (
    <div className={cn('flex min-w-0 flex-col items-center', className)}>
      <div
        className="relative w-full max-w-[136px]"
        role="img"
        aria-label={`${label}: ${formatGrams(consumed)} de ${formatGrams(target)} ${unit}, ${formatPercent(
          progress.percent,
        )}${over ? ', objetivo superado' : ''}`}
      >
        <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full -rotate-90 overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.75" />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="text-line"
            stroke="currentColor"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)',
              filter: `drop-shadow(0 0 6px ${color}44)`,
            }}
          />
          {over ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius + 6}
              fill="none"
              strokeWidth={2}
              strokeDasharray="2 5"
              className="text-rose-400/60"
              stroke="currentColor"
            />
          ) : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex items-baseline gap-0.5">
            <span className="font-display text-[26px] font-semibold leading-none tabular text-fg sm:text-[30px]">
              {formatGrams(consumed)}
            </span>
            <span className="text-[10px] font-medium text-faint">{unit}</span>
          </div>
          <span className="mt-1 text-[10px] text-faint">de {formatGrams(target)} {unit}</span>
        </div>
        {progress.reached ? (
          <span
            className={cn(
              'absolute -right-0.5 top-0 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm',
              over
                ? 'border-rose-400/40 bg-rose-500/15 text-rose-400'
                : 'border-lime-400/40 bg-lime-400/15 text-accent',
            )}
            title={over ? 'Objetivo superado' : 'Objetivo alcanzado'}
          >
            {over ? <AlertTriangle className="h-3 w-3" /> : <Check className="h-3.5 w-3.5" />}
          </span>
        ) : null}
      </div>

      <div className="mt-2.5 flex w-full items-center justify-between gap-1.5">
        <span className="flex min-w-0 items-center gap-1 text-[11px] font-medium text-muted">
          {icon ? <span style={{ color }} className="shrink-0">{icon}</span> : null}
          <span className="truncate">{label}</span>
        </span>
        <span className={cn('shrink-0 text-[11px] font-semibold tabular', over ? 'text-rose-400' : 'text-fg')}>
          {formatPercent(progress.percent)}
        </span>
      </div>
      <p className={cn('mt-0.5 w-full truncate text-[10px]', over ? 'text-rose-400' : 'text-faint')}>{remainingText}</p>
    </div>
  )
}
