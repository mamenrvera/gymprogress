import { describe, it } from 'vitest'
import { scoreMeal } from './nutritionScore'
describe('dbg3', () => {
  it('x', () => {
    const entries = [{ foodName: 'Jamón Extrafino', grams: 100, per100: { calories: 102, protein: 19, carbs: 0.9, fat: 2.5, fiber: 0 }, foodScore: 94 }]
    const r = scoreMeal(entries as any)
    console.log('SCORE:', r.score, 'components:', JSON.stringify(r.components))
  })
})
