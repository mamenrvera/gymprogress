import { supabase } from './supabase'
import type {
  Food,
  FoodEntry,
  Exercise,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  BodyWeight,
  Settings,
  ThemeMode,
  MealType,
  MuscleGroup,
  WorkoutStatus,
} from '../types'

// ============================================================
// HELPER: Obtener userId autenticado
// ============================================================
async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

// ============================================================
// FOODS
// ============================================================
export async function fetchFoodsFromSupabase(userId: string): Promise<Food[]> {
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .eq('user_id', userId)
    .order('name')
  if (error) throw error
  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    brand: row.brand as string | undefined,
    category: row.category as string | undefined,
    barcode: row.barcode as string | undefined,
    per100: {
      calories: row.calories_per_100 as number,
      protein: row.protein_per_100 as number,
      carbs: row.carbs_per_100 as number,
      fat: row.fat_per_100 as number,
      fiber: row.fiber_per_100 as number,
    },
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }))
}

export async function upsertFoodToSupabase(food: Food, userId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('foods')
    .upsert({
      id: food.id,
      user_id: userId,
      name: food.name,
      brand: food.brand,
      category: food.category,
      barcode: food.barcode,
      calories_per_100: food.per100.calories,
      protein_per_100: food.per100.protein,
      carbs_per_100: food.per100.carbs,
      fat_per_100: food.per100.fat,
      fiber_per_100: food.per100.fiber ?? 0,
      notes: food.notes,
      created_at: food.createdAt,
      updated_at: food.updatedAt,
    }, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteFoodFromSupabase(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('foods')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

// ============================================================
// ENTRIES
// ============================================================
export async function fetchEntriesFromSupabase(userId: string): Promise<FoodEntry[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at')
  if (error) throw error
  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    date: row.date as string,
    meal: row.meal as MealType,
    mealBlockId: row.meal_block_id as string | undefined,
    foodId: row.food_id as string | undefined,
    foodName: row.food_name as string,
    brand: row.brand as string | undefined,
    grams: row.grams as number,
    per100: {
      calories: row.calories_declared as number / (row.grams as number / 100),
      protein: row.protein as number / (row.grams as number / 100),
      carbs: row.carbs as number / (row.grams as number / 100),
      fat: row.fat as number / (row.grams as number / 100),
      fiber: row.fiber as number / (row.grams as number / 100),
    },
    caloriesDeclared: row.calories_declared as number,
    caloriesEstimated: row.calories_estimated as number,
    protein: row.protein as number,
    carbs: row.carbs as number,
    fat: row.fat as number,
    fiber: row.fiber as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }))
}

export async function upsertEntryToSupabase(entry: FoodEntry, userId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('entries')
    .upsert({
      id: entry.id,
      user_id: userId,
      date: entry.date,
      meal: entry.meal,
      meal_block_id: entry.mealBlockId,
      food_id: entry.foodId,
      food_name: entry.foodName,
      brand: entry.brand,
      grams: entry.grams,
      calories_declared: entry.caloriesDeclared,
      calories_estimated: entry.caloriesEstimated,
      protein: entry.protein,
      carbs: entry.carbs,
      fat: entry.fat,
      fiber: entry.fiber,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
    }, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteEntryFromSupabase(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

// ============================================================
// EXERCISES
// ============================================================
export async function fetchExercisesFromSupabase(): Promise<Exercise[]> {
  // Fetch ALL exercises (shared catalog) - RLS allows all authenticated users to read
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name')
  if (error) {
    console.error('[Supabase] Error fetching exercises:', error)
    throw error
  }
  const count = (data || []).length
  console.log('[Supabase] Fetched', count, 'exercises (shared catalog)')
  if (count === 0) {
    console.warn('[Supabase] WARNING: No exercises returned. The RLS policy "exercises_all_own" (FOR ALL, user_id = current_user_id()) from migration 002 is likely still active in Supabase. This policy restricts SELECT to only the creator. Apply migration 011_ensure_shared_exercise_catalog.sql in Supabase SQL Editor to fix.')
  } else {
    // Diagnostic: check if any exercises were created by other users
    const currentUserId = (await supabase.auth.getUser()).data.user?.id
    const otherUsersExercises = (data || []).filter((row: Record<string, unknown>) => row.user_id !== currentUserId)
    if (otherUsersExercises.length > 0) {
      console.log('[Supabase] Shared catalog working: found', otherUsersExercises.length, 'exercises from other users')
    } else if (count > 0) {
      console.log('[Supabase] All', count, 'exercises belong to current user. Either no other users have created exercises, or RLS is still filtering.')
    }
  }
  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    muscleGroup: row.muscle_group as MuscleGroup,
    equipment: row.equipment as string | undefined,
    notes: row.notes as string | undefined,
    imageUrl: row.image_url as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }))
}

export async function upsertExerciseToSupabase(exercise: Exercise, userId: string): Promise<void> {
  const { error } = await supabase
    .from('exercises')
    .upsert({
      id: exercise.id,
      user_id: userId,
      name: exercise.name,
      muscle_group: exercise.muscleGroup,
      equipment: exercise.equipment,
      notes: exercise.notes,
      image_url: exercise.imageUrl,
      created_at: exercise.createdAt,
      updated_at: exercise.updatedAt,
    }, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteExerciseFromSupabase(id: string): Promise<boolean> {
  // No filtrar por user_id: la política RLS (admin-only) controla el acceso.
  // Usar .select() para obtener las filas eliminadas y verificar éxito.
  const { data, error } = await supabase
    .from('exercises')
    .delete()
    .eq('id', id)
    .select()
  if (error) throw error
  return (data || []).length > 0
}

// ============================================================
// WORKOUTS
// ============================================================
export async function fetchWorkoutsFromSupabase(userId: string): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  if (error) throw error
  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    date: row.date as string,
    name: row.name as string,
    status: row.status as WorkoutStatus,
    notes: row.notes as string | undefined,
    startedAt: row.started_at as string | undefined,
    finishedAt: row.finished_at as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }))
}

export async function upsertWorkoutToSupabase(workout: Workout, userId: string): Promise<void> {
  const { error } = await supabase
    .from('workouts')
    .upsert({
      id: workout.id,
      user_id: userId,
      date: workout.date,
      name: workout.name,
      status: workout.status,
      notes: workout.notes,
      started_at: workout.startedAt,
      finished_at: workout.finishedAt,
      created_at: workout.createdAt,
      updated_at: workout.updatedAt,
    }, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteWorkoutFromSupabase(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

// ============================================================
// WORKOUT_EXERCISES
// ============================================================
export async function fetchWorkoutExercisesFromSupabase(userId: string): Promise<WorkoutExercise[]> {
  // Need to join with workouts to filter by user
  const { data: workouts, error: wError } = await supabase
    .from('workouts')
    .select('id')
    .eq('user_id', userId)
  if (wError) throw wError
  const workoutIds = (workouts || []).map((w: Record<string, unknown>) => w.id as string)
  if (workoutIds.length === 0) return []

  const { data, error } = await supabase
    .from('workout_exercises')
    .select('*')
    .in('workout_id', workoutIds)
    .order('order')
  if (error) throw error
  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    workoutId: row.workout_id as string,
    exerciseId: row.exercise_id as string | undefined,
    exerciseName: row.exercise_name as string,
    muscleGroup: row.muscle_group as MuscleGroup,
    order: row.order as number,
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
  }))
}

export async function upsertWorkoutExerciseToSupabase(we: WorkoutExercise): Promise<void> {
  const { error } = await supabase
    .from('workout_exercises')
    .upsert({
      id: we.id,
      workout_id: we.workoutId,
      exercise_id: we.exerciseId,
      exercise_name: we.exerciseName,
      muscle_group: we.muscleGroup,
      order: we.order,
      notes: we.notes,
      created_at: we.createdAt,
    }, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteWorkoutExerciseFromSupabase(id: string): Promise<void> {
  const { error } = await supabase
    .from('workout_exercises')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ============================================================
// SETS
// ============================================================
export async function fetchSetsFromSupabase(userId: string): Promise<WorkoutSet[]> {
  const { data: workouts, error: wError } = await supabase
    .from('workouts')
    .select('id')
    .eq('user_id', userId)
  if (wError) throw wError
  const workoutIds = (workouts || []).map((w: Record<string, unknown>) => w.id as string)
  if (workoutIds.length === 0) return []

  const { data, error } = await supabase
    .from('sets')
    .select('*')
    .in('workout_id', workoutIds)
    .order('set_number')
  if (error) throw error
  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    workoutId: row.workout_id as string,
    workoutExerciseId: row.workout_exercise_id as string,
    setNumber: row.set_number as number,
    weightKg: row.weight_kg as number,
    reps: row.reps as number,
    rir: row.rir as number | undefined,
    isWarmup: row.is_warmup as boolean,
    completed: row.completed as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }))
}

export async function upsertSetToSupabase(set: WorkoutSet): Promise<void> {
  const { error } = await supabase
    .from('sets')
    .upsert({
      id: set.id,
      workout_id: set.workoutId,
      workout_exercise_id: set.workoutExerciseId,
      set_number: set.setNumber,
      weight_kg: set.weightKg,
      reps: set.reps,
      rir: set.rir,
      is_warmup: set.isWarmup,
      completed: set.completed,
      created_at: set.createdAt,
      updated_at: set.updatedAt,
    }, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteSetFromSupabase(id: string): Promise<void> {
  const { error } = await supabase
    .from('sets')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ============================================================
// BODY_WEIGHTS
// ============================================================
export async function fetchBodyWeightsFromSupabase(userId: string): Promise<BodyWeight[]> {
  const { data, error } = await supabase
    .from('body_weights')
    .select('*')
    .eq('user_id', userId)
    .order('date')
  if (error) throw error
  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    date: row.date as string,
    weightKg: row.weight_kg as number,
    note: row.note as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }))
}

export async function upsertBodyWeightToSupabase(bw: BodyWeight, userId: string): Promise<void> {
  const { error } = await supabase
    .from('body_weights')
    .upsert({
      id: bw.id,
      user_id: userId,
      date: bw.date,
      weight_kg: bw.weightKg,
      note: bw.note,
      created_at: bw.createdAt,
      updated_at: bw.updatedAt,
    }, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteBodyWeightFromSupabase(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('body_weights')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

// ============================================================
// SETTINGS (Profile + Targets + Preferences)
// ============================================================
export async function fetchSettingsFromSupabase(userId: string): Promise<Settings | null> {
  const { data: profile, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (pError) return null

  const { data: targets, error: tError } = await supabase
    .from('targets')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (tError) return null

  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('theme')
    .eq('user_id', userId)
    .single()

  return {
    id: 'app',
    profile: {
      name: profile.name || '',
      initialWeightKg: profile.initial_weight_kg || 63,
      heightCm: profile.height_cm || 163,
      goal: (profile.goal || 'perder_grasa_ganar_musculo') as Settings['profile']['goal'],
    },
    targets: {
      calories: targets.calories || 1400,
      protein: targets.protein || 125,
      fat: targets.fat || 40,
      carbs: targets.carbs || 90,
      carbMin: targets.carb_min || 85,
      carbMax: targets.carb_max || 95,
    },
    theme: ((prefs?.theme === 'light' ? 'light' : 'dark') as ThemeMode),
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  }
}

export async function upsertSettingsToSupabase(settings: Settings, userId: string): Promise<void> {
  // Profile
  const { error: pError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      name: settings.profile.name,
      initial_weight_kg: settings.profile.initialWeightKg,
      height_cm: settings.profile.heightCm,
      goal: settings.profile.goal,
      updated_at: settings.updatedAt,
    }, { onConflict: 'id' })
  if (pError) throw pError

  // Targets
  const { error: tError } = await supabase
    .from('targets')
    .upsert({
      user_id: userId,
      calories: settings.targets.calories,
      protein: settings.targets.protein,
      fat: settings.targets.fat,
      carbs: settings.targets.carbs,
      carb_min: settings.targets.carbMin,
      carb_max: settings.targets.carbMax,
      updated_at: settings.updatedAt,
    }, { onConflict: 'user_id' })
  if (tError) throw tError

  // Preferences
  const { error: prefError } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      theme: settings.theme,
      updated_at: settings.updatedAt,
    }, { onConflict: 'user_id' })
  if (prefError) throw prefError
}

// ============================================================
// MIGRATION TOOL REMOVED
// IndexedDB has been eliminated. Data migration should be done
// via the backup import/export functionality.
// ===========================================================

// ============================================================
// CHECK IF SUPABASE HAS DATA
// ============================================================
export async function hasRemoteData(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('foods')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) return false
  return (count || 0) > 0
}

// ============================================================
// EXPORT: Check connection
// ============================================================
// ============================================================
// CARDIO SESSIONS
// ============================================================
export async function fetchCardioSessionsFromSupabase(userId: string): Promise<import('../lib/cardio').CardioSession[]> {
  const { data, error } = await (supabase as any)
    .from('cardio_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  if (error) throw error
  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    userId: row.user_id as string,
    activityType: row.activity_type as import('../lib/cardio').ActivityType,
    customName: row.custom_name as string | undefined,
    date: row.date as string,
    startTime: row.started_at as string | undefined,
    durationMin: row.duration_min as number,
    intensity: row.intensity as import('../lib/cardio').CardioIntensity,
    rpe: row.rpe as number | undefined,
    distanceKm: row.distance_km as number | undefined,
    avgSpeedKmh: row.avg_speed_kmh as number | undefined,
    maxSpeedKmh: row.max_speed_kmh as number | undefined,
    avgInclinePct: row.avg_incline_pct as number | undefined,
    maxInclinePct: row.max_incline_pct as number | undefined,
    runMin: row.run_min as number | undefined,
    walkMin: row.walk_min as number | undefined,
    warmupMin: row.warmup_min as number | undefined,
    cooldownMin: row.cooldown_min as number | undefined,
    resistance: row.resistance as number | undefined,
    cadenceRpm: row.cadence_rpm as number | undefined,
    elevationGainM: row.elevation_gain_m as number | undefined,
    surface: row.surface as string | undefined,
    modality: row.modality as import('../lib/cardio').CardioModality | undefined,
    sets: row.sets as number | undefined,
    result: row.result as string | undefined,
    calories: row.calories as number | undefined,
    caloriesSource: row.calories_source as import('../lib/cardio').CaloriesSource | undefined,
    hrAvg: row.hr_avg as number | undefined,
    hrMax: row.hr_max as number | undefined,
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }))
}

export async function upsertCardioSessionToSupabase(session: import('../lib/cardio').CardioSession, userId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cardio_sessions')
    .upsert({
      id: session.id,
      user_id: userId,
      activity_type: session.activityType,
      custom_name: session.customName,
      date: session.date,
      started_at: session.startTime,
      duration_min: session.durationMin,
      intensity: session.intensity,
      rpe: session.rpe,
      distance_km: session.distanceKm,
      avg_speed_kmh: session.avgSpeedKmh,
      max_speed_kmh: session.maxSpeedKmh,
      avg_incline_pct: session.avgInclinePct,
      max_incline_pct: session.maxInclinePct,
      run_min: session.runMin,
      walk_min: session.walkMin,
      warmup_min: session.warmupMin,
      cooldown_min: session.cooldownMin,
      resistance: session.resistance,
      cadence_rpm: session.cadenceRpm,
      elevation_gain_m: session.elevationGainM,
      surface: session.surface,
      modality: session.modality,
      sets: session.sets,
      result: session.result,
      calories: session.calories,
      calories_source: session.caloriesSource,
      hr_avg: session.hrAvg,
      hr_max: session.hrMax,
      notes: session.notes,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
    }, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteCardioSessionFromSupabase(id: string, userId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cardio_sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

// ============================================================
// MEAL BLOCKS
// ============================================================
export async function fetchMealBlocksFromSupabase(userId: string, date?: string): Promise<import('../types').MealBlock[]> {
  let q = (supabase as any).from('meal_blocks').select('*').eq('user_id', userId)
  if (date) q = q.eq('date', date)
  const { data, error } = await q.order('created_at')
  if (error) throw error
  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    userId: row.user_id as string,
    date: row.date as string,
    mealType: row.meal_type as import('../types').MealType,
    title: row.title as string | undefined,
    finishedAt: row.finished_at as string | undefined,
    qualityScore: row.quality_score as number | undefined,
    qualityVersion: row.quality_version as number | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }))
}

export async function upsertMealBlockToSupabase(block: import('../types').MealBlock, userId: string): Promise<void> {
  // Build payload with only the columns that should be included.
  // If the migration 018 hasn't been applied, the extra columns (finished_at,
  // quality_score, quality_version) won't exist and Supabase will reject them.
  // We try with all columns first, then fall back to base columns.
  const fullPayload = {
    id: block.id,
    user_id: userId,
    date: block.date,
    meal_type: block.mealType,
    title: block.title,
    finished_at: block.finishedAt,
    quality_score: block.qualityScore,
    quality_version: block.qualityVersion,
    created_at: block.createdAt,
    updated_at: block.updatedAt,
  }

  const basePayload = {
    id: block.id,
    user_id: userId,
    date: block.date,
    meal_type: block.mealType,
    title: block.title,
    created_at: block.createdAt,
    updated_at: block.updatedAt,
  }

  // Try with all columns first
  const { error: fullError } = await (supabase as any)
    .from('meal_blocks')
    .upsert(fullPayload, { onConflict: 'id' })

  if (!fullError) return

  // If the error is about missing columns, retry with base payload
  const msg = fullError.message || ''
  if (msg.includes('column') && (msg.includes('does not exist') || msg.includes('finished_at') || msg.includes('quality_score') || msg.includes('quality_version'))) {
    console.warn('[Supabase] Quality columns not found, saving base data only. Apply migration 018 to enable meal scoring.')
    const { error: baseError } = await (supabase as any)
      .from('meal_blocks')
      .upsert(basePayload, { onConflict: 'id' })
    if (baseError) {
      console.error('[Supabase] Error upserting meal block (base):', baseError)
      throw baseError
    }
    return
  }

  // If the table doesn't exist at all
  if (msg.includes('relation') && msg.includes('does not exist')) {
    console.error('[Supabase] meal_blocks table does not exist. Apply migration 017.')
    throw new Error('La tabla de comidas no existe en Supabase. Ejecuta la migración 017 en SQL Editor.')
  }

  console.error('[Supabase] Error upserting meal block:', fullError)
  throw fullError
}

export async function deleteMealBlockFromSupabase(id: string, userId: string): Promise<void> {
  const { error } = await (supabase as any).from('meal_blocks').delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
}

export { getCurrentUserId }