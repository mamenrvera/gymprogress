import { describe, it, expect } from 'vitest'
import { scoreFood, scoreDay, gradeColor, dailyScoreColor, dailyScoreLabel } from './nutritionScore'
import type { NutritionPer100 } from '../types'

function per100(overrides: Partial<NutritionPer100> = {}): NutritionPer100 {
  return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, ...overrides }
}

describe('scoreFood', () => {
  it('high quality food → A or B', () => {
    const r = scoreFood({ per100: per100({ calories: 120, protein: 20, carbs: 5, fat: 3, fiber: 4 }), category: 'Proteínas' })
    expect(['A', 'B']).toContain(r.grade)
    expect(r.score).toBeGreaterThanOrEqual(75)
  })

  it('high sugar food → lower grade', () => {
    const r = scoreFood({ per100: per100({ calories: 400, protein: 2, carbs: 60, fat: 10, fiber: 0, sugars: 60 }) })
    // high sugar (carbs proxy) should reduce score
    expect(r.score).toBeLessThan(70)
  })

  it('high salt food → lower grade', () => {
    const r = scoreFood({ per100: { calories: 300, protein: 5, carbs: 30, fat: 15, fiber: 1, sugars: 30, saturatedFat: 15, salt: 3 } as any })
    expect(r.score).toBeLessThan(60)
  })

  it('nuts/healthy fats get bonus', () => {
    const r = scoreFood({ per100: per100({ calories: 600, protein: 20, carbs: 10, fat: 50, fiber: 8 }), name: 'Almendras' })
    expect(r.score).toBeGreaterThanOrEqual(60)
  })

  it('olive oil gets bonus', () => {
    const r = scoreFood({ per100: per100({ calories: 900, protein: 0, carbs: 0, fat: 100, fiber: 0 }), name: 'Aceite de oliva' })
    expect(r.score).toBeGreaterThanOrEqual(50)
  })

  it('missing core data → provisional, score 0', () => {
    const r = scoreFood({ per100: per100({}) })
    expect(r.provisional).toBe(true)
    expect(r.score).toBe(0)
    expect(r.missing.length).toBeGreaterThan(0)
  })

  it('same input → same output (reproducible)', () => {
    const input = { per100: per100({ calories: 200, protein: 10, carbs: 20, fat: 8, fiber: 3 }) }
    const r1 = scoreFood(input)
    const r2 = scoreFood(input)
    expect(r1.score).toBe(r2.score)
    expect(r1.grade).toBe(r2.grade)
  })

  it('gradeColor returns correct classes', () => {
    expect(gradeColor('A')).toContain('emerald')
    expect(gradeColor('E')).toContain('rose')
  })
})

describe('scoreDay', () => {
  it('empty entries → isEmpty true, score 0', () => {
    const r = scoreDay({ entries: [], targets: { calories: 2000, protein: 150, carbs: 200, fat: 70 }, date: '2026-01-01' })
    expect(r.isEmpty).toBe(true)
    expect(r.score).toBe(0)
  })

  it('good day → high score', () => {
    const entries = [
      { foodName: 'Pollo', grams: 300, per100: per100({ calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 }), foodScore: 90 },
      { foodName: 'Arroz', grams: 200, per100: per100({ calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 }), foodScore: 70 },
      { foodName: 'Brócoli', grams: 200, per100: per100({ calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6 }), foodScore: 95 },
      { foodName: 'Aceite de oliva', grams: 15, per100: per100({ calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 }), foodScore: 75 },
    ]
    const r = scoreDay({ entries, targets: { calories: 2000, protein: 150, carbs: 200, fat: 70 }, date: '2026-01-01' })
    expect(r.score).toBeGreaterThanOrEqual(6)
    expect(r.isEmpty).toBe(false)
  })

  it('low protein day → lower proteinAdequacy', () => {
    const entries = [
      { foodName: 'Pan', grams: 200, per100: per100({ calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7 }), foodScore: 60 },
    ]
    const r = scoreDay({ entries, targets: { calories: 2000, protein: 150, carbs: 200, fat: 70 }, date: '2026-01-01' })
    expect(r.components.proteinAdequacy).toBeLessThanOrEqual(4)
  })

  it('does not reward extreme calorie restriction', () => {
    const entries = [
      { foodName: 'Lechuga', grams: 100, per100: per100({ calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3 }), foodScore: 90 },
    ]
    const r = scoreDay({ entries, targets: { calories: 2000, protein: 150, carbs: 200, fat: 70 }, date: '2026-01-01' })
    // Very low calories should not give a perfect score
    expect(r.score).toBeLessThan(9)
  })

  it('handles missing food scores (medium confidence)', () => {
    const entries = [
      { foodName: 'Alimento X', grams: 100, per100: per100({ calories: 200, protein: 10, carbs: 20, fat: 8, fiber: 2 }) },
    ]
    const r = scoreDay({ entries, targets: { calories: 2000, protein: 150, carbs: 200, fat: 70 }, date: '2026-01-01' })
    expect(r.components.foodQuality).toBeNull()
    expect(r.confidence).not.toBe('high')
  })

  it('dailyScoreColor returns correct colors', () => {
    expect(dailyScoreColor(9)).toContain('emerald')
    expect(dailyScoreColor(6)).toContain('amber')
    expect(dailyScoreColor(4)).toContain('orange')
    expect(dailyScoreColor(2)).toContain('rose')
  })

  it('dailyScoreLabel returns correct labels', () => {
    expect(dailyScoreLabel(9.5)).toBe('Excelente')
    expect(dailyScoreLabel(7.5)).toBe('Buena')
    expect(dailyScoreLabel(5.5)).toBe('Moderada')
    expect(dailyScoreLabel(3.5)).toBe('Baja')
    expect(dailyScoreLabel(1.5)).toBe('Muy baja')
  })
})