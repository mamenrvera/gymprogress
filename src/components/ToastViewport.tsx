import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'

export function ToastViewport() {
  const { toasts, dismissToast } = useApp()
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-3 bottom-24 z-[80] flex flex-col items-center gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end"
    >
      {toasts.map((toast) => {
        const Icon = toast.kind === 'success' ? CheckCircle2 : toast.kind === 'error' ? XCircle : Info
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl border border-line bg-elevated/95 px-4 py-3 text-sm shadow-card backdrop-blur"
            role="status"
          >
            <Icon
              className={
                toast.kind === 'success'
                  ? 'mt-0.5 h-4 w-4 shrink-0 text-lime-400'
                  : toast.kind === 'error'
                    ? 'mt-0.5 h-4 w-4 shrink-0 text-rose-400'
                    : 'mt-0.5 h-4 w-4 shrink-0 text-sky-400'
              }
            />
            <p className="flex-1 leading-snug text-fg">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="-mr-1 -mt-1 rounded-lg p-1 text-faint transition hover:text-fg"
              aria-label="Cerrar aviso"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
