import { describe, expect, it } from 'vitest'
import {
  addDaysISO,
  capitalize,
  diffInDays,
  eachDateISO,
  endOfMonthISO,
  endOfWeekISO,
  formatDuration,
  formatMonthYear,
  fromISODate,
  greetingForHour,
  isFuture,
  isValidISODate,
  minutesBetween,
  monthKey,
  relativeDayLabel,
  startOfMonthISO,
  startOfWeekISO,
  toISODate,
  weekLabel,
} from './dates'

describe('fechas ISO locales', () => {
  it('convierte una fecha local sin desfase UTC', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toISODate(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
  })

  it('interpreta una fecha ISO como fecha local a medianoche', () => {
    const date = fromISODate('2026-03-15')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(2)
    expect(date.getDate()).toBe(15)
    expect(date.getHours()).toBe(0)
  })

  it('valida fechas ISO reales y rechaza formatos o días inexistentes', () => {
    expect(isValidISODate('2026-02-28')).toBe(true)
    expect(isValidISODate('2024-02-29')).toBe(true)
    expect(isValidISODate('2026-02-29')).toBe(false)
    expect(isValidISODate('2026-04-31')).toBe(false)
    expect(isValidISODate('15/03/2026')).toBe(false)
    expect(isValidISODate('2026-3-5')).toBe(false)
    expect(isValidISODate(20260315)).toBe(false)
    expect(isValidISODate(null)).toBe(false)
  })

  it('suma y resta días cruzando meses, años y cambios de hora', () => {
    expect(addDaysISO('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDaysISO('2026-03-28', 2)).toBe('2026-03-30')
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysISO('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDaysISO('2024-02-28', 1)).toBe('2024-02-29')
  })

  it('calcula la diferencia en días completos', () => {
    expect(diffInDays('2026-01-01', '2026-01-10')).toBe(9)
    expect(diffInDays('2026-01-10', '2026-01-01')).toBe(-9)
    expect(diffInDays('2026-01-01', '2026-01-01')).toBe(0)
  })
})

describe('semanas y meses', () => {
  it('usa el lunes como inicio de semana', () => {
    expect(startOfWeekISO('2026-01-05')).toBe('2026-01-05') // lunes
    expect(startOfWeekISO('2026-01-08')).toBe('2026-01-05') // jueves
    expect(startOfWeekISO('2026-01-11')).toBe('2026-01-05') // domingo
    expect(startOfWeekISO('2026-01-01')).toBe('2025-12-29')
  })

  it('calcula el domingo de la misma semana', () => {
    expect(endOfWeekISO('2026-01-05')).toBe('2026-01-11')
    expect(endOfWeekISO('2026-01-11')).toBe('2026-01-11')
  })

  it('calcula los límites del mes incluyendo años bisiestos', () => {
    expect(startOfMonthISO('2026-03-18')).toBe('2026-03-01')
    expect(endOfMonthISO('2026-02-10')).toBe('2026-02-28')
    expect(endOfMonthISO('2024-02-10')).toBe('2024-02-29')
    expect(endOfMonthISO('2026-04-01')).toBe('2026-04-30')
    expect(endOfMonthISO('2026-12-31')).toBe('2026-12-31')
    expect(monthKey('2026-09-04')).toBe('2026-09')
  })

  it('genera cada fecha de un rango inclusivo', () => {
    expect(eachDateISO('2026-01-01', '2026-01-03')).toEqual(['2026-01-01', '2026-01-02', '2026-01-03'])
    expect(eachDateISO('2026-01-03', '2026-01-01')).toEqual([])
    expect(eachDateISO('2026-01-01', '2026-01-01')).toEqual(['2026-01-01'])
  })

  it('genera una etiqueta de semana legible', () => {
    expect(weekLabel('2026-01-05')).toContain('–')
    expect(weekLabel('2026-01-05')).toMatch(/5 ene/)
  })
})

describe('etiquetas y duraciones', () => {
  it('etiqueta hoy, ayer y mañana', () => {
    expect(relativeDayLabel('2026-06-10', '2026-06-10')).toBe('Hoy')
    expect(relativeDayLabel('2026-06-09', '2026-06-10')).toBe('Ayer')
    expect(relativeDayLabel('2026-06-11', '2026-06-10')).toBe('Mañana')
    expect(relativeDayLabel('2026-06-05', '2026-06-10')).toMatch(/5 jun/)
  })

  it('identifica fechas futuras respecto a hoy', () => {
    const future = addDaysISO(toISODate(new Date()), 1)
    const past = addDaysISO(toISODate(new Date()), -1)
    expect(isFuture(future)).toBe(true)
    expect(isFuture(past)).toBe(false)
    expect(isFuture(toISODate(new Date()))).toBe(false)
  })

  it('capitaliza la primera letra', () => {
    expect(capitalize('enero de 2026')).toBe('Enero de 2026')
    expect(capitalize('')).toBe('')
  })

  it('formatea el mes y año en español', () => {
    expect(formatMonthYear('2026-01-15')).toMatch(/enero/i)
    expect(formatMonthYear('2026-01-15')).toMatch(/2026/)
    expect(formatMonthYear('2026-01-15').charAt(0)).toBe('E')
  })

  it('calcula minutos entre dos instantes y evita negativos', () => {
    expect(minutesBetween('2026-01-01T10:00:00.000Z', '2026-01-01T11:15:00.000Z')).toBe(75)
    expect(minutesBetween('2026-01-01T11:00:00.000Z', '2026-01-01T10:00:00.000Z')).toBe(0)
    expect(minutesBetween('no-es-fecha', '2026-01-01T10:00:00.000Z')).toBe(0)
  })

  it('formatea duraciones en minutos y horas', () => {
    expect(formatDuration(0)).toBe('—')
    expect(formatDuration(-5)).toBe('—')
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(60)).toBe('1 h')
    expect(formatDuration(95)).toBe('1 h 35 min')
  })

  it('elige el saludo según la hora', () => {
    expect(greetingForHour(3)).toBe('Buenas noches')
    expect(greetingForHour(7)).toBe('Buenos días')
    expect(greetingForHour(15)).toBe('Buenas tardes')
    expect(greetingForHour(22)).toBe('Buenas noches')
  })
})
