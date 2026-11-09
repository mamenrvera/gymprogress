/**
 * Puntuación de calidad nutricional de GymProgress.
 *
 * Algoritmo inspirado en Nutri-Score (Santé Publique France), adaptado y
 * documentado para GymProgress. Versión 1.
 *
 * Tres niveles independientes:
 * - Clasificación del producto: Nutri-Score oficial (A-E) y NOVA (1-4), de Open Food Facts.
 * - Puntuación de la ingesta (comida): 1-10, evalúa el conjunto de alimentos y cantidades.
 * - Puntuación diaria: 1-10, evalúa el conjunto del día.
 *
 * Los valores se calculan a partir de los datos nutricionales por 100 g/ml.
 * No se almacenan permanentemente; se recalculan bajo demanda.
 */

import type { NutritionPer100 } from '../types'

export const SCORE_ALGORITHM_VERSION = 1

export interface FoodScoreInput {
  per100: NutritionPer100
  category?: string
  baseUnit?: '100g' | '100ml'
  name?: string
  nutriScore?: 'A' | 'B' | 'C' | 'D' | 'E'
  novaGroup?: 1 | 2 | 3 | 4
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

const ENERGY_THRESHOLDS_KCAL = [80, 160, 240, 320, 400, 480, 560, 640, 720, 800]
const SUGAR_THRESHOLDS = [4.5, 9, 13.5, 18, 22.5, 27, 31.5, 36, 40.5, 45]
const SATFAT_THRESHOLDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const SALT_THRESHOLDS = [0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0]

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
  const { per100, category, name, nutriScore, novaGroup } = input
  const positive: string[] = []
  const negative: string[] = []
  const missing: string[] = []

  if (per100.calories === undefined || per100.calories === null) missing.push('Calorías')
  if (per100.protein === undefined || per100.protein === null) missing.push('Proteínas')
  if (per100.carbs === undefined || per100.carbs === null) missing.push('Carbohidratos')
  if (per100.fat === undefined || per100.fat === null) missing.push('Grasas')

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
  const fat = per100.fat ?? 0
  const fiber = per100.fiber ?? 0
  const sugars = per100.sugars ?? null
  const saturatedFat = per100.saturatedFat ?? null
  const salt = per100.salt ?? null

  if (sugars === null) missing.push('Azúcares')
  if (saturatedFat === null) missing.push('Grasas saturadas')
  if (salt === null) missing.push('Sal')

  const energyPts = negativePoints(calories, ENERGY_THRESHOLDS_KCAL)
  // Azúcares: si no hay dato, no inventar; tratar como 0 (sin penalización) y marcar provisional
  const sugarValue = sugars !== null ? sugars : 0
  const sugarPts = sugars !== null ? negativePoints(sugarValue, SUGAR_THRESHOLDS) : 0
  // Missing satfat/salt: conservative penalty of 3 instead of 0
  const satFatPts = saturatedFat !== null ? negativePoints(saturatedFat, SATFAT_THRESHOLDS) : 0
  const saltPts = salt !== null ? negativePoints(salt, SALT_THRESHOLDS) : 0

  const fiberPts = positivePoints(fiber, FIBER_THRESHOLDS)
  const negativeTotal = energyPts + sugarPts + satFatPts + saltPts
  const rawProteinPts = negativeTotal < 11 ? positivePoints(protein, PROTEIN_THRESHOLDS) : 0
  const proteinPts = Math.min(rawProteinPts, Math.max(0, negativeTotal - 2))

  let categoryBonus = 0
  if (category && HEALTHY_CATEGORIES.includes(category)) {
    categoryBonus = 3
  }
  const nameLower = (name || '').toLowerCase()
  if (/nuez|almendra|cacahuete|avellana|pistacho|anacardo|aceite|aguacate|oliva/i.test(nameLower)) {
    categoryBonus = Math.max(categoryBonus, 3)
  }

  const positiveTotal = fiberPts + proteinPts + categoryBonus

  let officialAdjustment = 0
  if (nutriScore === 'E') officialAdjustment -= 6
  else if (nutriScore === 'D') officialAdjustment -= 4
  else if (nutriScore === 'C') officialAdjustment -= 1
  else if (nutriScore === 'A') officialAdjustment += 2
  else if (nutriScore === 'B') officialAdjustment += 1

  let novaAdjustment = 0
  if (novaGroup === 4) novaAdjustment -= 4
  else if (novaGroup === 3) novaAdjustment -= 2

  const raw = negativeTotal - positiveTotal - (officialAdjustment + novaAdjustment)

  let score = Math.round(100 - raw * 3.0)
  score = Math.max(0, Math.min(100, score))

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

  return { score, grade, provisional, positive, negative, missing, explanation }
}

// ============================================================
// PUNTUACIÓN DE INGESTA (comida) - 1-10
// ============================================================

export interface DailyEntry {
  foodName: string
  brand?: string
  category?: string
  grams: number
  per100: NutritionPer100
  foodScore?: number
  nutriScore?: 'A' | 'B' | 'C' | 'D' | 'E'
  novaGroup?: 1 | 2 | 3 | 4
}

export interface DailyScoreInput {
  entries: DailyEntry[]
  targets: { calories: number; protein: number; carbs: number; fat: number }
  date: string
}

export interface DailyScoreResult {
  score: number
  provisional: boolean
  confidence: 'high' | 'medium' | 'low'
  components: {
    foodQuality: number | null
    macroBalance: number | null
    proteinAdequacy: number | null
    fiberVariety: number | null
    variety: number | null
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
      components: { foodQuality: null, macroBalance: null, proteinAdequacy: null, fiberVariety: null, variety: null },
      strengths: [],
      improvements: [],
      tips: [],
      isEmpty: true,
    }
  }

  const strengths: string[] = []
  const improvements: string[] = []
  const tips: string[] = []

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

  const foodScores = entries.map((e) => e.foodScore).filter((s): s is number => s !== undefined && s !== null)
  const hasProvisional = foodScores.length < entries.length
  const foodQuality = foodScores.length > 0
    ? foodScores.reduce((a, b) => a + b, 0) / foodScores.length / 10
    : null

  // Penalizar si los alimentos tienen datos incompletos
  let dataPenalty = 0
  if (hasProvisional) dataPenalty = 1

  let macroBalance: number | null = null
  if (totals.calories > 0) {
    const pPct = (totals.protein * 4 / totals.calories) * 100
    const cPct = (totals.carbs * 4 / totals.calories) * 100
    const fPct = (totals.fat * 9 / totals.calories) * 100
    let score = 10
    if (pPct < 12 || pPct > 35) score -= 2
    if (cPct < 35 || cPct > 65) score -= 2
    if (fPct < 15 || fPct > 40) score -= 2
    macroBalance = Math.max(0, score)
  }

  let proteinAdequacy: number | null = null
  if (targets.protein > 0) {
    const ratio = totals.protein / targets.protein
    if (ratio >= 0.9 && ratio <= 1.2) proteinAdequacy = 10
    else if (ratio >= 0.7 && ratio <= 1.4) proteinAdequacy = 7
    else if (ratio >= 0.5) proteinAdequacy = 4
    else proteinAdequacy = 2
  }

  const uniqueFoods = new Set(entries.map((e) => e.foodName.toLowerCase())).size
  const fiberScore = totals.fiber >= 25 ? 10 : totals.fiber >= 15 ? 7 : totals.fiber >= 8 ? 4 : 2
  const varietyScore = uniqueFoods >= 6 ? 10 : uniqueFoods >= 4 ? 7 : uniqueFoods >= 2 ? 4 : 2
  const fiberVariety = (fiberScore + varietyScore) / 2

  // Variedad de comidas (número de comidas distintas con alimentos)
  const uniqueMeals = new Set(entries.map((e) => (e as any).meal).filter(Boolean)).size

  let calorieScore = 10
  if (targets.calories > 0) {
    const ratio = totals.calories / targets.calories
    if (ratio < 0.5) calorieScore = 5
    else if (ratio > 1.5) calorieScore = 6
    else if (ratio >= 0.8 && ratio <= 1.2) calorieScore = 10
    else calorieScore = 8
  }

  const components: { name: string; value: number; weight: number }[] = []
  if (foodQuality !== null) components.push({ name: 'foodQuality', value: Math.max(0, foodQuality - dataPenalty), weight: 0.4 })
  if (macroBalance !== null) components.push({ name: 'macroBalance', value: macroBalance, weight: 0.1 })
  if (proteinAdequacy !== null) components.push({ name: 'proteinAdequacy', value: proteinAdequacy, weight: 0.1 })
  if (fiberVariety !== null) components.push({ name: 'fiberVariety', value: fiberVariety, weight: 0.2 })
  components.push({ name: 'calorieScore', value: calorieScore, weight: 0.2 })

  const totalWeight = components.reduce((s, c) => s + c.weight, 0)
  const weightedSum = components.reduce((s, c) => s + c.value * c.weight, 0)
  const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 5

  // Factor de suficiencia: una ingesta muy insuficiente limita la puntuación máxima
  const calorieRatio = targets.calories > 0 ? totals.calories / targets.calories : 0
  const proteinRatio = targets.protein > 0 ? totals.protein / targets.protein : 0
  let sufficiencyCap = 10
  const minRatio = Math.min(calorieRatio, proteinRatio > 0 ? proteinRatio : 1)
  if (minRatio < 0.3) sufficiencyCap = 4
  else if (minRatio < 0.5) sufficiencyCap = 6
  else if (minRatio < 0.7) sufficiencyCap = 8

  // Penalización adicional por muy pocos alimentos
  if (entries.length <= 2) sufficiencyCap = Math.min(sufficiencyCap, 5)

  // Si es hoy, suavizar el límite (el día puede estar en curso)
  const today = new Date().toISOString().slice(0, 10)
  if (input.date === today) sufficiencyCap = Math.min(10, sufficiencyCap + 2)

  let score = Math.max(1, Math.min(10, Math.round(rawScore * 10) / 10))
  score = Math.min(score, sufficiencyCap)

  const confidence: 'high' | 'medium' | 'low' =
    foodScores.length >= entries.length * 0.8 ? 'high' :
    foodScores.length >= entries.length * 0.4 ? 'medium' : 'low'

  const provisional = entries.length < 3 || hasProvisional

  if (foodQuality !== null && foodQuality >= 7) strengths.push('Alimentos de buena calidad nutricional')
  if (proteinAdequacy !== null && proteinAdequacy >= 7) strengths.push('Buena adecuación de proteínas')
  if (totals.fiber >= 20) strengths.push('Buen consumo de fibra')
  if (macroBalance !== null && macroBalance >= 7) strengths.push('Equilibrio de macronutrientes adecuado')
  if (uniqueMeals >= 3) strengths.push('Buena variedad de comidas')

  if (foodQuality !== null && foodQuality < 5) improvements.push('Mejora la calidad de los alimentos consumidos')
  if (proteinAdequacy !== null && proteinAdequacy < 5) improvements.push('Aumenta el consumo de proteínas')
  if (totals.fiber < 15) improvements.push('Aumenta el consumo de fibra (frutas, verduras, legumbres)')
  if (macroBalance !== null && macroBalance < 5) improvements.push('Mejora el equilibrio de macronutrientes')

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
      variety: null,
    },
    strengths,
    improvements,
    tips,
    isEmpty: false,
  }
}

// ============================================================
// PUNTUACIÓN DE UNA COMIDA INDIVIDUAL (1-10)
// ============================================================

export interface MealScoreResult {
  score: number
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

export function scoreMeal(entries: DailyEntry[]): MealScoreResult {
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

  const foodScores = entries.map((e) => e.foodScore).filter((s): s is number => s !== undefined && s !== null)
  const hasProvisional = foodScores.length < entries.length
  let foodQuality = foodScores.length > 0
    ? foodScores.reduce((a, b) => a + b, 0) / foodScores.length / 10
    : null

  // Penalización por datos incompletos
  if (foodQuality !== null && hasProvisional) foodQuality = foodQuality * 0.7
  // Penalización por comida de un solo alimento (baja variedad nutricional)
  if (foodQuality !== null && entries.length === 1) foodQuality = foodQuality * 0.7

  let macroBalance: number | null = null
  if (totals.calories > 0) {
    const pPct = (totals.protein * 4 / totals.calories) * 100
    const cPct = (totals.carbs * 4 / totals.calories) * 100
    const fPct = (totals.fat * 9 / totals.calories) * 100
    let score = 10
    if (pPct < 10 || pPct > 40) score -= 2
    if (cPct < 30 || cPct > 70) score -= 2
    if (fPct < 15 || fPct > 45) score -= 2
    macroBalance = Math.max(0, score)
  }

  let proteinAdequacy: number | null = null
  if (totals.calories > 0) {
    const pPct = (totals.protein * 4 / totals.calories) * 100
    if (pPct >= 15) proteinAdequacy = 10
    else if (pPct >= 10) proteinAdequacy = 7
    else if (pPct >= 5) proteinAdequacy = 4
    else proteinAdequacy = 2
  }

  const uniqueFoods = new Set(entries.map((e) => e.foodName.toLowerCase())).size
  const fiberScore = totals.fiber >= 5 ? 10 : totals.fiber >= 2 ? 7 : totals.fiber >= 1 ? 4 : 2
  const varietyScore = uniqueFoods >= 4 ? 10 : uniqueFoods >= 2 ? 7 : 3
  const fiberVariety = (fiberScore + varietyScore) / 2

  const dataPenalty = hasProvisional ? 1 : 0

  const components: { value: number; weight: number }[] = []
  if (foodQuality !== null) components.push({ value: Math.max(0, foodQuality - dataPenalty), weight: 0.35 })
  if (macroBalance !== null) components.push({ value: macroBalance, weight: 0.25 })
  if (proteinAdequacy !== null) components.push({ value: proteinAdequacy, weight: 0.2 })
  components.push({ value: fiberVariety, weight: 0.2 })

  const totalWeight = components.reduce((s, c) => s + c.weight, 0)
  const weightedSum = components.reduce((s, c) => s + c.value * c.weight, 0)
  const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 5
  // Penalización adicional por comida de un solo alimento
  let finalRaw = rawScore
  if (entries.length === 1) finalRaw = Math.max(1, finalRaw - 1.5)
  const score = Math.max(1, Math.min(10, Math.round(finalRaw * 10) / 10))

  const confidence: 'high' | 'medium' | 'low' =
    foodScores.length >= entries.length * 0.8 ? 'high' :
    foodScores.length >= entries.length * 0.4 ? 'medium' : 'low'

  const provisional = entries.length < 2 || hasProvisional

  if (foodQuality !== null && foodQuality >= 7) strengths.push('Alimentos de buena calidad')
  if (proteinAdequacy !== null && proteinAdequacy >= 7) strengths.push('Buen aporte de proteínas')
  if (totals.fiber >= 3) strengths.push('Aporta fibra')
  if (macroBalance !== null && macroBalance >= 7) strengths.push('Buen equilibrio de macros')

  if (foodQuality !== null && foodQuality < 5) improvements.push('Mejora la calidad de los alimentos')
  if (proteinAdequacy !== null && proteinAdequacy < 5) improvements.push('Aumenta el aporte de proteínas')
  if (totals.fiber < 2) improvements.push('Añade fibra (fruta, verdura, legumbres)')
  if (macroBalance !== null && macroBalance < 5) improvements.push('Mejora el equilibrio de macros')
  if (entries.length === 1) improvements.push('Añade más alimentos para mayor variedad')

  const mealTips: string[] = []
  if (totals.fiber < 2) mealTips.push('Añade una porción de fruta o verdura.')
  if (proteinAdequacy !== null && proteinAdequacy < 7) mealTips.push('Incluye una fuente de proteína.')
  if (entries.length === 1) mealTips.push('Una comida de un solo alimento tiene menor variedad nutricional.')
  if (mealTips.length === 0) mealTips.push('Comida bien compuesta.')

  return {
    score,
    provisional,
    confidence,
    components: { foodQuality, macroBalance, proteinAdequacy, fiberVariety },
    strengths,
    improvements,
    tips: mealTips,
    isEmpty: false,
  }
}

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
