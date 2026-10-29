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
  'Ultraprocesados',
  'Otros',
] as const

export type FoodCategory = (typeof FOOD_CATEGORIES)[number]

export type ThemeMode = 'dark' | 'light'

export type WorkoutStatus = 'planned' | 'in_progress' | 'completed'

export interface NutritionPer100 {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
}

export interface Settings {
  id: 'app'
  profile: {
    name?: string
    initialWeightKg: number
    heightCm: number
    goal: GoalType
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
}

export interface Food {
  id: string
  name: string
  brand?: string
  category?: string
  barcode?: string
  per100: NutritionPer100
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface MealBlock {
  id: string
  userId: string
  date: string
  mealType: MealType
  title?: string
  finishedAt?: string
  qualityScore?: number
  qualityVersion?: number
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
  workoutId: string
  workoutExerciseId: string
  setNumber: number
  weightKg: number
  reps: number
  rir?: number
  isWarmup: boolean
  completed: boolean
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

export interface BackupFile {
  app: 'GymProgress'
  version: 1
  exportedAt: string
  data: {
    settings: Settings[]
    foods: Food[]
    entries: FoodEntry[]
    exercises: Exercise[]
    workouts: Workout[]
    workoutExercises: WorkoutExercise[]
    sets: WorkoutSet[]
    bodyWeights: BodyWeight[]
  }
}

export interface NutritionTotals {
  calories: number
  caloriesEstimated: number
  protein: number
  carbs: number
  fat: number
  fiber: number
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
