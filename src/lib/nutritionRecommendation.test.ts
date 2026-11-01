import { describe, it, expect } from 'vitest'
import { recommend } from './nutritionRecommendation'

describe('nutritionRecommendation', () => {
  it('calculates coherent macros', () => {
    const r = recommend({
      weightKg: 70, heightCm: 175, age: 30, sex: 'male',
      goal: 'maintain', activityLevel: 'moderate',
      strengthDaysPerWeek: 3, strengthSessionMinutes: 60, strengthLevel: 'intermediate',
      cardio: [],
    })
    expect(r.calories).toBeGreaterThan(0)
    const kcal = r.protein * 4 + r.carbs * 4 + r.fat * 9
    expect(Math.abs(kcal - r.calories)).toBeLessThanOrEqual(20)
  })

  it('applies deficit for lose_fat', () => {
    const base = recommend({ weightKg: 70, heightCm: 175, age: 30, sex: 'male', goal: 'maintain', activityLevel: 'moderate', strengthDaysPerWeek: 0, strengthSessionMinutes: 0, strengthLevel: 'none', cardio: [] })
    const cut = recommend({ weightKg: 70, heightCm: 175, age: 30, sex: 'male', goal: 'lose_fat', activityLevel: 'moderate', strengthDaysPerWeek: 0, strengthSessionMinutes: 0, strengthLevel: 'none', cardio: [] })
    expect(cut.calories).toBeLessThan(base.calories)
  })

  it('does not go below BMR', () => {
    const r = recommend({ weightKg: 50, heightCm: 160, age: 25, sex: 'female', goal: 'lose_fat', activityLevel: 'sedentary', strengthDaysPerWeek: 0, strengthSessionMinutes: 0, strengthLevel: 'none', cardio: [] })
    expect(r.calories).toBeGreaterThanOrEqual(r.bmr)
  })

  it('warns for minors', () => {
    const r = recommend({ weightKg: 60, heightCm: 170, age: 16, sex: 'male', goal: 'maintain', activityLevel: 'moderate', strengthDaysPerWeek: 2, strengthSessionMinutes: 45, strengthLevel: 'beginner', cardio: [], isMinor: true })
    expect(r.warnings.some(w => w.includes('Menor'))).toBe(true)
  })

  it('handles unknown sex with average', () => {
    const r = recommend({ weightKg: 70, heightCm: 175, age: 30, sex: 'unknown', goal: 'maintain', activityLevel: 'moderate', strengthDaysPerWeek: 0, strengthSessionMinutes: 0, strengthLevel: 'none', cardio: [] })
    expect(r.bmr).toBeGreaterThan(0)
    expect(r.explanation.some(e => e.includes('Sexo no indicado'))).toBe(true)
  })

  it('includes cardio expenditure', () => {
    const without = recommend({ weightKg: 70, heightCm: 175, age: 30, sex: 'male', goal: 'maintain', activityLevel: 'sedentary', strengthDaysPerWeek: 0, strengthSessionMinutes: 0, strengthLevel: 'none', cardio: [] })
    const withCardio = recommend({ weightKg: 70, heightCm: 175, age: 30, sex: 'male', goal: 'maintain', activityLevel: 'sedentary', strengthDaysPerWeek: 0, strengthSessionMinutes: 0, strengthLevel: 'none', cardio: [{ type: 'running', daysPerWeek: 3, durationMin: 30, intensity: 'moderate' }] })
    expect(withCardio.tdee).toBeGreaterThan(without.tdee)
  })

  it('invalid data returns warnings and zeros', () => {
    const r = recommend({ weightKg: 0, heightCm: 175, age: 30, sex: 'male', goal: 'maintain', activityLevel: 'moderate', strengthDaysPerWeek: 0, strengthSessionMinutes: 0, strengthLevel: 'none', cardio: [] })
    expect(r.calories).toBe(0)
    expect(r.warnings.length).toBeGreaterThan(0)
  })
})
