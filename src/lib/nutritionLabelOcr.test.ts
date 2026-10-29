import { describe, it, expect } from 'vitest'
import { parseNutritionLabel } from './nutritionLabelOcr'

describe('parseNutritionLabel', () => {
  it('returns unknown base and nulls for empty text', () => {
    const r = parseNutritionLabel('')
    expect(r.caloriesPer100).toBeNull()
    expect(r.baseUnit).toBe('unknown')
  })

  it('parses a complete Spanish label (per 100 g)', () => {
    const text = `
Información nutricional
por 100 g
Energía 1680 kJ / 402 kcal
Grasas 18,5 g
de las cuales saturadas 6,2 g
Hidratos de carbono 45,3 g
de los cuales azúcares 12,1 g
Fibra 3,4 g
Proteínas 12,8 g
Sal 0,8 g
`
    const r = parseNutritionLabel(text)
    expect(r.baseUnit).toBe('100g')
    expect(r.caloriesPer100).toBe(402)
    expect(r.fatPer100).toBe(18.5)
    expect(r.saturatedFatPer100).toBe(6.2)
    expect(r.carbsPer100).toBe(45.3)
    expect(r.sugarsPer100).toBe(12.1)
    expect(r.fiberPer100).toBe(3.4)
    expect(r.proteinPer100).toBe(12.8)
    expect(r.saltPer100).toBe(0.8)
  })

  it('converts kJ to kcal when only kJ present', () => {
    const text = `Energía 840 kJ\nGrasas 5 g\nProteínas 10 g`
    const r = parseNutritionLabel(text)
    expect(r.caloriesPer100).toBe(Math.round(840 / 4.184))
  })

  it('detects 100 ml base', () => {
    const text = `por 100 ml\nEnergía 42 kcal\nGrasas 0,5 g`
    const r = parseNutritionLabel(text)
    expect(r.baseUnit).toBe('100ml')
  })

  it('detects serving base', () => {
    const text = `por ración (30g)\nEnergía 120 kcal\nGrasas 4 g`
    const r = parseNutritionLabel(text)
    expect(r.baseUnit).toBe('serving')
  })

  it('handles decimal comma', () => {
    const text = `Energía 250 kcal\nProteínas 7,5 g\nGrasas 2,3 g`
    const r = parseNutritionLabel(text)
    expect(r.proteinPer100).toBe(7.5)
    expect(r.fatPer100).toBe(2.3)
  })

  it('handles missing fields gracefully', () => {
    const text = `Energía 200 kcal\nProteínas 5 g`
    const r = parseNutritionLabel(text)
    expect(r.caloriesPer100).toBe(200)
    expect(r.proteinPer100).toBe(5)
    expect(r.fatPer100).toBeNull()
    expect(r.carbsPer100).toBeNull()
  })

  it('does not confuse sugars with carbs', () => {
    const text = `Hidratos de carbono 40 g\nde los cuales azúcares 15 g`
    const r = parseNutritionLabel(text)
    expect(r.carbsPer100).toBe(40)
    expect(r.sugarsPer100).toBe(15)
  })

  it('does not confuse saturated fat with total fat', () => {
    const text = `Grasas 20 g\nde las cuales saturadas 8 g`
    const r = parseNutritionLabel(text)
    expect(r.fatPer100).toBe(20)
    expect(r.saturatedFatPer100).toBe(8)
  })

  it('prefers first number when two columns present', () => {
    const text = `Energía 402 kcal  120 kcal\nGrasas 18,5 g  5,5 g`
    const r = parseNutritionLabel(text)
    expect(r.caloriesPer100).toBe(402)
    expect(r.fatPer100).toBe(18.5)
  })

  it('reports confidence > 0 when fields found', () => {
    const text = `Energía 200 kcal\nProteínas 5 g\nGrasas 2 g\nHidratos de carbono 30 g`
    const r = parseNutritionLabel(text)
    expect(r.confidence).toBeGreaterThan(0)
  })
})