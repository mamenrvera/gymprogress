import { z } from 'zod'

export const ACTIVITY_TYPES = [
  'cinta_correr', 'cinta_andar', 'cinta_inclinada', 'bici_estatica', 'spinning', 'eliptica', 'escaladora', 'remo',
  'correr_aire', 'caminar_aire', 'senderismo', 'ciclismo', 'trail',
  'padel', 'tenis', 'badminton', 'squash',
  'natacion', 'zumba', 'clase_dirigida', 'boxeo', 'deporte_equipo', 'personalizado',
] as const

export const INTENSITIES = ['suave', 'moderada', 'alta', 'muy_alta'] as const
export const MODALITIES = ['individual', 'dobles', 'clase', 'entrenamiento'] as const
export const CALORIES_SOURCES = ['auto', 'dispositivo', 'manual'] as const

const optionalNumber = (min?: number, max?: number) => {
  let s = z.coerce.number()
  if (min !== undefined) s = s.min(min, `Mínimo ${min}`)
  if (max !== undefined) s = s.max(max, `Máximo ${max}`)
  return s.optional().nullable()
}

export const cardioSessionSchema = z.object({
  activityType: z.enum(ACTIVITY_TYPES),
  customName: z.string().trim().max(60).optional().or(z.literal('')),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  startTime: z.string().optional().or(z.literal('')),
  durationHours: z.coerce.number().int().min(0).max(24).optional(),
  durationMinutes: z.coerce.number().int().min(0).max(59).optional(),
  intensity: z.enum(INTENSITIES),
  rpe: optionalNumber(1, 10),
  distanceKm: optionalNumber(0),
  avgSpeedKmh: optionalNumber(0, 60),
  maxSpeedKmh: optionalNumber(0, 80),
  avgInclinePct: optionalNumber(0, 45),
  maxInclinePct: optionalNumber(0, 45),
  runMin: optionalNumber(0),
  walkMin: optionalNumber(0),
  warmupMin: optionalNumber(0),
  cooldownMin: optionalNumber(0),
  resistance: optionalNumber(0, 100),
  cadenceRpm: optionalNumber(0, 300),
  elevationGainM: optionalNumber(0, 10000),
  surface: z.string().trim().max(40).optional().or(z.literal('')),
  modality: z.enum(MODALITIES).optional().or(z.literal('')),
  sets: optionalNumber(0, 100),
  result: z.string().trim().max(40).optional().or(z.literal('')),
  calories: optionalNumber(0, 100000),
  caloriesSource: z.enum(CALORIES_SOURCES).optional().or(z.literal('')),
  hrAvg: optionalNumber(30, 250),
  hrMax: optionalNumber(30, 250),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
}).refine((d) => {
  const h = d.durationHours ?? 0
  const m = d.durationMinutes ?? 0
  return h * 60 + m > 0
}, { message: 'La duración debe ser mayor que 0', path: ['durationMinutes'] })

export type CardioSessionFormValues = z.infer<typeof cardioSessionSchema>

/** Convierte los valores del formulario a la entidad CardioSession. */
export function formToSession(values: CardioSessionFormValues, existingId?: string): Omit<CardioSession, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { id?: string } {
  const durationMin = (values.durationHours ?? 0) * 60 + (values.durationMinutes ?? 0)
  return {
    id: existingId,
    activityType: values.activityType as ActivityType,
    customName: values.customName || undefined,
    date: values.date,
    startTime: values.startTime || undefined,
    durationMin,
    intensity: values.intensity as CardioIntensity,
    rpe: values.rpe ?? undefined,
    distanceKm: values.distanceKm ?? undefined,
    avgSpeedKmh: values.avgSpeedKmh ?? undefined,
    maxSpeedKmh: values.maxSpeedKmh ?? undefined,
    avgInclinePct: values.avgInclinePct ?? undefined,
    maxInclinePct: values.maxInclinePct ?? undefined,
    runMin: values.runMin ?? undefined,
    walkMin: values.walkMin ?? undefined,
    warmupMin: values.warmupMin ?? undefined,
    cooldownMin: values.cooldownMin ?? undefined,
    resistance: values.resistance ?? undefined,
    cadenceRpm: values.cadenceRpm ?? undefined,
    elevationGainM: values.elevationGainM ?? undefined,
    surface: values.surface || undefined,
    modality: (values.modality as CardioModality) || undefined,
    sets: values.sets ?? undefined,
    result: values.result || undefined,
    calories: values.calories ?? undefined,
    caloriesSource: (values.caloriesSource as CaloriesSource) || undefined,
    hrAvg: values.hrAvg ?? undefined,
    hrMax: values.hrMax ?? undefined,
    notes: values.notes || undefined,
  }
}

// re-export types for convenience
import type { ActivityType, CardioIntensity, CardioModality, CaloriesSource, CardioSession } from './cardio'
export type { ActivityType, CardioIntensity, CardioModality, CaloriesSource, CardioSession }