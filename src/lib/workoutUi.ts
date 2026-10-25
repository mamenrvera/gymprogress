import type { WorkoutStatus } from '../types'

export const WORKOUT_STATUS_LABELS: Record<WorkoutStatus, string> = {
  planned: 'Planificada',
  in_progress: 'En curso',
  completed: 'Completada',
}

export const WORKOUT_STATUS_CLASSES: Record<WorkoutStatus, string> = {
  planned: 'chip border-sky-500/30 bg-sky-500/10 text-sky-400',
  in_progress: 'chip border-amber-500/30 bg-amber-500/10 text-amber-400',
  completed: 'chip border-lime-500/30 bg-lime-400/10 text-accent',
}
