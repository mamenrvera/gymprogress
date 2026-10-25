import { useRef } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { addDaysISO, capitalize, formatLongEs, isToday, relativeDayLabel, todayISO } from '../../lib/dates'
import { Button } from './Button'

export function DateNavigator() {
  const { selectedDate, setSelectedDate, goToToday } = useApp()
  const inputRef = useRef<HTMLInputElement>(null)
  const today = isToday(selectedDate)
  const future = selectedDate > todayISO()

  const openPicker = () => {
    const input = inputRef.current
    if (!input) return
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker()
        return
      } catch {
        // Algunos navegadores requieren interacción directa; se usa el fallback.
      }
    }
    input.focus()
    input.click()
  }

  return (
    <div className="flex items-center gap-1.5 rounded-2xl border border-line bg-surface p-1.5 shadow-card sm:gap-2 sm:p-2">
      <button
        type="button"
        className="btn-icon border-transparent bg-transparent"
        onClick={() => setSelectedDate(addDaysISO(selectedDate, -1))}
        aria-label="Día anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="relative min-w-0 flex-1">
        <button
          type="button"
          onClick={openPicker}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-2 py-1 text-center transition hover:bg-raised"
          aria-label="Elegir fecha"
        >
          <CalendarDays className="hidden h-4 w-4 shrink-0 text-accent sm:block" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-fg">{capitalize(formatLongEs(selectedDate))}</span>
            <span className="mt-0.5 flex items-center justify-center gap-1.5 text-[11px] text-faint">
              {today ? 'Hoy' : relativeDayLabel(selectedDate)}
              {future ? <span className="text-sky-400">· planificado</span> : null}
              {!today && !future ? <span>· histórico</span> : null}
            </span>
          </span>
        </button>
        <input
          ref={inputRef}
          type="date"
          value={selectedDate}
          onChange={(event) => {
            if (event.target.value) setSelectedDate(event.target.value)
          }}
          className="sr-only"
          aria-label="Fecha seleccionada"
          tabIndex={-1}
        />
      </div>

      <button
        type="button"
        className="btn-icon border-transparent bg-transparent"
        onClick={() => setSelectedDate(addDaysISO(selectedDate, 1))}
        aria-label="Día siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {!today ? (
        <Button variant="secondary" size="sm" onClick={goToToday} className="mr-0.5 px-2.5">
          Hoy
        </Button>
      ) : null}
    </div>
  )
}
