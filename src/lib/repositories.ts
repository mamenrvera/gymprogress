import type {
  BodyWeight,
  Exercise,
  Food,
  FoodEntry,
  MealType,
  MuscleGroup,
  NutritionPer100,
  Settings,
  ThemeMode,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  WorkoutStatus,
} from '../types'
import type { BodyWeightFormValues, ExerciseFormValues, FoodFormValues, SettingsFormValues, WorkoutFormValues } from './validators'
import { nutritionForGrams } from './calculations'
import { newId, nowISO } from './id'
import {
  upsertFoodToSupabase,
  deleteFoodFromSupabase,
  upsertEntryToSupabase,
  deleteEntryFromSupabase,
  upsertExerciseToSupabase,
  deleteExerciseFromSupabase,
  upsertWorkoutToSupabase,
  deleteWorkoutFromSupabase,
  upsertWorkoutExerciseToSupabase,
  deleteWorkoutExerciseFromSupabase,
  upsertSetToSupabase,
  deleteSetFromSupabase,
  upsertBodyWeightToSupabase,
  deleteBodyWeightFromSupabase,
  upsertSettingsToSupabase,
  getCurrentUserId,
} from './supabase-data'

// ——— Alimentos ———
function per100FromForm(values: FoodFormValues): NutritionPer100 {
  return {
    calories: values.caloriesPer100,
    protein: values.proteinPer100,
    carbs: values.carbsPer100,
    fat: values.fatPer100,
    fiber: values.fiberPer100,
  }
}

export async function saveFood(values: FoodFormValues, existingId?: string): Promise<Food> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')

  const timestamp = nowISO()
  let food: Food
  if (existingId) {
    food = {
      id: existingId,
      name: values.name,
      brand: values.brand,
      category: values.category,
      per100: per100FromForm(values),
      notes: values.notes,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  } else {
    food = {
      id: newId(),
      name: values.name,
      brand: values.brand,
      category: values.category,
      per100: per100FromForm(values),
      notes: values.notes,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  }

  await upsertFoodToSupabase(food, userId)
  return food
}

export async function deleteFood(id: string): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')
  await deleteFoodFromSupabase(id, userId)
}

// ——— Registro de comidas ———
export async function addFoodEntry(params: {
  food: Food
  grams: number
  date: string
  meal: MealType
}): Promise<FoodEntry> {
  if (!Number.isFinite(params.grams) || params.grams <= 0) throw new Error('Los gramos deben ser mayores que 0')
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')

  const nutrition = nutritionForGrams(params.food.per100, params.grams)
  const timestamp = nowISO()
  const entry: FoodEntry = {
    id: newId(),
    date: params.date,
    meal: params.meal,
    foodId: params.food.id,
    foodName: params.food.name,
    brand: params.food.brand,
    grams: params.grams,
    per100: { ...params.food.per100 },
    ...nutrition,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await upsertEntryToSupabase(entry, userId)
  return entry
}

export async function updateFoodEntry(
  id: string,
  updates: { grams?: number; meal?: MealType },
): Promise<FoodEntry> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')

  // We need the existing entry to recalculate nutrition
  // Fetch existing entry from Supabase to recalculate nutrition
  const { data: existing, error: fetchError } = await (await import('./supabase')).getSupabaseClient()
    .from('entries')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()
  if (fetchError || !existing) throw new Error('La entrada ya no existe')

  const grams = updates.grams ?? (existing.grams as number)
  if (!Number.isFinite(grams) || grams <= 0) throw new Error('Los gramos deben ser mayores que 0')

  const per100: NutritionPer100 = {
    calories: (existing.calories_declared as number) / ((existing.grams as number) / 100),
    protein: (existing.protein as number) / ((existing.grams as number) / 100),
    carbs: (existing.carbs as number) / ((existing.grams as number) / 100),
    fat: (existing.fat as number) / ((existing.grams as number) / 100),
    fiber: (existing.fiber as number) / ((existing.grams as number) / 100),
  }
  const nutrition = nutritionForGrams(per100, grams)
  const updated: FoodEntry = {
    id,
    date: existing.date as string,
    meal: (updates.meal ?? existing.meal) as MealType,
    foodId: existing.food_id as string | undefined,
    foodName: existing.food_name as string,
    brand: existing.brand as string | undefined,
    grams,
    per100,
    caloriesDeclared: nutrition.caloriesDeclared,
    caloriesEstimated: nutrition.caloriesEstimated,
    protein: nutrition.protein,
    carbs: nutrition.carbs,
    fat: nutrition.fat,
    fiber: nutrition.fiber,
    createdAt: existing.created_at as string,
    updatedAt: nowISO(),
  }

  await upsertEntryToSupabase(updated, userId)
  return updated
}

export async function deleteFoodEntry(id: string): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')
  await deleteEntryFromSupabase(id, userId)
}

// ——— Ejercicios ———
export async function saveExercise(values: ExerciseFormValues, existingId?: string, imageUrl?: string | null): Promise<Exercise> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')

  const timestamp = nowISO()
  let exercise: Exercise
  if (existingId) {
    // Fetch existing to preserve imageUrl if not changed
    const { data: existing } = await (await import('./supabase')).getSupabaseClient()
      .from('exercises')
      .select('image_url, created_at')
      .eq('id', existingId)
      .eq('user_id', userId)
      .single()
    exercise = {
      id: existingId,
      name: values.name,
      muscleGroup: values.muscleGroup as MuscleGroup,
      equipment: values.equipment,
      notes: values.notes,
      // null means "remove photo", undefined means "keep existing"
      imageUrl: imageUrl === null ? undefined : (imageUrl !== undefined ? imageUrl : (existing?.image_url as string | undefined)),
      createdAt: (existing?.created_at as string) ?? timestamp,
      updatedAt: timestamp,
    }
    // If removing photo, delete from storage
    if (imageUrl === null && existing?.image_url) {
      try {
        const { deleteExercisePhoto } = await import('./storage')
        await deleteExercisePhoto(existing.image_url as string)
      } catch (e) {
        console.error('[Repo] Error deleting old photo:', e)
      }
    }
  } else {
    exercise = {
      id: newId(),
      name: values.name,
      muscleGroup: values.muscleGroup as MuscleGroup,
      equipment: values.equipment,
      notes: values.notes,
      imageUrl: imageUrl ?? undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  }

  await upsertExerciseToSupabase(exercise, userId)
  return exercise
}

export async function deleteExercise(id: string): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')

  // Fetch the exercise to get its image_url before deleting
  // (cualquier usuario autenticado puede leer ejercicios del catálogo compartido)
  const client = (await import('./supabase')).getSupabaseClient()
  const { data: existing } = await client
    .from('exercises')
    .select('image_url')
    .eq('id', id)
    .single()

  // Delete the photo from storage if it exists
  // (solo el propietario de la foto puede eliminarla - RLS en storage)
  if (existing?.image_url) {
    try {
      const { deleteExercisePhoto } = await import('./storage')
      await deleteExercisePhoto(existing.image_url as string)
    } catch (e) {
      console.error('[Repo] Error deleting exercise photo:', e)
    }
  }

  const deleted = await deleteExerciseFromSupabase(id)
  if (!deleted) {
    throw new Error('No tienes permiso para eliminar este ejercicio. Solo el administrador puede hacerlo.')
  }
}

// ——— Sesiones de entrenamiento ———
export async function createWorkout(
  values: WorkoutFormValues,
  options: { startNow: boolean } = { startNow: true },
): Promise<Workout> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')

  const timestamp = nowISO()
  const workout: Workout = {
    id: newId(),
    date: values.date,
    name: values.name,
    notes: values.notes,
    status: options.startNow ? 'in_progress' : 'planned',
    startedAt: options.startNow ? timestamp : undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await upsertWorkoutToSupabase(workout, userId)
  return workout
}

export async function updateWorkoutDetails(
  id: string,
  values: Pick<WorkoutFormValues, 'name' | 'date' | 'notes'>,
): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')

  const { data: existing, error: fetchError } = await (await import('./supabase')).getSupabaseClient()
    .from('workouts')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()
  if (fetchError || !existing) throw new Error('La sesión no existe')

  const workout: Workout = {
    id,
    date: values.date,
    name: values.name,
    notes: values.notes,
    status: existing.status as WorkoutStatus,
    startedAt: existing.started_at as string | undefined,
    finishedAt: existing.finished_at as string | undefined,
    createdAt: existing.created_at as string,
    updatedAt: nowISO(),
  }

  await upsertWorkoutToSupabase(workout, userId)
}

export async function setWorkoutStatus(id: string, status: WorkoutStatus): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')

  const { data: existing, error: fetchError } = await (await import('./supabase')).getSupabaseClient()
    .from('workouts')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()
  if (fetchError || !existing) throw new Error('La sesión no existe')

  const timestamp = nowISO()
  const patch: Partial<Workout> = { status, updatedAt: timestamp }
  if (status === 'in_progress') {
    patch.startedAt = (existing.started_at as string) ?? timestamp
    patch.finishedAt = undefined
  } else if (status === 'completed') {
    patch.startedAt = (existing.started_at as string) ?? timestamp
    patch.finishedAt = timestamp
  } else if (status === 'planned') {
    patch.startedAt = undefined
    patch.finishedAt = undefined
  }

  const workout: Workout = {
    id,
    date: existing.date as string,
    name: existing.name as string,
    notes: existing.notes as string | undefined,
    status,
    startedAt: patch.startedAt,
    finishedAt: patch.finishedAt,
    createdAt: existing.created_at as string,
    updatedAt: timestamp,
  }

  await upsertWorkoutToSupabase(workout, userId)
}

export async function deleteWorkout(id: string): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')
  await deleteWorkoutFromSupabase(id, userId)
}

export async function addExerciseToWorkout(
  workoutId: string,
  exercise: { id?: string; name: string; muscleGroup: MuscleGroup },
): Promise<WorkoutExercise> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')

  // Verify workout belongs to user
  const { data: workout, error: wError } = await (await import('./supabase')).getSupabaseClient()
    .from('workouts')
    .select('id')
    .eq('id', workoutId)
    .eq('user_id', userId)
    .single()
  if (wError || !workout) throw new Error('La sesión no existe o no te pertenece')

  const existing = await (await import('./supabase')).getSupabaseClient()
    .from('workout_exercises')
    .select('order')
    .eq('workout_id', workoutId)
  const order = (existing.data || []).reduce((max: number, item: { order: number }) => Math.max(max, item.order), 0) + 1

  const workoutExercise: WorkoutExercise = {
    id: newId(),
    workoutId,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    muscleGroup: exercise.muscleGroup,
    order,
    createdAt: nowISO(),
  }

  await upsertWorkoutExerciseToSupabase(workoutExercise)
  return workoutExercise
}

export async function removeWorkoutExercise(id: string): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')
  await deleteWorkoutExerciseFromSupabase(id)
}

export async function addSet(params: {
  workoutExerciseId: string
  workoutId: string
  weightKg: number
  reps: number
  rir?: number
  isWarmup?: boolean
  completed?: boolean
}): Promise<WorkoutSet> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')

  // Verify workout belongs to user
  const { data: workout, error: wError } = await (await import('./supabase')).getSupabaseClient()
    .from('workouts')
    .select('id')
    .eq('id', params.workoutId)
    .eq('user_id', userId)
    .single()
  if (wError || !workout) throw new Error('La sesión no existe o no te pertenece')

  const { data: existing } = await (await import('./supabase')).getSupabaseClient()
    .from('sets')
    .select('set_number')
    .eq('workout_exercise_id', params.workoutExerciseId)
  const setNumber = (existing || []).reduce((max: number, set: { set_number: number }) => Math.max(max, set.set_number), 0) + 1

  const timestamp = nowISO()
  const set: WorkoutSet = {
    id: newId(),
    workoutId: params.workoutId,
    workoutExerciseId: params.workoutExerciseId,
    setNumber,
    weightKg: Math.max(0, params.weightKg || 0),
    reps: Math.max(0, params.reps || 0),
    rir: params.rir,
    isWarmup: params.isWarmup ?? false,
    completed: params.completed ?? false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await upsertSetToSupabase(set)
  return set
}

export async function updateSet(
  id: string,
  patch: Partial<Pick<WorkoutSet, 'weightKg' | 'reps' | 'rir' | 'isWarmup' | 'completed'>>,
): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')

  // Fetch existing set to merge
  const { data: existing, error: fetchError } = await (await import('./supabase')).getSupabaseClient()
    .from('sets')
    .select('*')
    .eq('id', id)
    .single()
  if (fetchError || !existing) throw new Error('La serie no existe')

  // Verify ownership via workout
  const { data: workout, error: wError } = await (await import('./supabase')).getSupabaseClient()
    .from('workouts')
    .select('id')
    .eq('id', existing.workout_id as string)
    .eq('user_id', userId)
    .single()
  if (wError || !workout) throw new Error('No autorizado')

  const updated: WorkoutSet = {
    id,
    workoutId: existing.workout_id as string,
    workoutExerciseId: existing.workout_exercise_id as string,
    setNumber: existing.set_number as number,
    weightKg: patch.weightKg ?? (existing.weight_kg as number),
    reps: patch.reps ?? (existing.reps as number),
    rir: patch.rir ?? (existing.rir as number | undefined),
    isWarmup: patch.isWarmup ?? (existing.is_warmup as boolean),
    completed: patch.completed ?? (existing.completed as boolean),
    createdAt: existing.created_at as string,
    updatedAt: nowISO(),
  }

  await upsertSetToSupabase(updated)
}

export async function deleteSet(id: string): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')

  const client = (await import('./supabase')).getSupabaseClient()

  // Verify ownership via workout
  const { data: existing, error: fetchError } = await client
    .from('sets')
    .select('workout_id, workout_exercise_id')
    .eq('id', id)
    .single()
  if (fetchError || !existing) throw new Error('La serie no existe')

  const { data: workout, error: wError } = await client
    .from('workouts')
    .select('id')
    .eq('id', existing.workout_id as string)
    .eq('user_id', userId)
    .single()
  if (wError || !workout) throw new Error('No autorizado')

  const workoutExerciseId = existing.workout_exercise_id as string

  // Delete the set
  await deleteSetFromSupabase(id)

  // Renumber remaining sets for this exercise to be consecutive starting from 1
  const { data: remainingSets, error: fetchRemainingError } = await client
    .from('sets')
    .select('id, set_number')
    .eq('workout_exercise_id', workoutExerciseId)
    .order('set_number', { ascending: true })

  if (fetchRemainingError) {
    console.error('[Repo] Error fetching remaining sets for renumbering:', fetchRemainingError)
    return
  }

  if (remainingSets && remainingSets.length > 0) {
    // Update each set's set_number to be consecutive
    for (let i = 0; i < remainingSets.length; i++) {
      const newSetNumber = i + 1
      if (remainingSets[i].set_number !== newSetNumber) {
        await client
          .from('sets')
          .update({ set_number: newSetNumber, updated_at: nowISO() })
          .eq('id', remainingSets[i].id)
      }
    }
  }
}

// ——— Peso corporal ———
export async function upsertBodyWeight(values: BodyWeightFormValues): Promise<BodyWeight> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')

  const timestamp = nowISO()
  const record: BodyWeight = {
    id: newId(),
    date: values.date,
    weightKg: values.weightKg,
    note: values.note,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  // Check if exists for this date
  const { data: existing } = await (await import('./supabase')).getSupabaseClient()
    .from('body_weights')
    .select('id')
    .eq('user_id', userId)
    .eq('date', values.date)
    .single()

  if (existing) {
    record.id = existing.id as string
  }

  await upsertBodyWeightToSupabase(record, userId)
  return record
}

export async function deleteBodyWeight(id: string): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')
  await deleteBodyWeightFromSupabase(id, userId)
}

// ——— Ajustes ———
export async function saveSettings(values: SettingsFormValues): Promise<Settings> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')

  // Fetch current settings from Supabase to preserve theme and createdAt
  const currentSettings = await (async () => {
    try {
      const { fetchSettingsFromSupabase } = await import('./supabase-data')
      return await fetchSettingsFromSupabase(userId)
    } catch {
      return null
    }
  })()

  const now = nowISO()
  const settings: Settings = {
    id: 'app',
    profile: {
      name: values.name,
      initialWeightKg: values.initialWeightKg,
      heightCm: values.heightCm,
      goal: values.goal as Settings['profile']['goal'],
    },
    targets: {
      calories: values.calories,
      protein: values.protein,
      fat: values.fat,
      carbs: values.carbs,
      carbMin: values.carbMin,
      carbMax: values.carbMax,
    },
    theme: currentSettings?.theme ?? 'dark',
    createdAt: currentSettings?.createdAt ?? now,
    updatedAt: now,
  }

  await upsertSettingsToSupabase(settings, userId)
  return settings
}

export async function setTheme(theme: ThemeMode): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) return

  const { upsertUserPreferences } = await import('./supabase')
  await upsertUserPreferences(userId, theme)
}