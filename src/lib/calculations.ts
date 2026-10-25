import type {
  Food,
  FoodEntry,
  MealType,
  NutritionPer100,
  NutritionTotals,
  Settings,
  WorkoutSet,
  WorkoutStats,
} from '../types'

export function roundTo(value: number, decimals = 1): number {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Energía teórica de los macros: 4 kcal/g proteína, 4 kcal/g carbohidrato, 9 kcal/g grasa. */
export function kcalFromMacros(protein: number, carbs: number, fat: number): number {
  return roundTo(protein * 4 + carbs * 4 + fat * 9, 1)
}

export function nutritionForGrams(per100: NutritionPer100, grams: number) {
  const safeGrams = Number.isFinite(grams) && grams > 0 ? grams : 0
  const factor = safeGrams / 100
  const protein = roundTo((per100.protein || 0) * factor, 1)
  const carbs = roundTo((per100.carbs || 0) * factor, 1)
  const fat = roundTo((per100.fat || 0) * factor, 1)
  return {
    caloriesDeclared: roundTo((per100.calories || 0) * factor, 1),
    caloriesEstimated: kcalFromMacros(protein, carbs, fat),
    protein,
    carbs,
    fat,
    fiber: roundTo((per100.fiber || 0) * factor, 1),
  }
}

export const EMPTY_TOTALS: NutritionTotals = {
  calories: 0,
  caloriesEstimated: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
}

export function sumEntries(entries: FoodEntry[]): NutritionTotals {
  const totals = entries.reduce<NutritionTotals>(
    (acc, entry) => {
      acc.calories += entry.caloriesDeclared || 0
      acc.caloriesEstimated += entry.caloriesEstimated || 0
      acc.protein += entry.protein || 0
      acc.carbs += entry.carbs || 0
      acc.fat += entry.fat || 0
      acc.fiber += entry.fiber || 0
      return acc
    },
    { ...EMPTY_TOTALS },
  )
  return {
    calories: roundTo(totals.calories, 1),
    caloriesEstimated: roundTo(totals.caloriesEstimated, 1),
    protein: roundTo(totals.protein, 1),
    carbs: roundTo(totals.carbs, 1),
    fat: roundTo(totals.fat, 1),
    fiber: roundTo(totals.fiber, 1),
  }
}

export interface ProgressValue {
  consumed: number
  target: number
  remaining: number
  percent: number
  visualPercent: number
  exceeded: boolean
  reached: boolean
}

export function progressValue(consumed: number, target: number): ProgressValue {
  const safeConsumed = Number.isFinite(consumed) ? Math.max(0, consumed) : 0
  const safeTarget = Number.isFinite(target) ? Math.max(0, target) : 0
  const percent = safeTarget > 0 ? (safeConsumed / safeTarget) * 100 : 0
  return {
    consumed: safeConsumed,
    target: safeTarget,
    remaining: roundTo(safeTarget - safeConsumed, 1),
    percent: roundTo(percent, 1),
    visualPercent: clamp(percent, 0, 100),
    exceeded: safeTarget > 0 && safeConsumed > safeTarget,
    reached: safeTarget > 0 && safeConsumed >= safeTarget,
  }
}

export function targetMacroEnergy(settings: Pick<Settings, 'targets'> | Settings['targets']): number {
  const targets = 'targets' in settings ? settings.targets : settings
  return kcalFromMacros(targets.protein, targets.carbs, targets.fat)
}

export function energyGap(calories: number, macroEnergy: number): number {
  return roundTo(calories - macroEnergy, 1)
}

/** 1RM estimado (fórmula de Epley). Solo orientativo. */
export function epley1RM(weightKg: number, reps: number): number {
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps) || weightKg <= 0 || reps < 1) return 0
  return roundTo(weightKg * (1 + reps / 30), 1)
}

export function setVolume(set: Pick<WorkoutSet, 'weightKg' | 'reps' | 'completed' | 'isWarmup'>): number {
  if (!set.completed || set.isWarmup) return 0
  if (!Number.isFinite(set.weightKg) || !Number.isFinite(set.reps)) return 0
  return roundTo(Math.max(0, set.weightKg) * Math.max(0, set.reps), 1)
}

export function workoutStats(sets: WorkoutSet[], exerciseCount = 0): WorkoutStats {
  const completed = sets.filter((set) => set.completed)
  const effective = completed.filter((set) => !set.isWarmup)
  const warmups = completed.filter((set) => set.isWarmup)
  let best: WorkoutStats['bestSet']
  for (const set of effective) {
    const e1rm = epley1RM(set.weightKg, set.reps)
    if (!best || e1rm > best.e1rm) {
      best = { weightKg: set.weightKg, reps: set.reps, e1rm }
    }
  }
  return {
    exerciseCount,
    totalSets: completed.length,
    effectiveSets: effective.length,
    warmupSets: warmups.length,
    pendingSets: sets.length - completed.length,
    volume: roundTo(effective.reduce((sum, set) => sum + setVolume(set), 0), 1),
    reps: effective.reduce((sum, set) => sum + (set.reps || 0), 0),
    bestSet: best,
  }
}

export function entriesForMeal(entries: FoodEntry[], meal: MealType): FoodEntry[] {
  return entries
    .filter((entry) => entry.meal === meal)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function foodToPer100(food: Food): NutritionPer100 {
  return { ...food.per100 }
}

export function macroDistribution(totals: NutritionTotals) {
  return [
    { name: 'Proteínas', value: roundTo(totals.protein * 4, 1), grams: totals.protein, color: '#38bdf8' },
    { name: 'Carbohidratos', value: roundTo(totals.carbs * 4, 1), grams: totals.carbs, color: '#c084fc' },
    { name: 'Grasas', value: roundTo(totals.fat * 9, 1), grams: totals.fat, color: '#fbbf24' },
  ]
}

export function bmi(weightKg: number, heightCm: number): number {
  if (!weightKg || !heightCm) return 0
  return roundTo(weightKg / (heightCm / 100) ** 2, 1)
}
