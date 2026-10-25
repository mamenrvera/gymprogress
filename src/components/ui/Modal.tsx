import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  closeOnBackdrop?: boolean
}

const sizeClasses = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
}: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement as HTMLElement | null
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const timer = window.setTimeout(() => {
      const candidate = panelRef.current?.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button[data-autofocus]',
      )
      candidate?.focus()
    }, 40)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = originalOverflow
      window.clearTimeout(timer)
      previousFocus.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onMouseDown={(event) => {
          if (closeOnBackdrop && event.target === event.currentTarget) onClose()
        }}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative flex max-h-[92dvh] w-full animate-slide-up flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl sm:animate-scale-in sm:rounded-2xl',
          sizeClasses[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {icon ? (
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-400/10 text-accent">
                {icon}
              </div>
            ) : null}
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold text-fg">
                {title}
              </h2>
              {description ? <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 -mt-1 rounded-xl p-2 text-faint transition hover:bg-raised hover:text-fg"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="border-t border-line bg-surface px-5 py-4">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
