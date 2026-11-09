export const MEAL_TYPES = [
  { value: 'desayuno', label: 'Desayuno' },
  { value: 'almuerzo', label: 'Almuerzo' },
  { value: 'comida', label: 'Comida' },
  { value: 'merienda', label: 'Merienda' },
  { value: 'cena', label: 'Cena' },
  { value: 'snack', label: 'Snacks' },
] as const

export type MealType = (typeof MEAL_TYPES)[number]['value']

export const MEAL_LABELS: Record<MealType, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  comida: 'Comida',
  merienda: 'Merienda',
  cena: 'Cena',
  snack: 'Snacks',
}

export const MUSCLE_GROUPS = [
  { value: 'pecho', label: 'Pecho' },
  { value: 'espalda', label: 'Espalda' },
  { value: 'hombros', label: 'Hombros' },
  { value: 'biceps', label: 'Bíceps' },
  { value: 'triceps', label: 'Tríceps' },
  { value: 'cuadriceps', label: 'Cuádriceps' },
  { value: 'isquiotibiales', label: 'Isquiotibiales' },
  { value: 'gluteos', label: 'Glúteos' },
  { value: 'gemelos', label: 'Gemelos' },
  { value: 'core', label: 'Core' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'otro', label: 'Otro' },
] as const

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]['value']

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  pecho: 'Pecho',
  espalda: 'Espalda',
  hombros: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  cuadriceps: 'Cuádriceps',
  isquiotibiales: 'Isquiotibiales',
  gluteos: 'Glúteos',
  gemelos: 'Gemelos',
  core: 'Core',
  cardio: 'Cardio',
  otro: 'Otro',
}

export const GOALS = [
  { value: 'perder_grasa_ganar_musculo', label: 'Perder grasa y ganar músculo' },
  { value: 'perder_grasa', label: 'Perder grasa' },
  { value: 'ganar_musculo', label: 'Ganar músculo' },
  { value: 'mantener', label: 'Mantener el peso' },
  { value: 'rendimiento', label: 'Mejorar el rendimiento' },
] as const

export type GoalType = (typeof GOALS)[number]['value']

export const GOAL_LABELS: Record<GoalType, string> = {
  perder_grasa_ganar_musculo: 'Recomposición corporal',
  perder_grasa: 'Pérdida de grasa',
  ganar_musculo: 'Ganancia muscular',
  mantener: 'Mantenimiento',
  rendimiento: 'Rendimiento',
}

export const FOOD_CATEGORIES = [
  'Proteínas',
  'Lácteos',
  'Cereales y tubérculos',
  'Frutas',
  'Verduras',
  'Legumbres',
  'Grasas y frutos secos',
  'Bebidas',
  'Suplementos',
] as const

export type ThemeMode = 'dark' | 'light'

export type WorkoutStatus = 'planned' | 'in_progress' | 'completed'

export interface NutritionPer100 {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  sugars?: number
  saturatedFat?: number
  salt?: number
}

export interface NutritionTotals {
  calories: number
  caloriesEstimated: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

export interface Food {
  id: string
  name: string
  brand?: string
  category?: string
  barcode?: string
  nutriScore?: 'A' | 'B' | 'C' | 'D' | 'E'
  novaGroup?: 1 | 2 | 3 | 4
  classificationSource?: 'label' | 'openfoodfacts' | 'manual' | 'calculated'
  classificationDate?: string
  per100: NutritionPer100
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface FoodEntry {
  id: string
  date: string
  meal: MealType
  mealBlockId?: string
  foodId?: string
  foodName: string
  brand?: string
  nutriScore?: 'A' | 'B' | 'C' | 'D' | 'E'
  novaGroup?: 1 | 2 | 3 | 4
  grams: number
  per100: NutritionPer100
  caloriesDeclared: number
  caloriesEstimated: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  createdAt: string
  updatedAt: string
}

export interface Exercise {
  id: string
  name: string
  muscleGroup: MuscleGroup
  equipment?: string
  notes?: string
  imageUrl?: string
  imagePeakUrl?: string
  isGlobal?: boolean
  externalSource?: string
  externalId?: string
  description?: string
  instructions?: string[]
  tips?: string[]
  category?: string
  bodyPart?: string
  forceType?: string
  mechanic?: string
  difficulty?: string
  goals?: string[]
  tags?: string[]
  met?: number
  isUnilateral?: boolean
  isBodyweight?: boolean
  variationGroup?: string
  primaryMuscles?: string[]
  secondaryMuscles?: string[]
  createdAt: string
  updatedAt: string
}

export interface Workout {
  id: string
  date: string
  name: string
  status: WorkoutStatus
  notes?: string
  startedAt?: string
  finishedAt?: string
  accumulatedSeconds?: number
  segmentStartedAt?: string
  createdAt: string
  updatedAt: string
}

export interface WorkoutExercise {
  id: string
  workoutId: string
  exerciseId?: string
  exerciseName: string
  muscleGroup: MuscleGroup
  order: number
  notes?: string
  createdAt: string
}

export interface WorkoutSet {
  id: string
  workoutExerciseId: string
  workoutId: string
  setNumber: number
  weightKg: number
  reps: number
  rir?: number
  isWarmup?: boolean
  completed?: boolean
  createdAt: string
  updatedAt: string
}

export interface BodyWeight {
  id: string
  date: string
  weightKg: number
  note?: string
  createdAt: string
  updatedAt: string
}

export interface Settings {
  id: string
  profile: {
    name?: string
    initialWeightKg: number
    heightCm: number
    goal: GoalType
    sex?: 'male' | 'female'
    age?: number
    activityLevel?: string
  }
  targets: {
    calories: number
    protein: number
    fat: number
    carbs: number
    carbMin: number
    carbMax: number
  }
  theme: ThemeMode
  createdAt: string
  updatedAt: string
  onboardingCompleted?: boolean
}

export interface MealBlock {
  id: string
  userId?: string
  date: string
  mealType: MealType
  title?: string
  name?: string
  finishedAt?: string
  qualityScore?: number
  qualityVersion?: number
  createdAt: string
  updatedAt: string
}

export interface WorkoutStats {
  exerciseCount: number
  totalSets: number
  effectiveSets: number
  warmupSets: number
  pendingSets: number
  volume: number
  reps: number
  bestSet?: { weightKg: number; reps: number; e1rm: number }
}

export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  kind: ToastKind
  message: string
}

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated'

export interface Routine {
  id: string
  userId?: string
  name: string
  description?: string
  muscleGroup?: MuscleGroup
  createdAt: string
  updatedAt: string
}

export interface RoutineExercise {
  id: string
  routineId: string
  userId?: string
  exerciseId?: string
  exerciseName: string
  muscleGroup: MuscleGroup
  order: number
  setsCount?: number
  repsTarget?: number
  weightKg?: number
  restSeconds?: number
  notes?: string
  createdAt: string
}

export interface RoutineSet {
  id: string
  routineExerciseId: string
  routineId: string
  userId?: string
  setNumber: number
  weightKg?: number
  reps?: number
  rir?: number
  isWarmup?: boolean
  restSeconds?: number
  createdAt: string
}

export interface RoutineSchedule {
  id: string
  userId?: string
  routineId: string
  scheduleType: 'date' | 'weekly'
  specificDate?: string
  weekdays?: number[]
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
}