import { roundTo } from './calculations'
import { addDaysISO, formatShortEs, startOfWeekISO } from './dates'
import type { CardioSession } from './cardio'

/** Duración en minutos a partir de horas y minutos. */
export function durationToMinutes(hours: number, minutes: number): number {
  const h = Number.isFinite(hours) ? hours : 0
  const m = Number.isFinite(minutes) ? minutes : 0
  return Math.max(0, Math.round(h * 60 + m))
}

/** Ritmo medio en minutos por km. Devuelve null si no hay datos válidos. */
export function paceMinPerKm(durationMin: number, distanceKm: number): number | null {
  if (!Number.isFinite(durationMin) || !Number.isFinite(distanceKm)) return null
  if (durationMin <= 0 || distanceKm <= 0) return null
  return durationMin / distanceKm
}

/** Formatea un ritmo (min/km) como "mm:ss". */
export function formatPace(minPerKm: number | null | undefined): string | null {
  if (minPerKm === null || minPerKm === undefined || !Number.isFinite(minPerKm) || minPerKm <= 0) return null
  const totalSeconds = Math.round(minPerKm * 60)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Velocidad media en km/h. */
export function speedKmh(distanceKm: number, durationMin: number): number | null {
  if (!Number.isFinite(distanceKm) || !Number.isFinite(durationMin)) return null
  if (distanceKm <= 0 || durationMin <= 0) return null
  const hours = durationMin / 60
  return roundTo(distanceKm / hours, 2)
}

/** Formatea velocidad como "X.X km/h". */
export function formatSpeed(kmh: number | null | undefined): string | null {
  if (kmh === null || kmh === undefined || !Number.isFinite(kmh) || kmh <= 0) return null
  return `${roundTo(kmh, 1)} km/h`
}

/** Formatea distancia. */
export function formatDistance(km: number | null | undefined): string | null {
  if (km === null || km === undefined || !Number.isFinite(km) || km < 0) return null
  if (km === 0) return null
  return `${roundTo(km, 2)} km`
}

/** Formatea duración en minutos a texto legible. */
export function formatDurationMin(min: number | null | undefined): string {
  if (min === null || min === undefined || !Number.isFinite(min) || min <= 0) return '—'
  if (min < 60) return `${Math.round(min)} min`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

/** Resumen de un periodo de sesiones de cardio. */
export interface CardioPeriodSummary {
  sessions: number
  totalMin: number
  totalDistanceKm: number
  avgDurationMin: number
  activeDays: number
  avgPaceMinPerKm: number | null
  avgSpeedKmh: number | null
}

export function cardioPeriodSummary(
  sessions: CardioSession[],
  startISO: string,
  endISO: string,
): CardioPeriodSummary {
  const inRange = sessions.filter((s) => s.date >= startISO && s.date <= endISO)
  const totalMin = inRange.reduce((sum, s) => sum + (s.durationMin || 0), 0)
  const totalDistanceKm = roundTo(inRange.reduce((sum, s) => sum + (s.distanceKm || 0), 0), 2)
  const activeDays = new Set(inRange.map((s) => s.date)).size
  const sessionsWithPace = inRange.filter((s) => s.distanceKm && s.distanceKm > 0 && s.durationMin > 0)
  const paces = sessionsWithPace.map((s) => paceMinPerKm(s.durationMin, s.distanceKm!)!).filter((p) => p !== null) as number[]
  const avgPace = paces.length > 0 ? roundTo(paces.reduce((a, b) => a + b, 0) / paces.length, 2) : null
  const speeds = inRange.filter((s) => s.avgSpeedKmh && s.avgSpeedKmh > 0).map((s) => s.avgSpeedKmh!)
  const avgSpeed = speeds.length > 0 ? roundTo(speeds.reduce((a, b) => a + b, 0) / speeds.length, 2) : null
  return {
    sessions: inRange.length,
    totalMin,
    totalDistanceKm,
    avgDurationMin: inRange.length > 0 ? Math.round(totalMin / inRange.length) : 0,
    activeDays,
    avgPaceMinPerKm: avgPace,
    avgSpeedKmh: avgSpeed,
  }
}

/** Puntos semanales de tiempo de actividad. */
export interface WeeklyCardioPoint {
  weekStart: string
  label: string
  minutes: number
  distanceKm: number
  sessions: number
}

export function cardioByWeek(
  sessions: CardioSession[],
  endISO: string,
  weekCount = 8,
): WeeklyCardioPoint[] {
  const currentWeek = startOfWeekISO(endISO)
  const result: WeeklyCardioPoint[] = []
  for (let i = weekCount - 1; i >= 0; i -= 1) {
    const weekStart = addDaysISO(currentWeek, -7 * i)
    const weekEnd = addDaysISO(weekStart, 6)
    const inRange = sessions.filter((s) => s.date >= weekStart && s.date <= weekEnd)
    result.push({
      weekStart,
      label: formatShortEs(weekStart),
      minutes: inRange.reduce((sum, s) => sum + (s.durationMin || 0), 0),
      distanceKm: roundTo(inRange.reduce((sum, s) => sum + (s.distanceKm || 0), 0), 2),
      sessions: inRange.length,
    })
  }
  return result
}

/** Distribución del tiempo por tipo de actividad en un periodo. */
export interface ActivityDistribution {
  activityType: string
  label: string
  minutes: number
  sessions: number
  distanceKm: number
}

export function cardioByActivity(
  sessions: CardioSession[],
  startISO: string,
  endISO: string,
): ActivityDistribution[] {
  const inRange = sessions.filter((s) => s.date >= startISO && s.date <= endISO)
  const map = new Map<string, ActivityDistribution>()
  for (const s of inRange) {
    const key = s.activityType
    const existing = map.get(key)
    if (existing) {
      existing.minutes += s.durationMin || 0
      existing.sessions += 1
      existing.distanceKm = roundTo(existing.distanceKm + (s.distanceKm || 0), 2)
    } else {
      map.set(key, {
        activityType: key,
        label: s.customName || (s.activityType as string),
        minutes: s.durationMin || 0,
        sessions: 1,
        distanceKm: roundTo(s.distanceKm || 0, 2),
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes)
}

/** Sesión anterior comparable (mismo tipo de actividad, fecha anterior). */
export function previousComparableSession(
  sessions: CardioSession[],
  current: CardioSession,
): CardioSession | null {
  const candidates = sessions
    .filter((s) => s.activityType === current.activityType && s.date < current.date)
    .sort((a, b) => b.date.localeCompare(a.date))
  return candidates[0] ?? null
}

export interface CardioSessionDiff {
  durationDiffMin: number | null
  durationPct: number | null
  distanceDiffKm: number | null
  distancePct: number | null
  paceDiffMinPerKm: number | null
  speedDiffKmh: number | null
  inclineDiffPct: number | null
}

export function sessionDiff(current: CardioSession, previous: CardioSession | null): CardioSessionDiff {
  if (!previous) {
    return {
      durationDiffMin: null,
      durationPct: null,
      distanceDiffKm: null,
      distancePct: null,
      paceDiffMinPerKm: null,
      speedDiffKmh: null,
      inclineDiffPct: null,
    }
  }
  const durDiff = (current.durationMin || 0) - (previous.durationMin || 0)
  const durPct = previous.durationMin > 0 ? roundTo((durDiff / previous.durationMin) * 100, 1) : null
  const distDiff = roundTo((current.distanceKm || 0) - (previous.distanceKm || 0), 2)
  const distPct = previous.distanceKm && previous.distanceKm > 0 ? roundTo((distDiff / previous.distanceKm) * 100, 1) : null
  const curPace = paceMinPerKm(current.durationMin, current.distanceKm ?? 0)
  const prevPace = paceMinPerKm(previous.durationMin, previous.distanceKm ?? 0)
  const paceDiff = curPace !== null && prevPace !== null ? roundTo(curPace - prevPace, 2) : null
  const speedDiff = current.avgSpeedKmh != null && previous.avgSpeedKmh != null
    ? roundTo(current.avgSpeedKmh - previous.avgSpeedKmh, 2)
    : null
  const inclineDiff = current.avgInclinePct != null && previous.avgInclinePct != null
    ? roundTo(current.avgInclinePct - previous.avgInclinePct, 2)
    : null
  return {
    durationDiffMin: durDiff,
    durationPct: durPct,
    distanceDiffKm: distDiff,
    distancePct: distPct,
    paceDiffMinPerKm: paceDiff,
    speedDiffKmh: speedDiff,
    inclineDiffPct: inclineDiff,
  }
}

/** Récords personales por tipo de actividad. */
export interface CardioRecord {
  activityType: string
  label: string
  metric: string
  value: number
  unit: string
  date: string
  sessionId: string
}

export function cardioRecords(sessions: CardioSession[]): CardioRecord[] {
  const records: CardioRecord[] = []
  const byType = new Map<string, CardioSession[]>()
  for (const s of sessions) {
    const list = byType.get(s.activityType) ?? []
    list.push(s)
    byType.set(s.activityType, list)
  }

  for (const [type, list] of byType) {
    const label = type // will be mapped by caller if needed
    // Max distance
    const withDist = list.filter((s) => s.distanceKm && s.distanceKm > 0)
    if (withDist.length > 0) {
      const best = withDist.reduce((a, b) => ((b.distanceKm ?? 0) > (a.distanceKm ?? 0) ? b : a))
      records.push({ activityType: type, label, metric: 'Mayor distancia', value: best.distanceKm!, unit: 'km', date: best.date, sessionId: best.id })
    }
    // Max duration
    const bestDur = list.reduce((a, b) => (b.durationMin > a.durationMin ? b : a))
    records.push({ activityType: type, label, metric: 'Mayor duración', value: bestDur.durationMin, unit: 'min', date: bestDur.date, sessionId: bestDur.id })
    // Best pace (lower is better) for run-like activities
    const withPace = list.filter((s) => s.distanceKm && s.distanceKm > 0 && s.durationMin > 0)
    if (withPace.length > 0) {
      const best = withPace.reduce((a, b) => {
        const pa = paceMinPerKm(a.durationMin, a.distanceKm!)!
        const pb = paceMinPerKm(b.durationMin, b.distanceKm!)!
        return pb < pa ? b : a
      })
      const p = paceMinPerKm(best.durationMin, best.distanceKm!)!
      records.push({ activityType: type, label, metric: 'Mejor ritmo', value: roundTo(p, 2), unit: 'min/km', date: best.date, sessionId: best.id })
    }
    // Max avg speed
    const withSpeed = list.filter((s) => s.avgSpeedKmh && s.avgSpeedKmh > 0)
    if (withSpeed.length > 0) {
      const best = withSpeed.reduce((a, b) => ((b.avgSpeedKmh ?? 0) > (a.avgSpeedKmh ?? 0) ? b : a))
      records.push({ activityType: type, label, metric: 'Mayor velocidad media', value: best.avgSpeedKmh!, unit: 'km/h', date: best.date, sessionId: best.id })
    }
    // Max incline
    const withIncline = list.filter((s) => s.avgInclinePct != null && s.avgInclinePct > 0)
    if (withIncline.length > 0) {
      const best = withIncline.reduce((a, b) => ((b.avgInclinePct ?? 0) > (a.avgInclinePct ?? 0) ? b : a))
      records.push({ activityType: type, label, metric: 'Mayor inclinación media', value: best.avgInclinePct!, unit: '%', date: best.date, sessionId: best.id })
    }
    // Max elevation
    const withElev = list.filter((s) => s.elevationGainM != null && s.elevationGainM > 0)
    if (withElev.length > 0) {
      const best = withElev.reduce((a, b) => ((b.elevationGainM ?? 0) > (a.elevationGainM ?? 0) ? b : a))
      records.push({ activityType: type, label, metric: 'Mayor desnivel', value: best.elevationGainM!, unit: 'm', date: best.date, sessionId: best.id })
    }
  }
  return records
}