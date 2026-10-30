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
import { findDuplicateExercise, DUPLICATE_EXERCISE_MESSAGE } from './exerciseNames'
import {
  upsertFoodToSupabase,
  deleteFoodFromSupabase,
  upsertEntryToSupabase,
  deleteEntryFromSupabase,
  upsertExerciseToSupabase,
  deleteExerciseFromSupabase,
  upsertCardioSessionToSupabase,
  deleteCardioSessionFromSupabase,
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
    sugars: values.sugarsPer100,
    saturatedFat: values.saturatedFatPer100,
    salt: values.saltPer100,
  }
}

export async function saveFood(values: FoodFormValues, existingId?: string): Promise<Food> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')

  const timestamp = nowISO()
  const client = (await import('./supabase')).getSupabaseClient()

  // Deduplicación por código de barras: si el usuario ya tiene un alimento
  // con este barcode, reutilizarlo en lugar de crear un duplicado.
  if (!existingId && values.barcode && values.barcode.trim() !== '') {
    const { data: existing } = await (client as any)
      .from('foods')
      .select('id')
      .eq('user_id', userId)
      .eq('barcode', values.barcode.trim())
      .maybeSingle()

    if (existing?.id) {
      // Reutilizar el alimento existente: actualizar sus valores
      existingId = existing.id as string
    }
  }

  let food: Food
  if (existingId) {
    // Fetch existing to preserve createdAt
    const { data: existing } = await client
      .from('foods')
      .select('created_at')
      .eq('id', existingId)
      .eq('user_id', userId)
      .single()
    food = {
      id: existingId,
      name: values.name,
      brand: values.brand,
      category: values.category,
      barcode: values.barcode,
      nutriScore: (values.nutriScore === '' ? undefined : values.nutriScore) as 'A' | 'B' | 'C' | 'D' | 'E' | undefined,
      novaGroup: (values.novaGroup ?? undefined) as 1 | 2 | 3 | 4 | undefined,
      classificationSource: (values.classificationSource === '' ? undefined : values.classificationSource) as 'label' | 'openfoodfacts' | 'manual' | 'calculated' | undefined,
      classificationDate: values.classificationDate,
      per100: per100FromForm(values),
      notes: values.notes,
      createdAt: (existing?.created_at as string) ?? timestamp,
      updatedAt: timestamp,
    }
  } else {
    food = {
      id: newId(),
      name: values.name,
      brand: values.brand,
      category: values.category,
      barcode: values.barcode,
      nutriScore: (values.nutriScore === '' ? undefined : values.nutriScore) as 'A' | 'B' | 'C' | 'D' | 'E' | undefined,
      novaGroup: (values.novaGroup ?? undefined) as 1 | 2 | 3 | 4 | undefined,
      classificationSource: (values.classificationSource === '' ? undefined : values.classificationSource) as 'label' | 'openfoodfacts' | 'manual' | 'calculated' | undefined,
      classificationDate: values.classificationDate,
      per100: per100FromForm(values),
      notes: values.notes,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  }

  try {
    await upsertFoodToSupabase(food, userId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al guardar el alimento'
    console.error('[Repo] saveFood error:', msg, e)
    const code = (e as { code?: string })?.code
    if (code === '23505' || msg.includes('foods_user_barcode_unique') || msg.includes('duplicate key')) {
      throw new Error('Ya tienes un alimento registrado con este código de barras.')
    }
    throw e
  }
  return food
}

export async function deleteFood(id: string): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')
  await deleteFoodFromSupabase(id, userId)
}

// ——— Bloques de comidas ———
export async function createMealBlock(mealType: import('../types').MealType, date: string): Promise<import('../types').MealBlock> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')

  // Validación: solo se permite un bloque por tipo de comida al día
  // (excepto 'snack', que puede repetirse).
  if (mealType !== 'snack') {
    const client = (await import('./supabase')).getSupabaseClient()
    const { data: existingBlocks } = await (client as any)
      .from('meal_blocks')
      .select('id')
      .eq('user_id', userId)
      .eq('date', date)
      .eq('meal_type', mealType)
      .limit(1)
    if (existingBlocks && existingBlocks.length > 0) {
      throw new Error('Ya existe una comida de este tipo para el día seleccionado')
    }
    const { data: legacyEntries } = await (client as any)
      .from('entries')
      .select('id')
      .eq('user_id', userId)
      .eq('date', date)
      .eq('meal', mealType)
      .is('meal_block_id', null)
      .limit(1)
    if (legacyEntries && legacyEntries.length > 0) {
      throw new Error('Ya existe una comida de este tipo para el día seleccionado')
    }
  }

  const timestamp = nowISO()
  const block: import('../types').MealBlock = {
    id: newId(),
    userId,
    date,
    mealType,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const { upsertMealBlockToSupabase } = await import('./supabase-data')
  await upsertMealBlockToSupabase(block, userId)
  return block
}

export async function deleteMealBlock(id: string): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')
  const { deleteMealBlockFromSupabase } = await import('./supabase-data')
  await deleteMealBlockFromSupabase(id, userId)
}

export async function addFoodEntry(params: {
  food: Food
  grams: number
  date: string
  meal: MealType
  mealBlockId?: string
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
    mealBlockId: params.mealBlockId,
    foodId: params.food.id,
    foodName: params.food.name,
    brand: params.food.brand,
    grams: params.grams,
    per100: { ...params.food.per100 },
    nutriScore: params.food.nutriScore,
    novaGroup: params.food.novaGroup,
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
  const ex = existing as any

  const grams = updates.grams ?? (ex.grams as number)
  if (!Number.isFinite(grams) || grams <= 0) throw new Error('Los gramos deben ser mayores que 0')

  const per100: NutritionPer100 = {
    calories: (ex.calories_declared as number) / ((ex.grams as number) / 100),
    protein: (ex.protein as number) / ((ex.grams as number) / 100),
    carbs: (ex.carbs as number) / ((ex.grams as number) / 100),
    fat: (ex.fat as number) / ((ex.grams as number) / 100),
    fiber: (ex.fiber as number) / ((ex.grams as number) / 100),
    sugars: ex.sugars_per_100 != null ? (ex.sugars_per_100 as number) / ((ex.grams as number) / 100) : undefined,
    saturatedFat: ex.saturated_fat_per_100 != null ? (ex.saturated_fat_per_100 as number) / ((ex.grams as number) / 100) : undefined,
    salt: ex.salt_per_100 != null ? (ex.salt_per_100 as number) / ((ex.grams as number) / 100) : undefined,
  }
  const nutrition = nutritionForGrams(per100, grams)
  const updated: FoodEntry = {
    id,
    date: ex.date as string,
    meal: (updates.meal ?? ex.meal) as MealType,
    foodId: ex.food_id as string | undefined,
    foodName: ex.food_name as string,
    brand: ex.brand as string | undefined,
    nutriScore: ex.nutri_score as 'A' | 'B' | 'C' | 'D' | 'E' | undefined,
    novaGroup: ex.nova_group as 1 | 2 | 3 | 4 | undefined,
    grams,
    per100,
    caloriesDeclared: nutrition.caloriesDeclared,
    caloriesEstimated: nutrition.caloriesEstimated,
    protein: nutrition.protein,
    carbs: nutrition.carbs,
    fat: nutrition.fat,
    fiber: nutrition.fiber,
    createdAt: ex.created_at as string,
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
export async function saveExercise(values: ExerciseFormValues, existingId?: string, imageUrl?: string | null, forceId?: string): Promise<Exercise> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')

  // Comprobar duplicados en TODO el catálogo compartido (todos los usuarios),
  // ignorando mayúsculas/minúsculas y espacios sobrantes.
  // Al editar, se excluye el propio ejercicio (existingId).
  const dupClient = (await import('./supabase')).getSupabaseClient()
  const { data: catalogNames, error: dupCheckError } = await dupClient
    .from('exercises')
    .select('id, name')
  if (dupCheckError) {
    // Si falla la consulta, continuamos: la restricción UNIQUE de la base de datos
    // (migración 013) actúa como protección final.
    console.error('[Repo] Error checking duplicate exercises:', dupCheckError)
  } else {
    const duplicate = findDuplicateExercise(catalogNames || [], values.name, existingId)
    if (duplicate) {
      console.warn('[Repo] Duplicate exercise blocked:', values.name, 'matches', duplicate.name)
      throw new Error(DUPLICATE_EXERCISE_MESSAGE)
    }
  }

  const timestamp = nowISO()
  let exercise: Exercise
  let existingUserId: string | undefined
  if (existingId) {
    // Fetch existing to preserve imageUrl if not changed
    const { data: existing } = await (await import('./supabase')).getSupabaseClient()
      .from('exercises')
      .select('image_url, created_at, user_id')
      .eq('id', existingId)
      .single()
    existingUserId = existing?.user_id as string | undefined
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
      id: forceId ?? newId(),
      name: values.name,
      muscleGroup: values.muscleGroup as MuscleGroup,
      equipment: values.equipment,
      notes: values.notes,
      imageUrl: imageUrl ?? undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  }

  // Preserve original creator's user_id when editing (admin may edit others' exercises)
  const ownerId = existingId ? existingUserId ?? userId : userId
  try {
    await upsertExerciseToSupabase(exercise, ownerId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al guardar el ejercicio'
    console.error('[Repo] saveExercise error:', msg, e)
    // Violación de restricción UNIQUE (migración 013): dos usuarios intentaron
    // crear el mismo ejercicio simultáneamente.
    const code = (e as { code?: string })?.code
    if (code === '23505' || msg.includes('exercises_name_normalized_unique') || msg.includes('duplicate key')) {
      throw new Error(DUPLICATE_EXERCISE_MESSAGE)
    }
    if (msg.includes('new row violates row-level security') || msg.includes('RLS') || msg.includes('permission')) {
      throw new Error('No tienes permiso para modificar este ejercicio. Solo el administrador puede hacerlo.')
    }
    throw e
  }
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

// ——— Sesiones de cardio / deportes ———
export async function saveCardioSession(values: import('./cardioValidators').CardioSessionFormValues, existingId?: string): Promise<import('./cardio').CardioSession> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')

  const { formToSession } = await import('./cardioValidators')
  const base = formToSession(values, existingId)
  const timestamp = nowISO()
  const session: import('./cardio').CardioSession = {
    id: existingId ?? newId(),
    userId,
    activityType: base.activityType,
    customName: base.customName,
    date: base.date,
    startTime: base.startTime,
    durationMin: base.durationMin,
    intensity: base.intensity,
    rpe: base.rpe,
    distanceKm: base.distanceKm,
    avgSpeedKmh: base.avgSpeedKmh,
    maxSpeedKmh: base.maxSpeedKmh,
    avgInclinePct: base.avgInclinePct,
    maxInclinePct: base.maxInclinePct,
    runMin: base.runMin,
    walkMin: base.walkMin,
    warmupMin: base.warmupMin,
    cooldownMin: base.cooldownMin,
    resistance: base.resistance,
    cadenceRpm: base.cadenceRpm,
    elevationGainM: base.elevationGainM,
    surface: base.surface,
    modality: base.modality,
    sets: base.sets,
    result: base.result,
    calories: base.calories,
    caloriesSource: base.caloriesSource,
    hrAvg: base.hrAvg,
    hrMax: base.hrMax,
    notes: base.notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  if (existingId) {
    const client = (await import('./supabase')).getSupabaseClient()
    const { data: existing } = await (client as any).from('cardio_sessions').select('created_at').eq('id', existingId).single()
    if (existing?.created_at) session.createdAt = existing.created_at as string
  }

  await upsertCardioSessionToSupabase(session, userId)
  return session
}

export async function deleteCardioSession(id: string): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')
  await deleteCardioSessionFromSupabase(id, userId)
}

// ——— Sesiones de entrenamiento ———
export async function createWorkout(
  values: WorkoutFormValues,
  options: { startNow: boolean } = { startNow: true },
): Promise<Workout> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay sesión activa')

  // Evitar sesiones duplicadas: si ya hay una sesión en curso, reutilizarla.
  if (options.startNow) {
    const client = (await import('./supabase')).getSupabaseClient()
    const { data: active } = await client
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(1)
    if (active && active.length > 0) {
      const row = active[0]
      return {
        id: row.id as string,
        date: row.date as string,
        name: row.name as string,
        status: 'in_progress' as WorkoutStatus,
        notes: row.notes as string | undefined,
        startedAt: row.started_at as string | undefined,
        finishedAt: row.finished_at as string | undefined,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      }
    }
  }

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