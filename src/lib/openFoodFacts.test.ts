import { describe, it, expect } from 'vitest'
import { parseOpenFoodFactsResponse } from './openFoodFacts'

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
          'energy-kcal': 50, // serving value, should be ignored
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