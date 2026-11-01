/**
 * Recomendador nutricional de GymProgress.
 * Funciones puras, sin dependencias de React ni Supabase.
 */

export type Sex = 'male' | 'female' | 'unknown'
export type Goal = 'lose_fat' | 'gain_muscle' | 'recomposition' | 'maintain' | 'performance' | 'other'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type StrengthLevel = 'beginner' | 'intermediate' | 'advanced' | 'none'

export interface CardioActivity {
  type: string
  daysPerWeek: number
  durationMin: number
  intensity: 'low' | 'moderate' | 'high'
}

export interface RecommendationInput {
  weightKg: number
  heightCm: number
  age: number
  sex: Sex
  goal: Goal
  activityLevel: ActivityLevel
  stepsPerDay?: number | null
  strengthDaysPerWeek: number
  strengthSessionMinutes: number
  strengthLevel: StrengthLevel
  cardio: CardioActivity[]
  isMinor?: boolean
}

export interface RecommendationResult {
  calories: number
  protein: number
  fat: number
  carbs: number
  bmr: number
  tdee: number
  exerciseKcal: number
  explanation: string[]
  warnings: string[]
  algorithmVersion: number
}

export const ALGORITHM_VERSION = 1

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.3,
  moderate: 1.45,
  active: 1.6,
  very_active: 1.75,
}

const INTENSITY_MET: Record<CardioActivity['intensity'], number> = {
  low: 3.5,
  moderate: 6,
  high: 9,
}

function bmrMifflin(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  if (sex === 'male') return base + 5
  if (sex === 'female') return base - 161
  // unknown: promedio de ambos
  return base + (5 - 161) / 2
}

function exerciseKcalPerDay(input: RecommendationInput): number {
  let total = 0
  // Fuerza
  if (input.strengthDaysPerWeek > 0 && input.strengthSessionMinutes > 0) {
    const met = input.strengthLevel === 'beginner' ? 3.5 : input.strengthLevel === 'intermediate' ? 4.5 : 5.5
    const kcalPerSession = met * input.weightKg * (input.strengthSessionMinutes / 60)
    total += (kcalPerSession * input.strengthDaysPerWeek) / 7
  }
  // Cardio
  for (const c of input.cardio) {
    if (c.daysPerWeek <= 0 || c.durationMin <= 0) continue
    const met = INTENSITY_MET[c.intensity]
    const kcalPerSession = met * input.weightKg * (c.durationMin / 60)
    total += (kcalPerSession * c.daysPerWeek) / 7
  }
  return Math.round(total)
}

export function recommend(input: RecommendationInput): RecommendationResult {
  const warnings: string[] = []
  const explanation: string[] = []

  if (input.isMinor) {
    warnings.push('Eres menor de edad: las estimaciones automáticas no son suficientes. Consulta a un profesional.')
  }
  if (input.weightKg <= 0 || input.heightCm <= 0 || input.age <= 0) {
    warnings.push('Datos personales inválidos: no se puede calcular una recomendación.')
    return { calories: 0, protein: 0, fat: 0, carbs: 0, bmr: 0, tdee: 0, exerciseKcal: 0, explanation, warnings, algorithmVersion: ALGORITHM_VERSION }
  }

  const bmr = Math.round(bmrMifflin(input.weightKg, input.heightCm, input.age, input.sex))
  const neatFactor = ACTIVITY_FACTOR[input.activityLevel]
  const exKcal = exerciseKcalPerDay(input)
  const tdee = Math.round(bmr * neatFactor + exKcal)

  explanation.push(`Metabolismo basal estimado (Mifflin-St Jeor): ${bmr} kcal.`)
  explanation.push(`Gasto energético total estimado: ${tdee} kcal (actividad diaria + ejercicio).`)
  if (input.sex === 'unknown') {
    explanation.push('Sexo no indicado: se usó un promedio, la estimación es menos precisa.')
  }

  // Ajuste por objetivo
  let calories = tdee
  if (input.goal === 'lose_fat') {
    calories = tdee - 400
    explanation.push('Objetivo: déficit moderado (-400 kcal) para pérdida de grasa.')
  } else if (input.goal === 'gain_muscle') {
    calories = tdee + 250
    explanation.push('Objetivo: superávit moderado (+250 kcal) para ganancia muscular.')
  } else if (input.goal === 'recomposition') {
    calories = tdee - 150
    explanation.push('Objetivo: déficit conservador (-150 kcal) para recomposición.')
  } else if (input.goal === 'maintain') {
    calories = tdee
    explanation.push('Objetivo: mantenimiento (aproximación al gasto).')
  } else if (input.goal === 'performance') {
    calories = tdee + 150
    explanation.push('Objetivo: ligero superávit (+150 kcal) para rendimiento.')
  } else {
    calories = tdee
    explanation.push('Objetivo: mantenimiento (aproximación al gasto).')
  }

  // Seguridad: no por debajo del BMR
  if (calories < bmr) {
    warnings.push('La restricción energética calculada caía por debajo del metabolismo basal. Se ajustó al BMR.')
    calories = bmr
  }
  if (input.goal === 'lose_fat' && (input.weightKg < 50)) {
    warnings.push('Peso bajo: revisa la restricción con un profesional.')
  }

  // Proteínas
  let proteinPerKg = 1.6
  if (input.goal === 'lose_fat') proteinPerKg = 2.0
  else if (input.goal === 'gain_muscle') proteinPerKg = 1.8
  else if (input.goal === 'recomposition') proteinPerKg = 2.0
  else if (input.goal === 'performance') proteinPerKg = 1.8
  else proteinPerKg = 1.4
  const protein = Math.round(proteinPerKg * input.weightKg)

  // Grasas: 0.9 g/kg, mínimo 40
  const fat = Math.max(40, Math.round(0.9 * input.weightKg))

  // Carbohidratos: resto
  const proteinKcal = protein * 4
  const fatKcal = fat * 9
  const carbsKcal = calories - proteinKcal - fatKcal
  const carbs = Math.max(0, Math.round(carbsKcal / 4))

  explanation.push(`Proteínas: ${protein} g (${proteinPerKg} g/kg).`)
  explanation.push(`Grasas: ${fat} g (~0,9 g/kg).`)
  explanation.push(`Carbohidratos: ${carbs} g (energía restante).`)
  explanation.push('Estos valores son orientativos y deben ajustarse según la evolución real.')

  if (input.isMinor) {
    warnings.push('Menor de edad: consulta a un profesional antes de aplicar estos objetivos.')
  }

  return {
    calories,
    protein,
    fat,
    carbs,
    bmr,
    tdee,
    exerciseKcal: exKcal,
    explanation,
    warnings,
    algorithmVersion: ALGORITHM_VERSION,
  }
}
