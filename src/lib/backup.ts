import { fetchFoodsFromSupabase, fetchEntriesFromSupabase, fetchExercisesFromSupabase, fetchWorkoutsFromSupabase, fetchWorkoutExercisesFromSupabase, fetchSetsFromSupabase, fetchBodyWeightsFromSupabase, fetchSettingsFromSupabase, getCurrentUserId } from './supabase-data'
import { getSupabaseClient } from './supabase'
import { nowISO } from './id'

export async function createBackup(): Promise<Record<string, unknown>> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')

  const [settings, foods, entries, exercises, workouts, workoutExercises, sets, bodyWeights] = await Promise.all([
    fetchSettingsFromSupabase(userId),
    fetchFoodsFromSupabase(userId),
    fetchEntriesFromSupabase(userId),
    fetchExercisesFromSupabase(userId),
    fetchWorkoutsFromSupabase(userId),
    fetchWorkoutExercisesFromSupabase(userId),
    fetchSetsFromSupabase(userId),
    fetchBodyWeightsFromSupabase(userId),
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

export async function getStorageInfo(): Promise<{ usedBytes?: number; quotaBytes?: number; persisted?: boolean }> {
  try {
    const estimate = await navigator.storage?.estimate?.()
    const persisted = await navigator.storage?.persisted?.()
    return { usedBytes: estimate?.usage, quotaBytes: estimate?.quota, persisted }
  } catch {
    return {}
  }
}

export async function clearHistory(): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')
  const client = getSupabaseClient()

  await client.from('entries').delete().eq('user_id', userId)
  const { data: workouts } = await client.from('workouts').select('id').eq('user_id', userId)
  const workoutIds = (workouts || []).map((w: { id: string }) => w.id)
  if (workoutIds.length > 0) {
    await client.from('sets').delete().in('workout_id', workoutIds)
    await client.from('workout_exercises').delete().in('workout_id', workoutIds)
  }
  await client.from('workouts').delete().eq('user_id', userId)
  await client.from('body_weights').delete().eq('user_id', userId)
}

export async function resetApplication(): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')
  const client = getSupabaseClient()

  await client.from('entries').delete().eq('user_id', userId)
  const { data: workouts } = await client.from('workouts').select('id').eq('user_id', userId)
  const workoutIds = (workouts || []).map((w: { id: string }) => w.id)
  if (workoutIds.length > 0) {
    await client.from('sets').delete().in('workout_id', workoutIds)
    await client.from('workout_exercises').delete().in('workout_id', workoutIds)
  }
  await client.from('workouts').delete().eq('user_id', userId)
  await client.from('body_weights').delete().eq('user_id', userId)
  await client.from('foods').delete().eq('user_id', userId)
  await client.from('exercises').delete().eq('user_id', userId)

  await client.from('profiles').update({
    name: '',
    initial_weight_kg: 63,
    height_cm: 163,
    goal: 'perder_grasa_ganar_musculo',
  }).eq('id', userId)

  await client.from('targets').update({
    calories: 1400,
    protein: 125,
    fat: 40,
    carbs: 90,
    carb_min: 85,
    carb_max: 95,
  }).eq('user_id', userId)

  await client.from('user_preferences').update({ theme: 'dark' }).eq('user_id', userId)
}

export async function importBackupFile(_file: File): Promise<void> {
  // Simplified import - to be implemented
  throw new Error('La importación de backups se realizará en una futura actualización')
}