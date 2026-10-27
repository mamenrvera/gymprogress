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
  const { error } = await supabase
    .from('foods')
    .upsert({
      id: food.id,
      user_id: userId,
      name: food.name,
      brand: food.brand,
      category: food.category,
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
  const { error } = await supabase
    .from('entries')
    .upsert({
      id: entry.id,
      user_id: userId,
      date: entry.date,
      meal: entry.meal,
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
  if (error) throw error
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
export { getCurrentUserId }