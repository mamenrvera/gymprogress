import { describe, expect, it } from 'vitest'
import type { BodyWeight, FoodEntry, MuscleGroup, Workout, WorkoutExercise, WorkoutSet } from '../types'
import {
  bodyWeightSummary,
  dailyNutritionSeries,
  exerciseHistoryOptions,
  muscleGroupDistribution,
  nutritionPeriodSummary,
  nutritionStreak,
  percentChange,
  strengthHistory,
  trainingPeriodSummary,
  volumeByWeek,
} from './analytics'

function entry(overrides: Partial<FoodEntry> = {}): FoodEntry {
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

function workout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: 'w1',
    date: '2026-01-05',
    name: 'Torso',
    status: 'completed',
    createdAt: '2026-01-05T18:00:00.000Z',
    updatedAt: '2026-01-05T19:00:00.000Z',
    ...overrides,
  }
}

function workoutExercise(overrides: Partial<WorkoutExercise> = {}): WorkoutExercise {
  return {
    id: 'we1',
    workoutId: 'w1',
    exerciseId: 'ex-bench',
    exerciseName: 'Press banca',
    muscleGroup: 'pecho' as MuscleGroup,
    order: 0,
    createdAt: '2026-01-05T18:00:00.000Z',
    ...overrides,
  }
}

function set(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: 's1',
    workoutId: 'w1',
    workoutExerciseId: 'we1',
    setNumber: 1,
    weightKg: 60,
    reps: 10,
    isWarmup: false,
    completed: true,
    createdAt: '2026-01-05T18:05:00.000Z',
    updatedAt: '2026-01-05T18:05:00.000Z',
    ...overrides,
  }
}

function weight(overrides: Partial<BodyWeight> = {}): BodyWeight {
  return {
    id: 'bw1',
    date: '2026-01-01',
    weightKg: 63,
    createdAt: '2026-01-01T07:00:00.000Z',
    updatedAt: '2026-01-01T07:00:00.000Z',
    ...overrides,
  }
}

describe('serie diaria de nutrición', () => {
  it('rellena los días sin registros y excluye lo que está fuera del rango', () => {
    const series = dailyNutritionSeries(
      [
        entry({ id: 'e1', date: '2026-01-01', caloriesDeclared: 200, caloriesEstimated: 180, protein: 10 }),
        entry({ id: 'e2', date: '2026-01-01', caloriesDeclared: 100, caloriesEstimated: 90, protein: 5 }),
        entry({ id: 'e3', date: '2026-01-03', caloriesDeclared: 500 }),
        entry({ id: 'e4', date: '2026-01-09', caloriesDeclared: 9999 }),
      ],
      '2026-01-01',
      '2026-01-03',
    )
    expect(series).toHaveLength(3)
    expect(series[0]).toMatchObject({ date: '2026-01-01', calories: 300, protein: 15, logged: true })
    expect(series[1]).toMatchObject({ date: '2026-01-02', calories: 0, logged: false })
    expect(series[2]).toMatchObject({ date: '2026-01-03', calories: 500, logged: true })
  })
})

describe('resumen nutricional por periodo', () => {
  it('calcula medias por día natural y por día registrado', () => {
    const summary = nutritionPeriodSummary(
      [
        entry({ id: 'e1', date: '2026-01-01', caloriesDeclared: 190, protein: 6.5, carbs: 30, fat: 3.5, fiber: 5 }),
        entry({
          id: 'e2',
          date: '2026-01-02',
          caloriesDeclared: 300,
          caloriesEstimated: 290,
          protein: 20,
          carbs: 10,
          fat: 15,
          fiber: 2,
        }),
        entry({ id: 'e3', date: '2026-01-10', caloriesDeclared: 1000 }),
      ],
      '2026-01-01',
      '2026-01-07',
    )
    expect(summary.days).toBe(7)
    expect(summary.loggedDays).toBe(2)
    expect(summary.totalCalories).toBe(490)
    expect(summary.avgCalories).toBe(70)
    expect(summary.avgCaloriesLogged).toBe(245)
    expect(summary.avgProtein).toBe(13.3)
    expect(summary.avgCarbs).toBe(20)
    expect(summary.avgFat).toBe(9.3)
    expect(summary.avgFiber).toBe(3.5)
    expect(summary.avgCaloriesEstimated).toBe(234)
  })

  it('devuelve ceros cuando no hay datos', () => {
    const summary = nutritionPeriodSummary([], '2026-01-01', '2026-01-07')
    expect(summary.loggedDays).toBe(0)
    expect(summary.avgCalories).toBe(0)
    expect(summary.avgProtein).toBe(0)
  })
})

describe('resumen de entrenamiento', () => {
  it('solo considera sesiones completadas dentro del rango', () => {
    const workouts = [
      workout({ id: 'w1', date: '2026-01-05', startedAt: '2026-01-05T18:00:00.000Z', finishedAt: '2026-01-05T19:00:00.000Z' }),
      workout({ id: 'w2', date: '2026-01-06', status: 'planned' }),
      workout({ id: 'w3', date: '2026-02-01', startedAt: '2026-02-01T18:00:00.000Z', finishedAt: '2026-02-01T18:30:00.000Z' }),
    ]
    const sets = [
      set({ id: 's1', workoutId: 'w1', weightKg: 80, reps: 8 }),
      set({ id: 's2', workoutId: 'w1', weightKg: 85, reps: 6 }),
      set({ id: 's3', workoutId: 'w1', weightKg: 40, reps: 10, isWarmup: true }),
      set({ id: 's4', workoutId: 'w2', weightKg: 100, reps: 5 }),
    ]
    const summary = trainingPeriodSummary(workouts, sets, '2026-01-01', '2026-01-31')
    expect(summary.sessions).toBe(1)
    expect(summary.volume).toBe(80 * 8 + 85 * 6)
    expect(summary.effectiveSets).toBe(2)
    expect(summary.reps).toBe(14)
    expect(summary.totalMinutes).toBe(60)
    expect(summary.avgMinutes).toBe(60)
  })

  it('ignora sesiones sin duración válida', () => {
    const summary = trainingPeriodSummary([workout({ id: 'w1' })], [], '2026-01-01', '2026-01-31')
    expect(summary.sessions).toBe(1)
    expect(summary.totalMinutes).toBe(0)
    expect(summary.avgMinutes).toBe(0)
  })
})

describe('volumen por semana', () => {
  it('devuelve las semanas en orden cronológico terminando en la semana de la fecha', () => {
    const workouts = [
      workout({ id: 'w1', date: '2026-01-05' }),
      workout({ id: 'w2', date: '2026-01-13' }),
    ]
    const sets = [
      set({ id: 's1', workoutId: 'w1', weightKg: 50, reps: 10 }),
      set({ id: 's2', workoutId: 'w2', weightKg: 60, reps: 10 }),
    ]
    const weeks = volumeByWeek(workouts, sets, '2026-01-18', 2)
    expect(weeks).toHaveLength(2)
    expect(weeks[0].weekStart).toBe('2026-01-05')
    expect(weeks[0].volume).toBe(500)
    expect(weeks[0].sessions).toBe(1)
    expect(weeks[1].weekStart).toBe('2026-01-12')
    expect(weeks[1].volume).toBe(600)
    expect(weeks[1].sessions).toBe(1)
  })
})

describe('distribución por grupo muscular', () => {
  it('agrupa series efectivas completadas por músculo', () => {
    const workouts = [workout({ id: 'w1', date: '2026-01-05' })]
    const exercises = [
      workoutExercise({ id: 'we1', muscleGroup: 'pecho' }),
      workoutExercise({ id: 'we2', muscleGroup: 'espalda', exerciseId: 'ex-row', exerciseName: 'Remo' }),
    ]
    const sets = [
      set({ id: 's1', workoutId: 'w1', workoutExerciseId: 'we1', weightKg: 60, reps: 10 }),
      set({ id: 's2', workoutId: 'w1', workoutExerciseId: 'we1', weightKg: 60, reps: 8 }),
      set({ id: 's3', workoutId: 'w1', workoutExerciseId: 'we1', weightKg: 40, reps: 10, isWarmup: true }),
      set({ id: 's4', workoutId: 'w1', workoutExerciseId: 'we2', weightKg: 50, reps: 10 }),
      set({ id: 's5', workoutId: 'w1', workoutExerciseId: 'we2', weightKg: 50, reps: 10, completed: false }),
    ]
    const distribution = muscleGroupDistribution(workouts, exercises, sets, '2026-01-01', '2026-01-31')
    expect(distribution).toHaveLength(2)
    expect(distribution[0]).toMatchObject({ muscleGroup: 'pecho', label: 'Pecho', sets: 2, volume: 1080, exercises: 1 })
    expect(distribution[1]).toMatchObject({ muscleGroup: 'espalda', sets: 1, volume: 500 })
  })

  it('excluye sesiones no completadas o fuera del rango', () => {
    const workouts = [workout({ id: 'w1', status: 'planned', date: '2026-01-05' })]
    const distribution = muscleGroupDistribution(
      workouts,
      [workoutExercise()],
      [set()],
      '2026-01-01',
      '2026-01-31',
    )
    expect(distribution).toEqual([])
  })
})

describe('historial de fuerza', () => {
  it('agrupa por fecha, conserva el mejor peso y 1RM, y suma volumen', () => {
    const workouts = [
      workout({ id: 'w1', date: '2026-01-05' }),
      workout({ id: 'w2', date: '2026-01-12' }),
    ]
    const exercises = [
      workoutExercise({ id: 'we1', workoutId: 'w1' }),
      workoutExercise({ id: 'we2', workoutId: 'w2' }),
    ]
    const sets = [
      set({ id: 's1', workoutId: 'w1', workoutExerciseId: 'we1', weightKg: 80, reps: 8 }),
      set({ id: 's2', workoutId: 'w1', workoutExerciseId: 'we1', weightKg: 85, reps: 6 }),
      set({ id: 's3', workoutId: 'w1', workoutExerciseId: 'we1', weightKg: 90, reps: 5, isWarmup: true }),
      set({ id: 's4', workoutId: 'w2', workoutExerciseId: 'we2', weightKg: 90, reps: 5 }),
    ]
    const history = strengthHistory(workouts, exercises, sets, 'ex-bench')
    expect(history).toHaveLength(2)
    expect(history[0]).toMatchObject({
      date: '2026-01-05',
      workoutId: 'w1',
      maxWeight: 85,
      e1rm: 102,
      volume: 80 * 8 + 85 * 6,
      sets: 2,
    })
    expect(history[1]).toMatchObject({ date: '2026-01-12', maxWeight: 90, e1rm: 105, sets: 1 })
  })

  it('ignora sesiones no completadas', () => {
    const history = strengthHistory(
      [workout({ id: 'w1', status: 'planned' })],
      [workoutExercise()],
      [set()],
      'ex-bench',
    )
    expect(history).toEqual([])
  })
})

describe('opciones de historial de ejercicios', () => {
  it('cuenta solo ejercicios con series efectivas completadas', () => {
    const workouts = [workout({ id: 'w1' }), workout({ id: 'w2', date: '2026-01-12' })]
    const exercises = [
      workoutExercise({ id: 'we1', workoutId: 'w1' }),
      workoutExercise({ id: 'we2', workoutId: 'w2' }),
      workoutExercise({ id: 'we3', workoutId: 'w2', exerciseId: 'ex-row', exerciseName: 'Remo', muscleGroup: 'espalda' }),
    ]
    const sets = [
      set({ id: 's1', workoutId: 'w1', workoutExerciseId: 'we1' }),
      set({ id: 's2', workoutId: 'w2', workoutExerciseId: 'we2' }),
      set({ id: 's3', workoutId: 'w2', workoutExerciseId: 'we3', weightKg: 40, reps: 10 }),
    ]
    const options = exerciseHistoryOptions(workouts, exercises, sets)
    expect(options).toEqual([
      { key: 'ex-bench', name: 'Press banca', muscleGroup: 'pecho', sessions: 2 },
      { key: 'ex-row', name: 'Remo', muscleGroup: 'espalda', sessions: 1 },
    ])
  })
})

describe('peso corporal', () => {
  it('ordena y resume el histórico completo', () => {
    const weights = [
      weight({ id: 'b', date: '2026-01-10', weightKg: 62.4 }),
      weight({ id: 'a', date: '2026-01-01', weightKg: 63 }),
      weight({ id: 'c', date: '2026-01-05', weightKg: 62.8 }),
    ]
    const summary = bodyWeightSummary(weights, '2026-01-03', '2026-01-08')
    expect(summary.entries.map((item) => item.id)).toEqual(['c'])
    expect(summary.latest?.weightKg).toBe(62.4)
    expect(summary.first?.weightKg).toBe(63)
    expect(summary.change).toBe(-0.6)
    expect(summary.min).toBe(62.8)
    expect(summary.max).toBe(62.8)
  })

  it('devuelve cambio cero con menos de dos registros', () => {
    const summary = bodyWeightSummary([weight()])
    expect(summary.change).toBe(0)
    expect(summary.min).toBe(63)
    expect(summary.max).toBe(63)
  })

  it('calcula el cambio porcentual y evita dividir por cero', () => {
    expect(percentChange(110, 100)).toBe(10)
    expect(percentChange(90, 100)).toBe(-10)
    expect(percentChange(10, 0)).toBeNull()
  })
})

describe('racha de nutrición', () => {
  it('cuenta días consecutivos terminando en la fecha indicada', () => {
    const entries = [
      entry({ id: 'e1', date: '2026-01-10' }),
      entry({ id: 'e2', date: '2026-01-09' }),
      entry({ id: 'e3', date: '2026-01-08' }),
      entry({ id: 'e4', date: '2026-01-06' }),
    ]
    expect(nutritionStreak(entries, '2026-01-10')).toBe(3)
  })

  it('devuelve cero si no hay registro en la fecha final', () => {
    expect(nutritionStreak([entry({ date: '2026-01-09' })], '2026-01-10')).toBe(0)
    expect(nutritionStreak([], '2026-01-10')).toBe(0)
  })
})
