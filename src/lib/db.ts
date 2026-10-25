import Dexie, { type EntityTable } from 'dexie'
import type {
  BodyWeight,
  Exercise,
  Food,
  FoodEntry,
  Settings,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from '../types'
import { createDefaultSettings, createSeedExercises } from './seed'

class GymProgressDatabase extends Dexie {
  settings!: EntityTable<Settings, 'id'>
  foods!: EntityTable<Food, 'id'>
  entries!: EntityTable<FoodEntry, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  workouts!: EntityTable<Workout, 'id'>
  workoutExercises!: EntityTable<WorkoutExercise, 'id'>
  sets!: EntityTable<WorkoutSet, 'id'>
  bodyWeights!: EntityTable<BodyWeight, 'id'>

  constructor() {
    super('gymprogress')
    this.version(1).stores({
      settings: 'id',
      foods: 'id, name, category, createdAt',
      entries: 'id, date, meal, foodId, createdAt, [date+meal]',
      exercises: 'id, name, muscleGroup, createdAt',
      workouts: 'id, date, status, createdAt',
      workoutExercises: 'id, workoutId, exerciseId, order',
      sets: 'id, workoutId, workoutExerciseId, setNumber',
      bodyWeights: 'id, &date, createdAt',
    })
  }
}

export const db = new GymProgressDatabase()

let initPromise: Promise<void> | null = null

/**
 * Crea los ajustes iniciales y los ejercicios de referencia solo la primera vez.
 * Nunca sobrescribe preferencias existentes.
 */
export async function initializeDatabase(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = (async () => {
    await db.open()
    await db.transaction('rw', db.settings, db.exercises, async () => {
      const existing = await db.settings.get('app')
      if (existing) return
      await db.settings.add(createDefaultSettings())
      await db.exercises.bulkAdd(createSeedExercises())
    })
    requestPersistentStorage()
  })()
  return initPromise
}

function requestPersistentStorage() {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      void navigator.storage.persist().catch(() => undefined)
    }
  } catch {
    // El navegador puede no permitir almacenamiento persistente (por ejemplo, HTTP en red local).
  }
}
