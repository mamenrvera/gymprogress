import { describe, it, expect } from 'vitest'
import {
  normalizeExerciseName,
  findDuplicateExercise,
  DUPLICATE_EXERCISE_MESSAGE,
} from './exerciseNames'

const catalog = [
  { id: 'a1', name: 'Peso muerto' },
  { id: 'a2', name: 'Sentadilla búlgara' },
  { id: 'a3', name: 'Press banca' },
]

describe('normalizeExerciseName', () => {
  it('convierte a minúsculas', () => {
    expect(normalizeExerciseName('Peso Muerto')).toBe('peso muerto')
  })

  it('elimina espacios al principio y al final', () => {
    expect(normalizeExerciseName('  Peso muerto  ')).toBe('peso muerto')
  })

  it('combina ambas reglas', () => {
    expect(normalizeExerciseName('  PESO MUERTO ')).toBe('peso muerto')
  })

  it('mantiene espacios internos', () => {
    expect(normalizeExerciseName('Peso muerto')).toBe('peso muerto')
  })
})

describe('findDuplicateExercise', () => {
  it('detecta duplicado con distinta capitalización', () => {
    const dup = findDuplicateExercise(catalog, 'PESO MUERTO')
    expect(dup?.id).toBe('a1')
  })

  it('detecta duplicado con espacios sobrantes', () => {
    const dup = findDuplicateExercise(catalog, '  Peso muerto  ')
    expect(dup?.id).toBe('a1')
  })

  it('detecta duplicado combinando capitalización y espacios', () => {
    const dup = findDuplicateExercise(catalog, ' peso MUERTO ')
    expect(dup?.id).toBe('a1')
  })

  it('no detecta duplicado para un nombre nuevo', () => {
    const dup = findDuplicateExercise(catalog, 'Hip thrust')
    expect(dup).toBeUndefined()
  })

  it('detecta duplicados creados por otros usuarios (catálogo compartido)', () => {
    // El catálogo se consulta completo, sin filtrar por propietario.
    const sharedCatalog = [
      { id: 'u1-a', name: 'Dominadas' }, // creado por usuario A
      { id: 'u2-b', name: 'Fondos' }, // creado por usuario B
    ]
    expect(findDuplicateExercise(sharedCatalog, ' dominadas ')?.id).toBe('u1-a')
    expect(findDuplicateExercise(sharedCatalog, 'FONDOS')?.id).toBe('u2-b')
  })

  it('al editar, excluye el propio ejercicio (no es duplicado de sí mismo)', () => {
    const dup = findDuplicateExercise(catalog, 'Peso muerto', 'a1')
    expect(dup).toBeUndefined()
  })

  it('al editar, detecta si el nuevo nombre lo usa OTRO ejercicio', () => {
    const dup = findDuplicateExercise(catalog, 'press banca', 'a1')
    expect(dup?.id).toBe('a3')
  })

  it('el mensaje de duplicado es el esperado', () => {
    expect(DUPLICATE_EXERCISE_MESSAGE).toBe(
      'Este ejercicio ya existe en el catálogo de GymProgress. No puedes crear un duplicado.',
    )
  })
})
