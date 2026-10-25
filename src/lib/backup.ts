import type { BackupFile, BodyWeight, Exercise, Food, FoodEntry, Settings, Workout, WorkoutExercise, WorkoutSet } from '../types'
import { db } from './db'
import { backupSchema } from './validators'
import { createDefaultSettings, createSeedExercises } from './seed'
import { nowISO } from './id'

export async function createBackup(): Promise<BackupFile> {
  const [settings, foods, entries, exercises, workouts, workoutExercises, sets, bodyWeights] = await Promise.all([
    db.settings.toArray(),
    db.foods.toArray(),
    db.entries.toArray(),
    db.exercises.toArray(),
    db.workouts.toArray(),
    db.workoutExercises.toArray(),
    db.sets.toArray(),
    db.bodyWeights.toArray(),
  ])
  return {
    app: 'GymProgress',
    version: 1,
    exportedAt: nowISO(),
    data: { settings, foods, entries, exercises, workouts, workoutExercises, sets, bodyWeights },
  }
}

export async function downloadBackup(): Promise<string> {
  const backup = await createBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  anchor.href = url
  anchor.download = `gymprogress-backup-${date}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
  return anchor.download
}

export async function importBackupFile(file: File): Promise<void> {
  let raw: unknown
  try {
    raw = JSON.parse(await file.text())
  } catch {
    throw new Error('El archivo no es un JSON válido')
  }
  const parsed = backupSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error('El archivo no tiene el formato de copia de seguridad de GymProgress')
  }
  const data = parsed.data.data
  const settings = data.settings as unknown as Settings[]
  if (!settings.some((item) => item.id === 'app')) {
    throw new Error('La copia no contiene una configuración válida')
  }

  await db.transaction(
    'rw',
    [db.settings, db.foods, db.entries, db.exercises, db.workouts, db.workoutExercises, db.sets, db.bodyWeights],
    async () => {
      await Promise.all([
        db.settings.clear(),
        db.foods.clear(),
        db.entries.clear(),
        db.exercises.clear(),
        db.workouts.clear(),
        db.workoutExercises.clear(),
        db.sets.clear(),
        db.bodyWeights.clear(),
      ])
      await db.settings.bulkPut(settings)
      await db.foods.bulkPut(data.foods as unknown as Food[])
      await db.entries.bulkPut(data.entries as unknown as FoodEntry[])
      await db.exercises.bulkPut(data.exercises as unknown as Exercise[])
      await db.workouts.bulkPut(data.workouts as unknown as Workout[])
      await db.workoutExercises.bulkPut(data.workoutExercises as unknown as WorkoutExercise[])
      await db.sets.bulkPut(data.sets as unknown as WorkoutSet[])
      await db.bodyWeights.bulkPut(data.bodyWeights as unknown as BodyWeight[])
    },
  )
}

export async function clearHistory(): Promise<void> {
  await db.transaction('rw', [db.entries, db.workouts, db.workoutExercises, db.sets, db.bodyWeights], async () => {
    await Promise.all([
      db.entries.clear(),
      db.workouts.clear(),
      db.workoutExercises.clear(),
      db.sets.clear(),
      db.bodyWeights.clear(),
    ])
  })
}

export async function resetApplication(): Promise<void> {
  await db.transaction(
    'rw',
    [db.settings, db.foods, db.entries, db.exercises, db.workouts, db.workoutExercises, db.sets, db.bodyWeights],
    async () => {
      await Promise.all([
        db.settings.clear(),
        db.foods.clear(),
        db.entries.clear(),
        db.exercises.clear(),
        db.workouts.clear(),
        db.workoutExercises.clear(),
        db.sets.clear(),
        db.bodyWeights.clear(),
      ])
      await db.settings.add(createDefaultSettings())
      await db.exercises.bulkAdd(createSeedExercises())
    },
  )
}

export async function getStorageInfo(): Promise<{ usedBytes?: number; quotaBytes?: number; persisted?: boolean }> {
  try {
    const estimate = await navigator.storage?.estimate?.()
    const persisted = await navigator.storage?.persisted?.()
    return { usedBytes: estimate?.usage, quotaBytes: estimate?.quota, persisted }
  } catch {
    return {}
  }
}
