const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const WEEKDAYS_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** Fecha local en formato YYYY-MM-DD (sin desfase UTC). */
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function fromISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export function isValidISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = fromISODate(value)
  if (Number.isNaN(date.getTime())) return false
  return toISODate(date) === value
}

export function addDaysISO(iso: string, days: number): string {
  const date = fromISODate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

/** Días completos entre dos fechas (b - a). */
export function diffInDays(a: string, b: string): number {
  const ms = fromISODate(b).getTime() - fromISODate(a).getTime()
  return Math.round(ms / 86_400_000)
}

/** Lunes de la semana que contiene la fecha. */
export function startOfWeekISO(iso: string): string {
  const date = fromISODate(iso)
  const weekday = date.getDay()
  const offset = weekday === 0 ? -6 : 1 - weekday
  date.setDate(date.getDate() + offset)
  return toISODate(date)
}

export function endOfWeekISO(iso: string): string {
  return addDaysISO(startOfWeekISO(iso), 6)
}

export function startOfMonthISO(iso: string): string {
  return `${iso.slice(0, 7)}-01`
}

export function endOfMonthISO(iso: string): string {
  const date = fromISODate(iso)
  date.setMonth(date.getMonth() + 1, 0)
  return toISODate(date)
}

export function eachDateISO(startISO: string, endISO: string): string[] {
  const days = diffInDays(startISO, endISO)
  if (days < 0) return []
  const result: string[] = []
  for (let i = 0; i <= Math.min(days, 1000); i += 1) {
    result.push(addDaysISO(startISO, i))
  }
  return result
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function formatLongEs(iso: string): string {
  const date = fromISODate(iso)
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

export function formatMediumEs(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(fromISODate(iso))
}

export function formatShortEs(iso: string): string {
  const date = fromISODate(iso)
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`
}

export function formatWeekdayShortEs(iso: string): string {
  return WEEKDAYS_SHORT[fromISODate(iso).getDay()]
}

export function formatWeekdayLongEs(iso: string): string {
  return WEEKDAYS_LONG[fromISODate(iso).getDay()]
}

export function formatMonthYear(iso: string): string {
  return capitalize(
    new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(fromISODate(iso)),
  )
}

export function formatDateTimeEs(isoDateTime: string): string {
  const date = new Date(isoDateTime)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function relativeDayLabel(iso: string, today = todayISO()): string {
  const diff = diffInDays(today, iso)
  if (diff === 0) return 'Hoy'
  if (diff === -1) return 'Ayer'
  if (diff === 1) return 'Mañana'
  return formatShortEs(iso)
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function isToday(iso: string): boolean {
  return iso === todayISO()
}

export function isFuture(iso: string): boolean {
  return iso > todayISO()
}

export function greetingForHour(hour = new Date().getHours()): string {
  if (hour < 6) return 'Buenas noches'
  if (hour < 13) return 'Buenos días'
  if (hour < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export function minutesBetween(startISO: string, endISO: string): number {
  const start = new Date(startISO).getTime()
  const end = new Date(endISO).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0
  return Math.round((end - start) / 60_000)
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—'
  if (minutes < 60) return `${Math.round(minutes)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

/** Etiqueta corta de una semana a partir de su lunes. */
export function weekLabel(weekStartISO: string): string {
  return `${formatShortEs(weekStartISO)} – ${formatShortEs(addDaysISO(weekStartISO, 6))}`
}
