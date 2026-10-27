import { describe, expect, it } from 'vitest'
import {
  backupSchema,
  bodyWeightSchema,
  entrySchema,
  exerciseSchema,
  foodSchema,
  getFoodMacroWarnings,
  parseDecimal,
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

  it('acepta macros que superan los 100 g (validación no bloqueante)', () => {
    const result = foodSchema.safeParse({
      ...validFood,
      proteinPer100: 60,
      carbsPer100: 30,
      fatPer100: 30,
    })
    // Ya no se rechaza; se muestra advertencia en el formulario
    expect(result.success).toBe(true)
  })

  it('acepta macros con decimales exactos de la etiqueta', () => {
    const result = foodSchema.safeParse({
      ...validFood,
      proteinPer100: 8.4,
      carbsPer100: 62.3,
      fatPer100: 18.7,
      fiberPer100: 5.2,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.proteinPer100).toBe(8.4)
      expect(result.data.carbsPer100).toBe(62.3)
      expect(result.data.fatPer100).toBe(18.7)
      expect(result.data.fiberPer100).toBe(5.2)
    }
  })

  it('getFoodMacroWarnings devuelve advertencia cuando macros superan 100 g', () => {
    const warnings = getFoodMacroWarnings({
      proteinPer100: 60,
      carbsPer100: 30,
      fatPer100: 30,
      fiberPer100: 10,
    })
    expect(warnings.length).toBeGreaterThan(0)
    expect(warnings[0]).toContain('supera los 100 g')
  })

  it('getFoodMacroWarnings no devuelve advertencia cuando macros son coherentes', () => {
    const warnings = getFoodMacroWarnings({
      proteinPer100: 13,
      carbsPer100: 60,
      fatPer100: 7,
      fiberPer100: 10,
    })
    expect(warnings.length).toBe(0)
  })

  it('getFoodMacroWarnings avisa si la fibra supera los carbohidratos', () => {
    const warnings = getFoodMacroWarnings({
      proteinPer100: 20,
      carbsPer100: 10,
      fatPer100: 5,
      fiberPer100: 15,
    })
    expect(warnings.length).toBeGreaterThan(0)
    expect(warnings.some(w => w.includes('fibra'))).toBe(true)
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

describe('parseDecimal', () => {
  it('convierte coma decimal a punto', () => {
    expect(parseDecimal('8,4')).toBe(8.4)
    expect(parseDecimal('62,35')).toBe(62.35)
    expect(parseDecimal('0,5')).toBe(0.5)
  })

  it('mantiene punto decimal', () => {
    expect(parseDecimal('18.7')).toBe(18.7)
    expect(parseDecimal('0.5')).toBe(0.5)
  })

  it('acepta cero', () => {
    expect(parseDecimal('0')).toBe(0)
    expect(parseDecimal('0,0')).toBe(0)
  })

  it('rechaza campo vacío (NaN, no cero)', () => {
    expect(Number.isNaN(parseDecimal(''))).toBe(true)
    expect(Number.isNaN(parseDecimal('   '))).toBe(true)
  })

  it('rechaza formato inválido', () => {
    expect(Number.isNaN(parseDecimal('8,4,5'))).toBe(true)
    expect(Number.isNaN(parseDecimal('abc'))).toBe(true)
    expect(Number.isNaN(parseDecimal('1.2.3'))).toBe(true)
  })

  it('no multiplica por 10 ni por 100', () => {
    expect(parseDecimal('8,4')).toBe(8.4)
    expect(parseDecimal('8.4')).toBe(8.4)
    expect(parseDecimal('0,05')).toBe(0.05)
  })

  it('acepta números negativos', () => {
    expect(parseDecimal('-1.5')).toBe(-1.5)
  })

  it('pasa números directamente', () => {
    expect(parseDecimal(8.4)).toBe(8.4)
    expect(parseDecimal(0)).toBe(0)
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
