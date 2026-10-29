import { describe, it, expect } from 'vitest'
import {
  durationToMinutes,
  paceMinPerKm,
  formatPace,
  speedKmh,
  formatSpeed,
  formatDistance,
  formatDurationMin,
  cardioPeriodSummary,
  cardioByWeek,
  cardioByActivity,
  previousComparableSession,
  sessionDiff,
  cardioRecords,
} from './cardioCalculations'
import type { CardioSession } from './cardio'

function mk(overrides: Partial<CardioSession> = {}): CardioSession {
  return {
    id: overrides.id ?? 's1',
    userId: 'u1',
    activityType: overrides.activityType ?? 'correr_aire',
    date: overrides.date ?? '2026-01-05',
    durationMin: overrides.durationMin ?? 30,
    intensity: overrides.intensity ?? 'moderada',
    createdAt: '2026-01-05T00:00:00Z',
    updatedAt: '2026-01-05T00:00:00Z',
    ...overrides,
  }
}

describe('durationToMinutes', () => {
  it('convierte horas y minutos', () => {
    expect(durationToMinutes(1, 30)).toBe(90)
  })
  it('maneja cero', () => {
    expect(durationToMinutes(0, 0)).toBe(0)
  })
  it('ignora valores inválidos', () => {
    expect(durationToMinutes(NaN, 10)).toBe(10)
  })
})

describe('paceMinPerKm', () => {
  it('calcula ritmo', () => {
    expect(paceMinPerKm(30, 5)).toBe(6)
  })
  it('devuelve null si distancia es 0', () => {
    expect(paceMinPerKm(30, 0)).toBeNull()
  })
  it('devuelve null si duración es 0', () => {
    expect(paceMinPerKm(0, 5)).toBeNull()
  })
  it('devuelve null con valores inválidos', () => {
    expect(paceMinPerKm(NaN, 5)).toBeNull()
  })
})

describe('formatPace', () => {
  it('formatea 6.0 como 6:00', () => {
    expect(formatPace(6)).toBe('6:00')
  })
  it('formatea 5.5 como 5:30', () => {
    expect(formatPace(5.5)).toBe('5:30')
  })
  it('devuelve null para null/0', () => {
    expect(formatPace(null)).toBeNull()
    expect(formatPace(0)).toBeNull()
  })
})

describe('speedKmh', () => {
  it('calcula velocidad', () => {
    expect(speedKmh(5, 30)).toBe(10)
  })
  it('devuelve null si distancia 0', () => {
    expect(speedKmh(0, 30)).toBeNull()
  })
})

describe('formatSpeed / formatDistance / formatDurationMin', () => {
  it('formatea velocidad', () => {
    expect(formatSpeed(10.5)).toBe('10.5 km/h')
    expect(formatSpeed(null)).toBeNull()
  })
  it('formatea distancia', () => {
    expect(formatDistance(5.25)).toBe('5.25 km')
    expect(formatDistance(0)).toBeNull()
    expect(formatDistance(null)).toBeNull()
  })
  it('formatea duración', () => {
    expect(formatDurationMin(30)).toBe('30 min')
    expect(formatDurationMin(90)).toBe('1 h 30 min')
    expect(formatDurationMin(0)).toBe('—')
  })
})

describe('cardioPeriodSummary', () => {
  it('resume periodo vacío', () => {
    const s = cardioPeriodSummary([], '2026-01-01', '2026-01-07')
    expect(s.sessions).toBe(0)
    expect(s.totalMin).toBe(0)
    expect(s.activeDays).toBe(0)
  })
  it('suma duración y distancia', () => {
    const sessions = [mk({ id: '1', date: '2026-01-05', durationMin: 30, distanceKm: 5 }), mk({ id: '2', date: '2026-01-06', durationMin: 20, distanceKm: 3 })]
    const s = cardioPeriodSummary(sessions, '2026-01-01', '2026-01-07')
    expect(s.sessions).toBe(2)
    expect(s.totalMin).toBe(50)
    expect(s.totalDistanceKm).toBe(8)
    expect(s.activeDays).toBe(2)
    expect(s.avgDurationMin).toBe(25)
  })
  it('filtra por rango', () => {
    const sessions = [mk({ id: '1', date: '2026-01-05', durationMin: 30 })]
    const s = cardioPeriodSummary(sessions, '2026-02-01', '2026-02-07')
    expect(s.sessions).toBe(0)
  })
})

describe('cardioByWeek', () => {
  it('genera 8 semanas', () => {
    const weeks = cardioByWeek([], '2026-01-10', 8)
    expect(weeks).toHaveLength(8)
  })
  it('agrega minutos por semana', () => {
    const sessions = [mk({ id: '1', date: '2026-01-05', durationMin: 30 })]
    const weeks = cardioByWeek(sessions, '2026-01-10', 2)
    const last = weeks[weeks.length - 1]
    expect(last.minutes).toBe(30)
  })
})

describe('cardioByActivity', () => {
  it('agrupa por tipo', () => {
    const sessions = [
      mk({ id: '1', date: '2026-01-05', activityType: 'correr_aire', durationMin: 30 }),
      mk({ id: '2', date: '2026-01-05', activityType: 'correr_aire', durationMin: 20 }),
      mk({ id: '3', date: '2026-01-06', activityType: 'padel', durationMin: 60 }),
    ]
    const dist = cardioByActivity(sessions, '2026-01-01', '2026-01-31')
    expect(dist).toHaveLength(2)
    const run = dist.find((d) => d.activityType === 'correr_aire')!
    expect(run.minutes).toBe(50)
    expect(run.sessions).toBe(2)
  })
})

describe('previousComparableSession', () => {
  it('devuelve la sesión anterior del mismo tipo', () => {
    const sessions = [
      mk({ id: '1', date: '2026-01-01', activityType: 'correr_aire' }),
      mk({ id: '2', date: '2026-01-05', activityType: 'correr_aire' }),
      mk({ id: '3', date: '2026-01-03', activityType: 'padel' }),
    ]
    const prev = previousComparableSession(sessions, sessions[1])
    expect(prev?.id).toBe('1')
  })
  it('devuelve null si no hay anterior', () => {
    const sessions = [mk({ id: '1', date: '2026-01-05', activityType: 'correr_aire' })]
    expect(previousComparableSession(sessions, sessions[0])).toBeNull()
  })
})

describe('sessionDiff', () => {
  it('calcula diferencias', () => {
    const cur = mk({ id: '2', date: '2026-01-10', durationMin: 35, distanceKm: 6 })
    const prev = mk({ id: '1', date: '2026-01-03', durationMin: 30, distanceKm: 5 })
    const d = sessionDiff(cur, prev)
    expect(d.durationDiffMin).toBe(5)
    expect(d.distanceDiffKm).toBe(1)
  })
  it('devuelve nulls si no hay previa', () => {
    const cur = mk({ id: '2', date: '2026-01-10', durationMin: 35 })
    const d = sessionDiff(cur, null)
    expect(d.durationDiffMin).toBeNull()
  })
})

describe('cardioRecords', () => {
  it('calcula récords por actividad', () => {
    const sessions = [
      mk({ id: '1', date: '2026-01-01', activityType: 'correr_aire', durationMin: 30, distanceKm: 5, avgSpeedKmh: 10 }),
      mk({ id: '2', date: '2026-01-05', activityType: 'correr_aire', durationMin: 40, distanceKm: 8, avgSpeedKmh: 12 }),
    ]
    const recs = cardioRecords(sessions)
    const maxDist = recs.find((r) => r.metric === 'Mayor distancia')!
    expect(maxDist.value).toBe(8)
    const maxDur = recs.find((r) => r.metric === 'Mayor duración')!
    expect(maxDur.value).toBe(40)
  })
  it('no genera récord de distancia sin distancia válida', () => {
    const sessions = [mk({ id: '1', date: '2026-01-01', activityType: 'zumba', durationMin: 45 })]
    const recs = cardioRecords(sessions)
    expect(recs.find((r) => r.metric === 'Mayor distancia')).toBeUndefined()
    expect(recs.find((r) => r.metric === 'Mayor duración')).toBeDefined()
  })
})