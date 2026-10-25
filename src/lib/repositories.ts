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
import { db } from './db'
import { nutritionForGrams } from './calculations'
import { newId, nowISO } from './id'

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
  const timestamp = nowISO()
  if (existingId) {
    const existing = await db.foods.get(existingId)
    if (!existing) throw new Error('El alimento ya no existe')
    const updated: Food = {
      ...existing,
      name: values.name,
      brand: values.brand,
      category: values.category,
      per100: per100FromForm(values),
      notes: values.notes,
      updatedAt: timestamp,
    }
    await db.foods.put(updated)
    return updated
  }
  const food: Food = {
    id: newId(),
    name: values.name,
    brand: values.brand,
    category: values.category,
    per100: per100FromForm(values),
    notes: values.notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  await db.foods.add(food)
  return food
}

export async function deleteFood(id: string): Promise<void> {
  // Las entradas guardan una copia de los valores, por lo que el historial se conserva.
  await db.foods.delete(id)
}

// ——— Registro de comidas ———

export async function addFoodEntry(params: {
  food: Food
  grams: number
  date: string
  meal: MealType
}): Promise<FoodEntry> {
  if (!Number.isFinite(params.grams) || params.grams <= 0) throw new Error('Los gramos deben ser mayores que 0')
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
  await db.entries.add(entry)
  return entry
}

export async function updateFoodEntry(
  id: string,
  updates: { grams?: number; meal?: MealType },
): Promise<FoodEntry> {
  const existing = await db.entries.get(id)
  if (!existing) throw new Error('La entrada ya no existe')
  const grams = updates.grams ?? existing.grams
  if (!Number.isFinite(grams) || grams <= 0) throw new Error('Los gramos deben ser mayores que 0')
  const nutrition = nutritionForGrams(existing.per100, grams)
  const updated: FoodEntry = {
    ...existing,
    grams,
    meal: updates.meal ?? existing.meal,
    ...nutrition,
    updatedAt: nowISO(),
  }
  await db.entries.put(updated)
  return updated
}

export async function deleteFoodEntry(id: string): Promise<void> {
  await db.entries.delete(id)
}

// ——— Ejercicios ———

export async function saveExercise(values: ExerciseFormValues, existingId?: string): Promise<Exercise> {
  const timestamp = nowISO()
  if (existingId) {
    const existing = await db.exercises.get(existingId)
    if (!existing) throw new Error('El ejercicio ya no existe')
    const updated: Exercise = {
      ...existing,
      name: values.name,
      muscleGroup: values.muscleGroup as MuscleGroup,
      equipment: values.equipment,
      notes: values.notes,
      updatedAt: timestamp,
    }
    await db.exercises.put(updated)
    return updated
  }
  const exercise: Exercise = {
    id: newId(),
    name: values.name,
    muscleGroup: values.muscleGroup as MuscleGroup,
    equipment: values.equipment,
    notes: values.notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  await db.exercises.add(exercise)
  return exercise
}

export async function deleteExercise(id: string): Promise<void> {
  // Las sesiones guardan el nombre del ejercicio como copia.
  await db.exercises.delete(id)
}

// ——— Sesiones de entrenamiento ———

export async function createWorkout(
  values: WorkoutFormValues,
  options: { startNow: boolean } = { startNow: true },
): Promise<Workout> {
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
  await db.workouts.add(workout)
  return workout
}

export async function updateWorkoutDetails(
  id: string,
  values: Pick<WorkoutFormValues, 'name' | 'date' | 'notes'>,
): Promise<void> {
  await db.workouts.update(id, {
    name: values.name,
    date: values.date,
    notes: values.notes,
    updatedAt: nowISO(),
  })
}

export async function setWorkoutStatus(id: string, status: WorkoutStatus): Promise<void> {
  const workout = await db.workouts.get(id)
  if (!workout) throw new Error('La sesión no existe')
  const timestamp = nowISO()
  const patch: Partial<Workout> = { status, updatedAt: timestamp }
  if (status === 'in_progress') {
    patch.startedAt = workout.startedAt ?? timestamp
    patch.finishedAt = undefined
  } else if (status === 'completed') {
    patch.startedAt = workout.startedAt ?? timestamp
    patch.finishedAt = timestamp
  } else if (status === 'planned') {
    patch.startedAt = undefined
    patch.finishedAt = undefined
  }
  await db.workouts.update(id, patch)
}

export async function deleteWorkout(id: string): Promise<void> {
  await db.transaction('rw', db.workouts, db.workoutExercises, db.sets, async () => {
    await db.sets.where('workoutId').equals(id).delete()
    await db.workoutExercises.where('workoutId').equals(id).delete()
    await db.workouts.delete(id)
  })
}

export async function addExerciseToWorkout(
  workoutId: string,
  exercise: { id?: string; name: string; muscleGroup: MuscleGroup },
): Promise<WorkoutExercise> {
  const existing = await db.workoutExercises.where('workoutId').equals(workoutId).toArray()
  const order = existing.reduce((max, item) => Math.max(max, item.order), 0) + 1
  const workoutExercise: WorkoutExercise = {
    id: newId(),
    workoutId,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    muscleGroup: exercise.muscleGroup,
    order,
    createdAt: nowISO(),
  }
  await db.workoutExercises.add(workoutExercise)
  await db.workouts.update(workoutId, { updatedAt: nowISO() })
  return workoutExercise
}

export async function removeWorkoutExercise(id: string): Promise<void> {
  await db.transaction('rw', db.workoutExercises, db.sets, async () => {
    await db.sets.where('workoutExerciseId').equals(id).delete()
    await db.workoutExercises.delete(id)
  })
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
  const existing = await db.sets.where('workoutExerciseId').equals(params.workoutExerciseId).toArray()
  const setNumber = existing.reduce((max, set) => Math.max(max, set.setNumber), 0) + 1
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
  await db.sets.add(set)
  return set
}

export async function updateSet(
  id: string,
  patch: Partial<Pick<WorkoutSet, 'weightKg' | 'reps' | 'rir' | 'isWarmup' | 'completed'>>,
): Promise<void> {
  await db.sets.update(id, { ...patch, updatedAt: nowISO() })
}

export async function deleteSet(id: string): Promise<void> {
  await db.sets.delete(id)
}

// ——— Peso corporal ———

export async function upsertBodyWeight(values: BodyWeightFormValues): Promise<BodyWeight> {
  const timestamp = nowISO()
  const existing = await db.bodyWeights.where('date').equals(values.date).first()
  if (existing) {
    const updated: BodyWeight = {
      ...existing,
      weightKg: values.weightKg,
      note: values.note,
      updatedAt: timestamp,
    }
    await db.bodyWeights.put(updated)
    return updated
  }
  const record: BodyWeight = {
    id: newId(),
    date: values.date,
    weightKg: values.weightKg,
    note: values.note,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  await db.bodyWeights.add(record)
  return record
}

export async function deleteBodyWeight(id: string): Promise<void> {
  await db.bodyWeights.delete(id)
}

// ——— Ajustes ———

export async function saveSettings(values: SettingsFormValues): Promise<void> {
  const existing = await db.settings.get('app')
  const current: Settings = existing ?? {
    id: 'app',
    profile: { initialWeightKg: 63, heightCm: 163, goal: 'perder_grasa_ganar_musculo' },
    targets: { calories: 1400, protein: 125, fat: 40, carbs: 90, carbMin: 85, carbMax: 95 },
    theme: 'dark',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  }
  const updated: Settings = {
    ...current,
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
    updatedAt: nowISO(),
  }
  await db.settings.put(updated)
}

export async function setTheme(theme: ThemeMode): Promise<void> {
  const existing = await db.settings.get('app')
  if (!existing) return
  await db.settings.update('app', { theme, updatedAt: nowISO() })
}
