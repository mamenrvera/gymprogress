import type { Exercise, MuscleGroup, Settings } from '../types'
import { newId } from './id'

export function createDefaultSettings(): Settings {
  const now = new Date().toISOString()
  return {
    id: 'app',
    profile: {
      name: '',
      initialWeightKg: 63,
      heightCm: 163,
      goal: 'perder_grasa_ganar_musculo',
    },
    targets: {
      calories: 1400,
      protein: 125,
      fat: 40,
      carbs: 90,
      carbMin: 85,
      carbMax: 95,
    },
    theme: 'dark',
    createdAt: now,
    updatedAt: now,
  }
}

const SEED_EXERCISES: Array<{ name: string; muscleGroup: MuscleGroup; equipment?: string }> = [
  { name: 'Press banca', muscleGroup: 'pecho', equipment: 'Barra' },
  { name: 'Press banca inclinado', muscleGroup: 'pecho', equipment: 'Barra' },
  { name: 'Aperturas con mancuernas', muscleGroup: 'pecho', equipment: 'Mancuernas' },
  { name: 'Press militar', muscleGroup: 'hombros', equipment: 'Barra' },
  { name: 'Press Arnold', muscleGroup: 'hombros', equipment: 'Mancuernas' },
  { name: 'Elevaciones laterales', muscleGroup: 'hombros', equipment: 'Mancuernas' },
  { name: 'Jalón al pecho', muscleGroup: 'espalda', equipment: 'Polea' },
  { name: 'Remo con barra', muscleGroup: 'espalda', equipment: 'Barra' },
  { name: 'Remo con mancuerna', muscleGroup: 'espalda', equipment: 'Mancuerna' },
  { name: 'Remo en polea', muscleGroup: 'espalda', equipment: 'Polea' },
  { name: 'Dominadas', muscleGroup: 'espalda', equipment: 'Peso corporal' },
  { name: 'Sentadilla', muscleGroup: 'cuadriceps', equipment: 'Barra' },
  { name: 'Prensa de piernas', muscleGroup: 'cuadriceps', equipment: 'Máquina' },
  { name: 'Zancadas', muscleGroup: 'cuadriceps', equipment: 'Mancuernas' },
  { name: 'Peso muerto rumano', muscleGroup: 'isquiotibiales', equipment: 'Barra' },
  { name: 'Curl femoral', muscleGroup: 'isquiotibiales', equipment: 'Máquina' },
  { name: 'Hip thrust', muscleGroup: 'gluteos', equipment: 'Barra' },
  { name: 'Curl de bíceps', muscleGroup: 'biceps', equipment: 'Mancuernas' },
  { name: 'Curl martillo', muscleGroup: 'biceps', equipment: 'Mancuernas' },
  { name: 'Extensión de tríceps', muscleGroup: 'triceps', equipment: 'Polea' },
  { name: 'Fondos', muscleGroup: 'triceps', equipment: 'Peso corporal' },
  { name: 'Elevación de gemelos', muscleGroup: 'gemelos', equipment: 'Máquina' },
  { name: 'Plancha', muscleGroup: 'core', equipment: 'Peso corporal' },
  { name: 'Crunch en polea', muscleGroup: 'core', equipment: 'Polea' },
]

export function createSeedExercises(): Exercise[] {
  const now = new Date().toISOString()
  return SEED_EXERCISES.map((exercise) => ({
    id: newId(),
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    equipment: exercise.equipment,
    createdAt: now,
    updatedAt: now,
  }))
}
