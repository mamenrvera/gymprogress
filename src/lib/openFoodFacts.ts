/**
 * Cliente para la API de Open Food Facts.
 * https://world.openfoodfacts.org/api/v2/product/{barcode}.json
 */

export interface OpenFoodFactsProduct {
  barcode: string
  name: string
  brand?: string
  imageUrl?: string
  caloriesPer100: number | null
  proteinPer100: number | null
  carbsPer100: number | null
  fatPer100: number | null
  saturatedFatPer100: number | null
  sugarsPer100: number | null
  fiberPer100: number | null
  saltPer100: number | null
  nutriScore?: 'A' | 'B' | 'C' | 'D' | 'E'
  novaGroup?: 1 | 2 | 3 | 4
}

export interface OpenFoodFactsResult {
  found: boolean
  product?: OpenFoodFactsProduct
  missingFields?: string[]
}

const FIELDS = 'code,product_name,brands,image_url,nutriments,nutriscore_grade,nutrition_grades,nova_group'

export function parseOpenFoodFactsResponse(json: any, barcode: string): OpenFoodFactsResult {
  if (json.status !== 1 || !json.product) {
    return { found: false }
  }

  const p = json.product
  const n = p.nutriments || {}

  // Open Food Facts provides energy in both kJ and kcal; prefer kcal
  const calories = n['energy-kcal_100g'] ?? n['energy-kcal'] ?? null
  const protein = n['proteins_100g'] ?? n['proteins'] ?? null
  const carbs = n['carbohydrates_100g'] ?? n['carbohydrates'] ?? null
  const fat = n['fat_100g'] ?? n['fat'] ?? null
  const saturatedFat = n['saturated-fat_100g'] ?? n['saturated-fat'] ?? null
  const sugars = n['sugars_100g'] ?? n['sugars'] ?? null
  const fiber = n['fiber_100g'] ?? n['fiber'] ?? null
  const salt = n['salt_100g'] ?? n['salt'] ?? null

  // Nutri-Score oficial de Open Food Facts.
  // Se prioriza nutriscore_grade (formato actual), con respaldo en
  // nutrition_grades (campo legacy de productos antiguos) y, por último,
  // nutriscore_data.grade. Nunca se asigna por defecto ni se infiere de
  // nuestra puntuación propia.
  const nutriScoreCandidate =
    p.nutriscore_grade ||
    p.nutrition_grades ||
    (p.nutriscore_data && p.nutriscore_data.grade) ||
    ''
  const nutriScoreRaw = String(nutriScoreCandidate).trim().toUpperCase()
  const nutriScore = ['A', 'B', 'C', 'D', 'E'].includes(nutriScoreRaw)
    ? (nutriScoreRaw as 'A' | 'B' | 'C' | 'D' | 'E')
    : undefined
  const novaRaw = p.nova_group
  const novaGroup = (novaRaw === 1 || novaRaw === 2 || novaRaw === 3 || novaRaw === 4) ? novaRaw as 1 | 2 | 3 | 4 : undefined

  const product: OpenFoodFactsProduct = {
    barcode: p.code || barcode,
    name: p.product_name || '',
    brand: p.brands || undefined,
    imageUrl: p.image_url || undefined,
    caloriesPer100: calories !== null ? Number(calories) : null,
    proteinPer100: protein !== null ? Number(protein) : null,
    carbsPer100: carbs !== null ? Number(carbs) : null,
    fatPer100: fat !== null ? Number(fat) : null,
    saturatedFatPer100: saturatedFat !== null ? Number(saturatedFat) : null,
    sugarsPer100: sugars !== null ? Number(sugars) : null,
    fiberPer100: fiber !== null ? Number(fiber) : null,
    saltPer100: salt !== null ? Number(salt) : null,
    nutriScore,
    novaGroup,
  }

  const missingFields: string[] = []
  if (product.caloriesPer100 === null) missingFields.push('Calorías')
  if (product.proteinPer100 === null) missingFields.push('Proteínas')
  if (product.carbsPer100 === null) missingFields.push('Carbohidratos')
  if (product.fatPer100 === null) missingFields.push('Grasas')

  return { found: true, product, missingFields: missingFields.length > 0 ? missingFields : undefined }
}

export async function fetchProductByBarcode(barcode: string): Promise<OpenFoodFactsResult> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`

  let response: Response
  try {
    response = await fetch(url)
  } catch {
    throw new Error('No se pudo conectar con Open Food Facts. Comprueba tu conexión.')
  }

  if (!response.ok) {
    throw new Error(`Error al consultar Open Food Facts (${response.status}).`)
  }

  const json = await response.json()
  return parseOpenFoodFactsResponse(json, barcode)
}