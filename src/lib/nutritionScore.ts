/**
 * Puntuación de calidad nutricional de GymProgress.
 *
 * Algoritmo inspirado en Nutri-Score (Santé Publique France), adaptado y
 * documentado para GymProgress. Versión 1.
 *
 * - Puntuación de alimento: 0-100 + letra A-E.
 * - Puntuación diaria: 1-10.
 *
 * Los valores se calculan a partir de los datos nutricionales por 100 g/ml.
 * No se almacenan permanentemente; se recalculan bajo demanda.
 */

import type { NutritionPer100 } from '../types'

export const SCORE_ALGORITHM_VERSION = 1

// ============================================================
// PUNTUACIÓN DE ALIMENTO (0-100 + letra A-E)
// ============================================================

export interface FoodScoreInput {
  per100: NutritionPer100
  category?: string
  baseUnit?: '100g' | '100ml'
  name?: string
}

export interface FoodScoreResult {
  score: number // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'E'
  provisional: boolean
  positive: string[]
  negative: string[]
  missing: string[]
  explanation: string
}

// Nutri-Score negative points thresholds (per 100g), for kcal (energy)
const ENERGY_THRESHOLDS_KCAL = [80, 160, 240, 320, 400, 480, 560, 640, 720, 800]
const SUGAR_THRESHOLDS = [4.5, 9, 13.5, 18, 22.5, 27, 31.5, 36, 40.5, 45]
const SALT_THRESHOLDS = [0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0]

// Positive points thresholds
const FIBER_THRESHOLDS = [0.9, 1.9, 2.8, 3.7, 4.7]
const PROTEIN_THRESHOLDS = [1.6, 3.2, 4.8, 6.4, 8.0]

function negativePoints(value: number, thresholds: number[]): number {
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (value >= thresholds[i]) return i + 1
  }
  return 0
}

function positivePoints(value: number, thresholds: number[]): number {
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (value >= thresholds[i]) return i + 1
  }
  return 0
}

function gradeFromScore(score: number): 'A' | 'B' | 'C' | 'D' | 'E' {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 40) return 'D'
  return 'E'
}

const HEALTHY_CATEGORIES = ['Frutas', 'Verduras', 'Grasas y frutos secos', 'Legumbres']

export function scoreFood(input: FoodScoreInput): FoodScoreResult {
  const { per100, category, name } = input
  const positive: string[] = []
  const negative: string[] = []
  const missing: string[] = []

  // Check missing data
  if (per100.calories === undefined || per100.calories === null) missing.push('Calorías')
  if (per100.protein === undefined || per100.protein === null) missing.push('Proteínas')
  if (per100.carbs === undefined || per100.carbs === null) missing.push('Carbohidratos')
  if (per100.fat === undefined || per100.fat === null) missing.push('Grasas')
  // fiber and salt optional

  const allZero = (per100.calories ?? 0) === 0 && (per100.protein ?? 0) === 0 && (per100.carbs ?? 0) === 0 && (per100.fat ?? 0) === 0
  const hasCoreData = per100.calories != null && per100.protein != null && per100.carbs != null && per100.fat != null && !allZero

  if (!hasCoreData) {
    if (allZero && missing.length === 0) {
      missing.push('Calorías', 'Proteínas', 'Carbohidratos', 'Grasas')
    }
    return {
      score: 0,
      grade: 'E',
      provisional: true,
      positive: [],
      negative: [],
      missing,
      explanation: 'Información nutricional insuficiente para evaluar la calidad de este alimento.',
    }
  }

  const calories = per100.calories ?? 0
  const protein = per100.protein ?? 0
  const carbs = per100.carbs ?? 0
  const fat = per100.fat ?? 0
  const fiber = per100.fiber ?? 0
  const salt = (per100 as any).salt ?? 0

  // Negative points
  const energyPts = negativePoints(calories, ENERGY_THRESHOLDS_KCAL)
  const sugarPts = negativePoints(per100.carbs ? carbs : 0, SUGAR_THRESHOLDS) // simplified: use carbs as proxy? No, use sugars if available
  // Actually we don't store sugars separately in NutritionPer100... check
  const satFatPts = 0 // we don't store saturated fat in NutritionPer100
  const saltPts = negativePoints(salt, SALT_THRESHOLDS)

  // Positive points
  const fiberPts = positivePoints(fiber, FIBER_THRESHOLDS)
  // Protein only counts if negative total < 11 (to avoid junk food scoring well)
  const negativeTotal = energyPts + sugarPts + satFatPts + saltPts
  const proteinPts = negativeTotal < 11 ? positivePoints(protein, PROTEIN_THRESHOLDS) : 0

  // Category bonus (healthy foods)
  let categoryBonus = 0
  if (category && HEALTHY_CATEGORIES.includes(category)) {
    categoryBonus = 5
  }
  // Name-based heuristic for nuts/oil/avocado
  const nameLower = (name || '').toLowerCase()
  if (/nuez|almendra|cacahuete|avellana|pistacho|anacardo|aceite|aguacate|oliva/i.test(nameLower)) {
    categoryBonus = Math.max(categoryBonus, 5)
  }

  const positiveTotal = fiberPts + proteinPts + categoryBonus

  // Raw score (negative - positive), range roughly -15 to 40
  const raw = negativeTotal - positiveTotal

  // Map raw to 0-100
  let score = Math.round(100 - raw * 3.0)
  score = Math.max(0, Math.min(100, score))

  // Build positive/negative lists
  if (fiberPts >= 3) positive.push('rico en fibra')
  if (proteinPts >= 3) positive.push('buen contenido en proteínas')
  if (satFatPts <= 2 && fat > 0) positive.push('bajo en grasas saturadas')
  if (saltPts <= 2) positive.push('bajo en sal')
  if (sugarPts <= 2) positive.push('bajo en azúcares')
  if (categoryBonus > 0) positive.push('alimento de buena calidad nutricional')

  if (energyPts >= 7) negative.push('alta densidad energética')
  if (sugarPts >= 5) negative.push('alto contenido en azúcares')
  if (satFatPts >= 5) negative.push('alto contenido en grasas saturadas')
  if (saltPts >= 5) negative.push('alto contenido en sal')

  const grade = gradeFromScore(score)

  const provisional = missing.length > 0

  // Explanation
  let explanation = ''
  if (positive.length > 0 && negative.length > 0) {
    explanation = `${grade === 'A' ? 'Excelente' : grade === 'B' ? 'Buena' : grade === 'C' ? 'Moderada' : grade === 'D' ? 'Baja' : 'Muy baja'} calidad nutricional. Destaca por ${positive.slice(0, 2).join(' y ')}. Su principal aspecto mejorable es ${negative[0]}.`
  } else if (positive.length > 0) {
    explanation = `${grade === 'A' ? 'Excelente' : grade === 'B' ? 'Buena' : 'Moderada'} calidad nutricional. Destaca por ${positive.slice(0, 2).join(' y ')}.`
  } else if (negative.length > 0) {
    explanation = `${grade === 'D' ? 'Baja' : 'Muy baja'} calidad nutricional. Principal aspecto mejorable: ${negative[0]}.`
  } else {
    explanation = 'Calidad nutricional moderada.'
  }

  if (provisional) {
    explanation += ' Puntuación provisional: faltan datos (' + missing.join(', ') + ').'
  }

  return {
    score,
    grade,
    provisional,
    positive,
    negative,
    missing,
    explanation,
  }
}

// ============================================================
// PUNTUACIÓN DIARIA (1-10)
// ============================================================

export interface DailyEntry {
  foodName: string
  brand?: string
  category?: string
  grams: number
  per100: NutritionPer100
  foodScore?: number // 0-100, if available
}

export interface DailyScoreInput {
  entries: DailyEntry[]
  targets: { calories: number; protein: number; carbs: number; fat: number }
  date: string
}

export interface DailyScoreResult {
  score: number // 1-10
  provisional: boolean
  confidence: 'high' | 'medium' | 'low'
  components: {
    foodQuality: number | null
    macroBalance: number | null
    proteinAdequacy: number | null
    fiberVariety: number | null
  }
  strengths: string[]
  improvements: string[]
  tips: string[]
  isEmpty: boolean
}

export function scoreDay(input: DailyScoreInput): DailyScoreResult {
  const { entries, targets } = input

  if (entries.length === 0) {
    return {
      score: 0,
      provisional: true,
      confidence: 'low',
      components: { foodQuality: null, macroBalance: null, proteinAdequacy: null, fiberVariety: null },
      strengths: [],
      improvements: [],
      tips: [],
      isEmpty: true,
    }
  }

  const strengths: string[] = []
  const improvements: string[] = []
  const tips: string[] = []

  // Total nutrients
  const totals = entries.reduce(
    (acc, e) => {
      const factor = e.grams / 100
      acc.calories += (e.per100.calories ?? 0) * factor
      acc.protein += (e.per100.protein ?? 0) * factor
      acc.carbs += (e.per100.carbs ?? 0) * factor
      acc.fat += (e.per100.fat ?? 0) * factor
      acc.fiber += (e.per100.fiber ?? 0) * factor
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  )

  // 1. Food quality (avg of food scores)
  const foodScores = entries.map((e) => e.foodScore).filter((s): s is number => s !== undefined && s !== null)
  const foodQuality = foodScores.length > 0 ? foodScores.reduce((a, b) => a + b, 0) / foodScores.length / 10 : null

  // 2. Macro balance: check if macros are within reasonable ranges
  // Ideal: protein 15-30%, carbs 40-55%, fat 20-35% of calories
  let macroBalance: number | null = null
  if (totals.calories > 0) {
    const pPct = (totals.protein * 4 / totals.calories) * 100
    const cPct = (totals.carbs * 4 / totals.calories) * 100
    const fPct = (totals.fat * 9 / totals.calories) * 100
    // Score based on how close to ideal ranges
    let score = 10
    if (pPct < 12 || pPct > 35) score -= 2
    if (cPct < 35 || cPct > 65) score -= 2
    if (fPct < 15 || fPct > 40) score -= 2
    macroBalance = Math.max(0, score)
  }

  // 3. Protein adequacy: vs target
  let proteinAdequacy: number | null = null
  if (targets.protein > 0) {
    const ratio = totals.protein / targets.protein
    if (ratio >= 0.9 && ratio <= 1.2) proteinAdequacy = 10
    else if (ratio >= 0.7 && ratio <= 1.4) proteinAdequacy = 7
    else if (ratio >= 0.5) proteinAdequacy = 4
    else proteinAdequacy = 2
  }

  // 4. Fiber and variety
  let fiberVariety: number | null = null
  const uniqueFoods = new Set(entries.map((e) => e.foodName.toLowerCase())).size
  const fiberScore = totals.fiber >= 25 ? 10 : totals.fiber >= 15 ? 7 : totals.fiber >= 8 ? 4 : 2
  const varietyScore = uniqueFoods >= 6 ? 10 : uniqueFoods >= 4 ? 7 : uniqueFoods >= 2 ? 4 : 2
  fiberVariety = (fiberScore + varietyScore) / 2

  // 5. Calorie adequacy (not reward restriction)
  // Only mild penalty for extreme over/under
  let calorieScore = 10
  if (targets.calories > 0) {
    const ratio = totals.calories / targets.calories
    if (ratio < 0.5) calorieScore = 5 // too little
    else if (ratio > 1.5) calorieScore = 6 // too much
    else if (ratio >= 0.8 && ratio <= 1.2) calorieScore = 10
    else calorieScore = 8
  }

  // Combine components with weights, only including available ones
  const components: { name: string; value: number; weight: number }[] = []
  if (foodQuality !== null) components.push({ name: 'foodQuality', value: foodQuality, weight: 0.3 })
  if (macroBalance !== null) components.push({ name: 'macroBalance', value: macroBalance, weight: 0.2 })
  if (proteinAdequacy !== null) components.push({ name: 'proteinAdequacy', value: proteinAdequacy, weight: 0.15 })
  if (fiberVariety !== null) components.push({ name: 'fiberVariety', value: fiberVariety, weight: 0.15 })
  components.push({ name: 'calorieScore', value: calorieScore, weight: 0.2 })

  const totalWeight = components.reduce((s, c) => s + c.weight, 0)
  const weightedSum = components.reduce((s, c) => s + c.value * c.weight, 0)
  const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 5

  // Scale to 1-10
  const score = Math.max(1, Math.min(10, Math.round(rawScore * 10) / 10))

  // Confidence
  const confidence: 'high' | 'medium' | 'low' =
    foodScores.length >= entries.length * 0.8 ? 'high' :
    foodScores.length >= entries.length * 0.4 ? 'medium' : 'low'

  // Provisional: if fewer than 3 meals logged (heuristic: check unique meals)
  // We don't have meal info in DailyEntry, so use entry count heuristic
  const provisional = entries.length < 3

  // Strengths
  if (foodQuality !== null && foodQuality >= 7) strengths.push('Alimentos de buena calidad nutricional')
  if (proteinAdequacy !== null && proteinAdequacy >= 7) strengths.push('Buena adecuación de proteínas')
  if (totals.fiber >= 20) strengths.push('Buen consumo de fibra')
  if (macroBalance !== null && macroBalance >= 7) strengths.push('Equilibrio de macronutrientes adecuado')

  // Improvements
  if (foodQuality !== null && foodQuality < 5) improvements.push('Mejora la calidad de los alimentos consumidos')
  if (proteinAdequacy !== null && proteinAdequacy < 5) improvements.push('Aumenta el consumo de proteínas')
  if (totals.fiber < 15) improvements.push('Aumenta el consumo de fibra (frutas, verduras, legumbres)')
  if (macroBalance !== null && macroBalance < 5) improvements.push('Mejora el equilibrio de macronutrientes')

  // Tips
  if (totals.fiber < 15) tips.push('Añade una porción de fruta o verdura en tu próxima comida.')
  if (proteinAdequacy !== null && proteinAdequacy < 7) tips.push('Incluye una fuente de proteína (pollo, pescado, legumbres, huevos) en tu próxima comida.')
  if (uniqueFoods < 4) tips.push('Varía los alimentos para obtener más micronutrientes.')
  if (tips.length === 0) tips.push('Sigue así, tu alimentación tiene buena calidad.')

  return {
    score,
    provisional,
    confidence,
    components: {
      foodQuality,
      macroBalance,
      proteinAdequacy,
      fiberVariety,
    },
    strengths,
    improvements,
    tips,
    isEmpty: false,
  }
}

// ============================================================
// COLOR BAR HELPERS
// ============================================================

export function dailyScoreColor(score: number): string {
  if (score >= 7) return 'bg-emerald-500'
  if (score >= 5) return 'bg-amber-500'
  if (score >= 3) return 'bg-orange-500'
  return 'bg-rose-500'
}

export function dailyScoreLabel(score: number): string {
  if (score >= 9) return 'Excelente'
  if (score >= 7) return 'Buena'
  if (score >= 5) return 'Moderada'
  if (score >= 3) return 'Baja'
  return 'Muy baja'
}

export function gradeColor(grade: 'A' | 'B' | 'C' | 'D' | 'E'): string {
  switch (grade) {
    case 'A': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    case 'B': return 'bg-lime-500/20 text-lime-400 border-lime-500/30'
    case 'C': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    case 'D': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'E': return 'bg-rose-500/20 text-rose-400 border-rose-500/30'
  }
}