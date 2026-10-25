import { describe, expect, it } from 'vitest'
import type { FoodEntry, WorkoutSet } from '../types'
import {
  bmi,
  clamp,
  EMPTY_TOTALS,
  energyGap,
  entriesForMeal,
  epley1RM,
  kcalFromMacros,
  macroDistribution,
  nutritionForGrams,
  progressValue,
  roundTo,
  setVolume,
  sumEntries,
  targetMacroEnergy,
  workoutStats,
} from './calculations'

function makeSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: 'set-1',
    workoutId: 'workout-1',
    workoutExerciseId: 'we-1',
    setNumber: 1,
    weightKg: 60,
    reps: 10,
    isWarmup: false,
    completed: true,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    ...overrides,
  }
}

function makeEntry(overrides: Partial<FoodEntry> = {}): FoodEntry {
  return {
    id: 'entry-1',
    date: '2026-01-01',
    meal: 'desayuno',
    foodName: 'Avena',
    grams: 50,
    per100: { calories: 380, protein: 13, carbs: 60, fat: 7, fiber: 10 },
    caloriesDeclared: 190,
    caloriesEstimated: 178,
    protein: 6.5,
    carbs: 30,
    fat: 3.5,
    fiber: 5,
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
    ...overrides,
  }
}

describe('roundTo y clamp', () => {
  it('redondea a los decimales indicados', () => {
    expect(roundTo(1.23456, 2)).toBe(1.23)
    expect(roundTo(1.25, 1)).toBe(1.3)
    expect(roundTo(0, 1)).toBe(0)
  })

  it('devuelve 0 para valores no finitos', () => {
    expect(roundTo(Number.NaN)).toBe(0)
    expect(roundTo(Number.POSITIVE_INFINITY)).toBe(0)
  })

  it('limita un valor dentro del rango', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-3, 0, 10)).toBe(0)
    expect(clamp(13, 0, 10)).toBe(10)
  })
})

describe('energía y macros', () => {
  it('calcula la energía teórica con 4/4/9', () => {
    expect(kcalFromMacros(125, 90, 40)).toBe(1220)
    expect(kcalFromMacros(0, 0, 0)).toBe(0)
    expect(kcalFromMacros(10, 20, 5)).toBe(165)
  })

  it('calcula la energía de los objetivos del perfil inicial', () => {
    const targets = { protein: 125, carbs: 90, fat: 40, calories: 1400, carbMin: 85, carbMax: 95 }
    expect(targetMacroEnergy(targets)).toBe(1220)
    expect(targetMacroEnergy({ targets })).toBe(1220)
  })

  it('calcula la diferencia entre calorías objetivo y energía de macros', () => {
    expect(energyGap(1400, 1220)).toBe(180)
    expect(energyGap(1220, 1400)).toBe(-180)
  })

  it('convierte nutrientes por 100 g a la cantidad consumida', () => {
    const result = nutritionForGrams(
      { calories: 380, protein: 13, carbs: 60, fat: 7, fiber: 10 },
      50,
    )
    expect(result.caloriesDeclared).toBe(190)
    expect(result.protein).toBe(6.5)
    expect(result.carbs).toBe(30)
    expect(result.fat).toBe(3.5)
    expect(result.fiber).toBe(5)
    expect(result.caloriesEstimated).toBe(177.5)
  })

  it('no genera valores negativos con gramos inválidos', () => {
    const result = nutritionForGrams({ calories: 100, protein: 10, carbs: 10, fat: 2 }, -50)
    expect(result.caloriesDeclared).toBe(0)
    expect(result.protein).toBe(0)
    expect(result.caloriesEstimated).toBe(0)
  })

  it('suma entradas usando las calorías declaradas como principal', () => {
    const totals = sumEntries([
      makeEntry(),
      makeEntry({
        id: 'entry-2',
        meal: 'comida',
        caloriesDeclared: 300,
        caloriesEstimated: 290,
        protein: 20,
        carbs: 10,
        fat: 15,
        fiber: 2,
      }),
    ])
    expect(totals).toEqual({
      calories: 490,
      caloriesEstimated: 468,
      protein: 26.5,
      carbs: 40,
      fat: 18.5,
      fiber: 7,
    })
  })

  it('devuelve totales vacíos sin entradas y no muta la constante', () => {
    expect(sumEntries([])).toEqual(EMPTY_TOTALS)
    expect(EMPTY_TOTALS).toEqual({ calories: 0, caloriesEstimated: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })
  })

  it('distribuye las calorías por macro', () => {
    const distribution = macroDistribution({
      calories: 0,
      caloriesEstimated: 0,
      protein: 125,
      carbs: 90,
      fat: 40,
      fiber: 0,
    })
    expect(distribution.map((item) => item.value)).toEqual([500, 360, 360])
    expect(distribution.map((item) => item.name)).toEqual(['Proteínas', 'Carbohidratos', 'Grasas'])
  })
})

describe('progreso diario', () => {
  it('calcula porcentaje, restante y estado', () => {
    const result = progressValue(1200, 1400)
    expect(result.percent).toBe(85.7)
    expect(result.remaining).toBe(200)
    expect(result.exceeded).toBe(false)
    expect(result.reached).toBe(false)
    expect(result.visualPercent).toBeCloseTo(85.71, 2)
  })

  it('marca objetivo alcanzado y excedido', () => {
    const reached = progressValue(1400, 1400)
    expect(reached.reached).toBe(true)
    expect(reached.exceeded).toBe(false)

    const exceeded = progressValue(1500, 1400)
    expect(exceeded.exceeded).toBe(true)
    expect(exceeded.remaining).toBe(-100)
    expect(exceeded.visualPercent).toBe(100)
  })

  it('maneja objetivos en cero y valores inválidos', () => {
    const result = progressValue(Number.NaN, 0)
    expect(result.percent).toBe(0)
    expect(result.remaining).toBe(0)
    expect(result.reached).toBe(false)
    expect(result.exceeded).toBe(false)
  })
})

describe('entrenamiento', () => {
  it('estima 1RM con Epley', () => {
    expect(epley1RM(100, 5)).toBe(116.7)
    expect(epley1RM(60, 10)).toBe(80)
    expect(epley1RM(0, 10)).toBe(0)
    expect(epley1RM(100, 0)).toBe(0)
    expect(epley1RM(Number.NaN, 10)).toBe(0)
  })

  it('solo suma volumen de series completadas y no de calentamiento', () => {
    expect(setVolume(makeSet({ weightKg: 80, reps: 8 }))).toBe(640)
    expect(setVolume(makeSet({ completed: false }))).toBe(0)
    expect(setVolume(makeSet({ isWarmup: true }))).toBe(0)
    expect(setVolume(makeSet({ weightKg: -10, reps: 5 }))).toBe(0)
    expect(setVolume(makeSet({ weightKg: Number.NaN, reps: 5 }))).toBe(0)
  })

  it('resume series, volumen, repeticiones y mejor serie', () => {
    const stats = workoutStats(
      [
        makeSet({ id: 'warmup', weightKg: 40, reps: 10, isWarmup: true }),
        makeSet({ id: 's1', weightKg: 80, reps: 8 }),
        makeSet({ id: 's2', weightKg: 85, reps: 6 }),
        makeSet({ id: 'pending', weightKg: 90, reps: 5, completed: false }),
      ],
      3,
    )
    expect(stats.exerciseCount).toBe(3)
    expect(stats.totalSets).toBe(3)
    expect(stats.effectiveSets).toBe(2)
    expect(stats.warmupSets).toBe(1)
    expect(stats.pendingSets).toBe(1)
    expect(stats.volume).toBe(80 * 8 + 85 * 6)
    expect(stats.reps).toBe(14)
    expect(stats.bestSet).toEqual({ weightKg: 85, reps: 6, e1rm: 102 })
  })

  it('no devuelve mejor serie si no hay series efectivas', () => {
    const stats = workoutStats([makeSet({ isWarmup: true })], 1)
    expect(stats.bestSet).toBeUndefined()
    expect(stats.volume).toBe(0)
  })

  it('filtra entradas por comida y las ordena por creación', () => {
    const entries = [
      makeEntry({ id: 'b', createdAt: '2026-01-01T09:00:00.000Z' }),
      makeEntry({ id: 'a', createdAt: '2026-01-01T08:00:00.000Z' }),
      makeEntry({ id: 'c', meal: 'cena' }),
    ]
    expect(entriesForMeal(entries, 'desayuno').map((entry) => entry.id)).toEqual(['a', 'b'])
  })

  it('calcula el IMC', () => {
    expect(bmi(63, 163)).toBe(23.7)
    expect(bmi(0, 163)).toBe(0)
    expect(bmi(63, 0)).toBe(0)
  })
})
