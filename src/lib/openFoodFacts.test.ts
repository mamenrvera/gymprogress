import { describe, it, expect } from 'vitest'
import { parseOpenFoodFactsResponse, isValidBarcode, normalizeBarcode } from './openFoodFacts'

describe('parseOpenFoodFactsResponse', () => {
  it('returns found:false when status !== 1', () => {
    const r = parseOpenFoodFactsResponse({ status: 0 }, '123')
    expect(r.found).toBe(false)
  })

  it('returns found:false when no product', () => {
    const r = parseOpenFoodFactsResponse({ status: 1 }, '123')
    expect(r.found).toBe(false)
  })

  it('parses a complete product', () => {
    const json = {
      status: 1,
      product: {
        code: '8410076012345',
        product_name: 'Yogur griego',
        brands: 'Danone',
        image_url: 'https://example.com/img.jpg',
        nutriments: {
          'energy-kcal_100g': 95,
          proteins_100g: 9.5,
          carbohydrates_100g: 4.2,
          fat_100g: 5.1,
          fiber_100g: 0,
          salt_100g: 0.1,
          'saturated-fat_100g': 3.2,
          sugars_100g: 4.0,
        },
      },
    }
    const r = parseOpenFoodFactsResponse(json, '8410076012345')
    expect(r.found).toBe(true)
    expect(r.product?.name).toBe('Yogur griego')
    expect(r.product?.brand).toBe('Danone')
    expect(r.product?.caloriesPer100).toBe(95)
    expect(r.product?.proteinPer100).toBe(9.5)
    expect(r.product?.carbsPer100).toBe(4.2)
    expect(r.product?.fatPer100).toBe(5.1)
    expect(r.missingFields).toBeUndefined()
  })

  it('reports missing fields', () => {
    const json = {
      status: 1,
      product: {
        code: '123',
        product_name: 'Producto incompleto',
        nutriments: {},
      },
    }
    const r = parseOpenFoodFactsResponse(json, '123')
    expect(r.found).toBe(true)
    expect(r.missingFields).toContain('Calorías')
    expect(r.missingFields).toContain('Proteínas')
    expect(r.product?.caloriesPer100).toBeNull()
  })

  it('handles null nutriments', () => {
    const json = {
      status: 1,
      product: {
        code: '123',
        product_name: 'Sin nutriments',
      },
    }
    const r = parseOpenFoodFactsResponse(json, '123')
    expect(r.found).toBe(true)
    expect(r.product?.caloriesPer100).toBeNull()
  })

  it('prefers _100g fields over non-suffixed', () => {
    const json = {
      status: 1,
      product: {
        code: '123',
        product_name: 'Test',
        nutriments: {
          'energy-kcal_100g': 100,
          'energy-kcal': 50,
          proteins_100g: 10,
          proteins: 5,
        },
      },
    }
    const r = parseOpenFoodFactsResponse(json, '123')
    expect(r.product?.caloriesPer100).toBe(100)
    expect(r.product?.proteinPer100).toBe(10)
  })

  it('falls back to non-suffixed when _100g missing', () => {
    const json = {
      status: 1,
      product: {
        code: '123',
        product_name: 'Test',
        nutriments: {
          'energy-kcal': 100,
          proteins: 10,
        },
      },
    }
    const r = parseOpenFoodFactsResponse(json, '123')
    expect(r.product?.caloriesPer100).toBe(100)
    expect(r.product?.proteinPer100).toBe(10)
  })
})

describe('parseOpenFoodFactsResponse - Nutri-Score oficial', () => {
  function makeJson(grade: unknown, extra: Record<string, unknown> = {}) {
    return {
      status: 1,
      product: {
        code: '123',
        product_name: 'Producto test',
        nutriments: { 'energy-kcal_100g': 100, proteins_100g: 5, carbohydrates_100g: 10, fat_100g: 3 },
        nutriscore_grade: grade,
        ...extra,
      },
    }
  }

  it('conserva Nutri-Score C', () => {
    const r = parseOpenFoodFactsResponse(makeJson('c'), '123')
    expect(r.product?.nutriScore).toBe('C')
  })

  it('conserva Nutri-Score A', () => {
    const r = parseOpenFoodFactsResponse(makeJson('a'), '123')
    expect(r.product?.nutriScore).toBe('A')
  })

  it('conserva B, D y E', () => {
    for (const g of ['b', 'd', 'e']) {
      const r = parseOpenFoodFactsResponse(makeJson(g), '123')
      expect(r.product?.nutriScore).toBe(g.toUpperCase())
    }
  })

  it('devuelve undefined si no hay Nutri-Score (No disponible)', () => {
    const r = parseOpenFoodFactsResponse(makeJson(null), '123')
    expect(r.product?.nutriScore).toBeUndefined()
  })

  it('usa nutrition_grades como respaldo (campo legacy)', () => {
    const json = {
      status: 1,
      product: {
        code: '123',
        product_name: 'Legacy',
        nutriments: { 'energy-kcal_100g': 100 },
        nutrition_grades: 'd',
      },
    }
    const r = parseOpenFoodFactsResponse(json, '123')
    expect(r.product?.nutriScore).toBe('D')
  })

  it('usa nutriscore_data.grade como último respaldo', () => {
    const json = {
      status: 1,
      product: {
        code: '123',
        product_name: 'Data',
        nutriments: { 'energy-kcal_100g': 100 },
        nutriscore_data: { grade: 'e' },
      },
    }
    const r = parseOpenFoodFactsResponse(json, '123')
    expect(r.product?.nutriScore).toBe('E')
  })

  it('no asigna A por defecto cuando el dato falta', () => {
    const json = {
      status: 1,
      product: {
        code: '123',
        product_name: 'Sin grade',
        nutriments: { 'energy-kcal_100g': 100 },
      },
    }
    const r = parseOpenFoodFactsResponse(json, '123')
    expect(r.product?.nutriScore).toBeUndefined()
  })
})

describe('isValidBarcode', () => {
  it('acepta EAN-13 válido', () => {
    expect(isValidBarcode('8480000107831')).toBe(true)
  })
  it('rechaza EAN-13 con check digit malo', () => {
    expect(isValidBarcode('8480000107832')).toBe(false)
  })
  it('acepta EAN-8 válido', () => {
    // 96385074 is a valid EAN-8
    expect(isValidBarcode('96385074')).toBe(true)
  })
  it('rechaza longitud inválida', () => {
    expect(isValidBarcode('12345')).toBe(false)
    expect(isValidBarcode('1234567')).toBe(false)
  })
  it('rechaza no-dígitos', () => {
    expect(isValidBarcode('848000010783A')).toBe(false)
  })
  it('normalizeBarcode elimina no-dígitos', () => {
    expect(normalizeBarcode('848-000-010-783-1')).toBe('8480000107831')
  })
})
