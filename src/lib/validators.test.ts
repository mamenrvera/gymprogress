import { describe, expect, it } from 'vitest'
import {
  backupSchema,
  bodyWeightSchema,
  entrySchema,
  exerciseSchema,
  foodSchema,
  setSchema,
  settingsSchema,
  workoutSchema,
} from './validators'

const validFood = {
  name: 'Avena integral',
  brand: 'Marca',
  category: 'Cereales y tubérculos',
  caloriesPer100: 380,
  proteinPer100: 13,
  carbsPer100: 60,
  fatPer100: 7,
  fiberPer100: 10,
  notes: 'Desayuno habitual',
}

const validSettings = {
  name: 'Mamen',
  initialWeightKg: 63,
  heightCm: 163,
  goal: 'perder_grasa_ganar_musculo' as const,
  calories: 1400,
  protein: 125,
  fat: 40,
  carbs: 90,
  carbMin: 85,
  carbMax: 95,
}

describe('foodSchema', () => {
  it('acepta un alimento válido y recorta el nombre', () => {
    const result = foodSchema.safeParse({ ...validFood, name: '  Avena integral  ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Avena integral')
      expect(result.data.caloriesPer100).toBe(380)
    }
  })

  it('rechaza nombres demasiado cortos o valores negativos', () => {
    expect(foodSchema.safeParse({ ...validFood, name: 'A' }).success).toBe(false)
    expect(foodSchema.safeParse({ ...validFood, caloriesPer100: -1 }).success).toBe(false)
    expect(foodSchema.safeParse({ ...validFood, proteinPer100: -1 }).success).toBe(false)
  })

  it('rechaza más de 100 g de macros por 100 g', () => {
    const result = foodSchema.safeParse({
      ...validFood,
      proteinPer100: 60,
      carbsPer100: 30,
      fatPer100: 30,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['proteinPer100'])
    }
  })

  it('convierte textos opcionales vacíos en undefined', () => {
    const result = foodSchema.safeParse({ ...validFood, brand: '   ', notes: '' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.brand).toBeUndefined()
      expect(result.data.notes).toBeUndefined()
    }
  })

  it('rechaza kcal por 100 g fuera de rango', () => {
    expect(foodSchema.safeParse({ ...validFood, caloriesPer100: 901 }).success).toBe(false)
  })
})

describe('entrySchema', () => {
  it('acepta gramos y comida válidos', () => {
    expect(entrySchema.safeParse({ grams: 50.5, meal: 'desayuno' }).success).toBe(true)
  })

  it('rechaza gramos fuera de rango o comidas desconocidas', () => {
    expect(entrySchema.safeParse({ grams: 0, meal: 'desayuno' }).success).toBe(false)
    expect(entrySchema.safeParse({ grams: 5001, meal: 'desayuno' }).success).toBe(false)
    expect(entrySchema.safeParse({ grams: 100, meal: 'brunch' }).success).toBe(false)
  })
})

describe('settingsSchema', () => {
  it('acepta el perfil y objetivos iniciales', () => {
    const result = settingsSchema.safeParse(validSettings)
    expect(result.success).toBe(true)
  })

  it('exige que el rango de carbohidratos sea coherente', () => {
    const result = settingsSchema.safeParse({ ...validSettings, carbMin: 100, carbMax: 90 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'carbMax')).toBe(true)
    }
  })

  it('rechaza valores imposibles', () => {
    expect(settingsSchema.safeParse({ ...validSettings, calories: 499 }).success).toBe(false)
    expect(settingsSchema.safeParse({ ...validSettings, initialWeightKg: 10 }).success).toBe(false)
    expect(settingsSchema.safeParse({ ...validSettings, heightCm: 300 }).success).toBe(false)
    expect(settingsSchema.safeParse({ ...validSettings, protein: -1 }).success).toBe(false)
    expect(settingsSchema.safeParse({ ...validSettings, goal: 'crecer' }).success).toBe(false)
  })
})

describe('exerciseSchema', () => {
  it('acepta un ejercicio válido', () => {
    expect(
      exerciseSchema.safeParse({ name: 'Press banca', muscleGroup: 'pecho', equipment: 'Barra' }).success,
    ).toBe(true)
  })

  it('rechaza un grupo muscular desconocido y nombres cortos', () => {
    expect(exerciseSchema.safeParse({ name: 'Press banca', muscleGroup: 'antebrazo' }).success).toBe(false)
    expect(exerciseSchema.safeParse({ name: 'X', muscleGroup: 'pecho' }).success).toBe(false)
  })
})

describe('workoutSchema', () => {
  it('acepta una sesión con fecha real', () => {
    expect(workoutSchema.safeParse({ name: 'Torso', date: '2026-01-05' }).success).toBe(true)
  })

  it('rechaza fechas inexistentes', () => {
    expect(workoutSchema.safeParse({ name: 'Torso', date: '2026-02-30' }).success).toBe(false)
    expect(workoutSchema.safeParse({ name: 'Torso', date: '05/01/2026' }).success).toBe(false)
  })
})

describe('setSchema', () => {
  it('acepta una serie válida con RIR opcional', () => {
    expect(setSchema.safeParse({ weightKg: 80, reps: 8, rir: 2 }).success).toBe(true)
    expect(setSchema.safeParse({ weightKg: 0, reps: 1 }).success).toBe(true)
  })

  it('rechaza repeticiones y RIR fuera de rango', () => {
    expect(setSchema.safeParse({ weightKg: 80, reps: 0 }).success).toBe(false)
    expect(setSchema.safeParse({ weightKg: 80, reps: 101 }).success).toBe(false)
    expect(setSchema.safeParse({ weightKg: 80, reps: 8, rir: 11 }).success).toBe(false)
    expect(setSchema.safeParse({ weightKg: -1, reps: 8 }).success).toBe(false)
  })
})

describe('bodyWeightSchema', () => {
  it('acepta un peso y fecha válidos', () => {
    expect(bodyWeightSchema.safeParse({ date: '2026-01-05', weightKg: 62.8, note: 'En ayunas' }).success).toBe(true)
  })

  it('rechaza pesos fuera de rango', () => {
    expect(bodyWeightSchema.safeParse({ date: '2026-01-05', weightKg: 19.9 }).success).toBe(false)
    expect(bodyWeightSchema.safeParse({ date: '2026-01-05', weightKg: 400.1 }).success).toBe(false)
  })
})

describe('backupSchema', () => {
  const emptyBackup = {
    app: 'GymProgress',
    version: 1,
    exportedAt: '2026-01-01T00:00:00.000Z',
    data: {
      settings: [],
      foods: [],
      entries: [],
      exercises: [],
      workouts: [],
      workoutExercises: [],
      sets: [],
      bodyWeights: [],
    },
  }

  it('acepta una copia de seguridad completa', () => {
    expect(backupSchema.safeParse(emptyBackup).success).toBe(true)
  })

  it('rechaza una aplicación o versión distintas', () => {
    expect(backupSchema.safeParse({ ...emptyBackup, app: 'OtraApp' }).success).toBe(false)
    expect(backupSchema.safeParse({ ...emptyBackup, version: 2 }).success).toBe(false)
  })

  it('exige todas las tablas de datos', () => {
    const result = backupSchema.safeParse({
      ...emptyBackup,
      data: { ...emptyBackup.data, entries: undefined },
    })
    expect(result.success).toBe(false)
  })
})
