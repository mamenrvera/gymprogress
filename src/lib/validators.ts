import { z } from 'zod'
import { isValidISODate } from './dates'
export const goalSchema = z.enum([
  'perder_grasa_ganar_musculo',
  'perder_grasa',
  'ganar_musculo',
  'mantener',
  'rendimiento',
])
export const mealSchema = z.enum(['desayuno', 'almuerzo', 'comida', 'merienda', 'cena', 'snack'])
export const muscleGroupSchema = z.enum([
  'pecho',
  'espalda',
  'hombros',
  'biceps',
  'triceps',
  'cuadriceps',
  'isquiotibiales',
  'gluteos',
  'gemelos',
  'core',
  'cardio',
  'otro',
])

const isoDateSchema = z
  .string()
  .refine(isValidISODate, 'Introduce una fecha válida')

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .optional()
    .transform((value) => value || undefined)

export const foodSchema = z
  .object({
    name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(80, 'Máximo 80 caracteres'),
    brand: optionalText(60),
    category: optionalText(40),
    caloriesPer100: z
      .number({ invalid_type_error: 'Introduce un número' })
      .min(0, 'No puede ser negativo')
      .max(900, 'Máximo 900 kcal por 100 g'),
    proteinPer100: z
      .number({ invalid_type_error: 'Introduce un número' })
      .min(0, 'No puede ser negativo')
      .max(100, 'Máximo 100 g por 100 g'),
    carbsPer100: z
      .number({ invalid_type_error: 'Introduce un número' })
      .min(0, 'No puede ser negativo')
      .max(100, 'Máximo 100 g por 100 g'),
    fatPer100: z
      .number({ invalid_type_error: 'Introduce un número' })
      .min(0, 'No puede ser negativo')
      .max(100, 'Máximo 100 g por 100 g'),
    fiberPer100: z
      .number({ invalid_type_error: 'Introduce un número' })
      .min(0, 'No puede ser negativo')
      .max(100, 'Máximo 100 g por 100 g'),
    notes: optionalText(300),
  })
  .superRefine((value, ctx) => {
    const macroTotal = value.proteinPer100 + value.carbsPer100 + value.fatPer100
    if (macroTotal > 105) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proteinPer100'],
        message: 'La suma de proteínas, carbohidratos y grasas no puede superar 100 g por 100 g',
      })
    }
  })

export type FoodFormValues = z.infer<typeof foodSchema>

export const entrySchema = z.object({
  grams: z
    .number({ invalid_type_error: 'Introduce un número' })
    .min(0.1, 'Mínimo 0,1 g')
    .max(5000, 'Máximo 5000 g'),
  meal: mealSchema,
})

export type EntryFormValues = z.infer<typeof entrySchema>

export const settingsSchema = z
  .object({
    name: optionalText(40),
    initialWeightKg: z
      .number({ invalid_type_error: 'Introduce un número' })
      .min(20, 'Mínimo 20 kg')
      .max(400, 'Máximo 400 kg'),
    heightCm: z
      .number({ invalid_type_error: 'Introduce un número' })
      .min(80, 'Mínimo 80 cm')
      .max(250, 'Máximo 250 cm'),
    goal: goalSchema,
    calories: z
      .number({ invalid_type_error: 'Introduce un número' })
      .min(500, 'Mínimo 500 kcal')
      .max(8000, 'Máximo 8000 kcal'),
    protein: z
      .number({ invalid_type_error: 'Introduce un número' })
      .min(0, 'No puede ser negativo')
      .max(500, 'Máximo 500 g'),
    fat: z
      .number({ invalid_type_error: 'Introduce un número' })
      .min(0, 'No puede ser negativo')
      .max(300, 'Máximo 300 g'),
    carbs: z
      .number({ invalid_type_error: 'Introduce un número' })
      .min(0, 'No puede ser negativo')
      .max(800, 'Máximo 800 g'),
    carbMin: z
      .number({ invalid_type_error: 'Introduce un número' })
      .min(0, 'No puede ser negativo')
      .max(800, 'Máximo 800 g'),
    carbMax: z
      .number({ invalid_type_error: 'Introduce un número' })
      .min(0, 'No puede ser negativo')
      .max(800, 'Máximo 800 g'),
  })
  .refine((value) => value.carbMin <= value.carbMax, {
    path: ['carbMax'],
    message: 'El máximo debe ser mayor o igual que el mínimo',
  })

export type SettingsFormValues = z.infer<typeof settingsSchema>

export const exerciseSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(60, 'Máximo 60 caracteres'),
  muscleGroup: muscleGroupSchema,
  equipment: optionalText(40),
  notes: optionalText(200),
})

export type ExerciseFormValues = z.infer<typeof exerciseSchema>

export const workoutSchema = z.object({
  name: z.string().trim().min(2, 'Ponle un nombre a la sesión').max(60, 'Máximo 60 caracteres'),
  date: isoDateSchema,
  notes: optionalText(300),
})

export type WorkoutFormValues = z.infer<typeof workoutSchema>

export const setSchema = z.object({
  weightKg: z
    .number({ invalid_type_error: 'Introduce un número' })
    .min(0, 'No puede ser negativo')
    .max(1000, 'Máximo 1000 kg'),
  reps: z
    .number({ invalid_type_error: 'Introduce un número' })
    .min(1, 'Mínimo 1 repetición')
    .max(100, 'Máximo 100 repeticiones'),
  rir: z
    .number({ invalid_type_error: 'Introduce un número' })
    .min(0, 'Mínimo 0')
    .max(10, 'Máximo 10')
    .optional(),
})

export type SetFormValues = z.infer<typeof setSchema>

export const bodyWeightSchema = z.object({
  date: isoDateSchema,
  weightKg: z
    .number({ invalid_type_error: 'Introduce un número' })
    .min(20, 'Mínimo 20 kg')
    .max(400, 'Máximo 400 kg'),
  note: optionalText(200),
})

export type BodyWeightFormValues = z.infer<typeof bodyWeightSchema>

export const backupSchema = z.object({
  app: z.literal('GymProgress'),
  version: z.literal(1),
  exportedAt: z.string(),
  data: z.object({
    settings: z.array(z.record(z.unknown())),
    foods: z.array(z.record(z.unknown())),
    entries: z.array(z.record(z.unknown())),
    exercises: z.array(z.record(z.unknown())),
    workouts: z.array(z.record(z.unknown())),
    workoutExercises: z.array(z.record(z.unknown())),
    sets: z.array(z.record(z.unknown())),
    bodyWeights: z.array(z.record(z.unknown())),
  }),
})
