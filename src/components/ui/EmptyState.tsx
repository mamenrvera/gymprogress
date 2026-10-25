import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-10 text-center', className)}>
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-raised text-faint">
        {icon}
      </div>
      <p className="text-sm font-semibold text-fg">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
