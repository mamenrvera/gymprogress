/**
 * OCR de etiquetas nutricionales usando Tesseract.js (ejecución en navegador, sin coste).
 * Incluye un parser puro (testable) que extrae valores nutricionales del texto reconocido.
 */

export type LabelBaseUnit = '100g' | '100ml' | 'serving' | 'unknown'

export interface ParsedLabel {
  caloriesPer100: number | null   // kcal
  proteinPer100: number | null
  carbsPer100: number | null
  fatPer100: number | null
  saturatedFatPer100: number | null
  sugarsPer100: number | null
  fiberPer100: number | null
  saltPer100: number | null
  baseUnit: LabelBaseUnit
  servingSize?: string
  rawText: string
  confidence: number
}

/** Convierte una cadena numérica con coma/punto a número. */
function toNumber(raw: string): number | null {
  if (!raw) return null
  // Quitar separadores de miles europeos (1.234,5 -> 1234.5)
  let s = raw.trim()
  if (/\.\d{3},/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else {
    s = s.replace(',', '.')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Extrae todos los números de una línea. */
function numbersIn(line: string): string[] {
  const matches = line.match(/\d+(?:[.,]\d+)?/g)
  return matches ?? []
}

/** Normaliza texto para búsqueda de palabras clave. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Parser puro: dado el texto OCR de una etiqueta, extrae valores nutricionales.
 * Prioriza la columna "por 100 g/ml" cuando hay varias columnas.
 */
export function parseNutritionLabel(text: string): ParsedLabel {
  const result: ParsedLabel = {
    caloriesPer100: null,
    proteinPer100: null,
    carbsPer100: null,
    fatPer100: null,
    saturatedFatPer100: null,
    sugarsPer100: null,
    fiberPer100: null,
    saltPer100: null,
    baseUnit: 'unknown',
    rawText: text,
    confidence: 0,
  }

  if (!text || text.trim().length === 0) return result

  const lower = norm(text)

  // Detect base unit
  if (/100\s*ml/.test(lower)) result.baseUnit = '100ml'
  else if (/100\s*g/.test(lower)) result.baseUnit = '100g'
  else if (/por\s*racion|por\s*porcion|per\s*serving|serving\s*size/.test(lower)) result.baseUnit = 'serving'
  else result.baseUnit = '100g' // default assumption

  // Serving size extraction (best effort)
  const servingMatch = text.match(/(?:racion|porcion|serving)[^\n]*?(\d+(?:[.,]\d+)?)\s*(g|ml)/i)
  if (servingMatch) result.servingSize = `${servingMatch[1]} ${servingMatch[2]}`

  const lines = text.split(/\n+/)

  // Helper: try to find a value for a keyword
  const findValue = (keywordRegex: RegExp, excludeRegex?: RegExp): number | null => {
    for (const line of lines) {
      const nLine = norm(line)
      if (!keywordRegex.test(nLine)) continue
      if (excludeRegex && excludeRegex.test(nLine)) continue
      const nums = numbersIn(line)
      if (nums.length === 0) continue
      // If line has 2 numbers (100g and serving), take first
      const val = toNumber(nums[0])
      if (val !== null) return val
    }
    return null
  }

  // Calories: handle "Energía 1680 kJ / 402 kcal" or separate lines
  // First try kcal directly
  let caloriesFound = false
  for (const line of lines) {
    const nLine = norm(line)
    if (!/energia|calorias|energy|valor energetico|kcal/.test(nLine)) continue
    // Look for number followed by kcal
    const kcalMatch = line.match(/(\d+(?:[.,]\d+)?)\s*kcal/i)
    if (kcalMatch) {
      const v = toNumber(kcalMatch[1])
      if (v !== null) { result.caloriesPer100 = v; caloriesFound = true; break }
    }
  }
  // If no kcal found, look for kJ and convert
  if (!caloriesFound) {
    for (const line of lines) {
      const nLine = norm(line)
      if (!/energia|calorias|energy|valor energetico/.test(nLine)) continue
      const kjMatch = line.match(/(\d+(?:[.,]\d+)?)\s*kJ/i)
      if (kjMatch) {
        const v = toNumber(kjMatch[1])
        if (v !== null) { result.caloriesPer100 = Math.round(v / 4.184); caloriesFound = true; break }
      }
    }
  }
  // Fallback: first number on an energy line
  if (!caloriesFound) {
    const v = findValue(/energia|calorias|energy|valor energetico/)
    if (v !== null) result.caloriesPer100 = v
  }

  result.proteinPer100 = findValue(/proteinas?|protein/)
  result.fatPer100 = findValue(/grasas?|fat|lipidos/, /saturad/)
  result.saturatedFatPer100 = findValue(/saturad/)
  result.carbsPer100 = findValue(/hidratos?|carbohidratos?|carbohydrates?|glucidos/, /azucar/)
  result.sugarsPer100 = findValue(/azucar/)
  result.fiberPer100 = findValue(/fibra|fiber|fibre/)
  result.saltPer100 = findValue(/sal\b|salt/)

  // Confidence: count of found fields
  const found = [result.caloriesPer100, result.proteinPer100, result.carbsPer100, result.fatPer100,
    result.fiberPer100, result.saltPer100].filter((v) => v !== null).length
  result.confidence = found / 6

  return result
}

/** Ejecuta OCR en el navegador con Tesseract.js (español). */
export async function runOcrOnImage(
  file: File | Blob,
  onProgress?: (progress: number) => void,
): Promise<ParsedLabel> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('spa', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (onProgress && m.status === 'recognizing text') {
        onProgress(Math.round(m.progress * 100))
      }
    },
  })
  try {
    const { data } = await worker.recognize(file)
    return parseNutritionLabel(data.text)
  } finally {
    await worker.terminate()
  }
}