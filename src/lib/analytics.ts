import type {
  BodyWeight,
  FoodEntry,
  MuscleGroup,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from '../types'
import { MUSCLE_LABELS } from '../types'
import { addDaysISO, diffInDays, eachDateISO, formatShortEs, startOfWeekISO } from './dates'
import { epley1RM, roundTo, sumEntries, workoutStats } from './calculations'

export interface DailyNutritionPoint {
  date: string
  label: string
  calories: number
  caloriesEstimated: number
  protein: number
  carbs: number
  fat: number
  logged: boolean
}

export function dailyNutritionSeries(entries: FoodEntry[], startISO: string, endISO: string): DailyNutritionPoint[] {
  const grouped = new Map<string, FoodEntry[]>()
  for (const entry of entries) {
    if (entry.date < startISO || entry.date > endISO) continue
    const list = grouped.get(entry.date) ?? []
    list.push(entry)
    grouped.set(entry.date, list)
  }
  return eachDateISO(startISO, endISO).map((date) => {
    const totals = sumEntries(grouped.get(date) ?? [])
    return {
      date,
      label: formatShortEs(date),
      calories: totals.calories,
      caloriesEstimated: totals.caloriesEstimated,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      logged: (grouped.get(date) ?? []).length > 0,
    }
  })
}

export interface NutritionPeriodSummary {
  days: number
  loggedDays: number
  totalCalories: number
  avgCalories: number
  avgCaloriesLogged: number
  avgProtein: number
  avgCarbs: number
  avgFat: number
  avgFiber: number
  avgCaloriesEstimated: number
}

export function nutritionPeriodSummary(
  entries: FoodEntry[],
  startISO: string,
  endISO: string,
): NutritionPeriodSummary {
  const days = diffInDays(startISO, endISO) + 1
  const inRange = entries.filter((entry) => entry.date >= startISO && entry.date <= endISO)
  const dates = new Set(inRange.map((entry) => entry.date))
  const totals = sumEntries(inRange)
  const loggedDays = dates.size
  return {
    days,
    loggedDays,
    totalCalories: totals.calories,
    avgCalories: days > 0 ? roundTo(totals.calories / days, 1) : 0,
    avgCaloriesLogged: loggedDays > 0 ? roundTo(totals.calories / loggedDays, 1) : 0,
    avgProtein: loggedDays > 0 ? roundTo(totals.protein / loggedDays, 1) : 0,
    avgCarbs: loggedDays > 0 ? roundTo(totals.carbs / loggedDays, 1) : 0,
    avgFat: loggedDays > 0 ? roundTo(totals.fat / loggedDays, 1) : 0,
    avgFiber: loggedDays > 0 ? roundTo(totals.fiber / loggedDays, 1) : 0,
    avgCaloriesEstimated: loggedDays > 0 ? roundTo(totals.caloriesEstimated / loggedDays, 1) : 0,
  }
}

export interface TrainingPeriodSummary {
  sessions: number
  volume: number
  effectiveSets: number
  reps: number
  totalMinutes: number
  avgMinutes: number
}

export function trainingPeriodSummary(
  workouts: Workout[],
  sets: WorkoutSet[],
  startISO: string,
  endISO: string,
): TrainingPeriodSummary {
  const completed = workouts.filter(
    (workout) => workout.status === 'completed' && workout.date >= startISO && workout.date <= endISO,
  )
  const ids = new Set(completed.map((workout) => workout.id))
  const relevantSets = sets.filter((set) => ids.has(set.workoutId))
  const stats = workoutStats(relevantSets)
  const durations = completed
    .map((workout) => {
      if (!workout.startedAt || !workout.finishedAt) return 0
      const start = new Date(workout.startedAt).getTime()
      const end = new Date(workout.finishedAt).getTime()
      return end > start ? Math.round((end - start) / 60_000) : 0
    })
    .filter((minutes) => minutes > 0)
  return {
    sessions: completed.length,
    volume: stats.volume,
    effectiveSets: stats.effectiveSets,
    reps: stats.reps,
    totalMinutes: durations.reduce((sum, minutes) => sum + minutes, 0),
    avgMinutes:
      durations.length > 0 ? Math.round(durations.reduce((sum, m) => sum + m, 0) / durations.length) : 0,
  }
}

export interface WeeklyVolumePoint {
  weekStart: string
  label: string
  volume: number
  sessions: number
  effectiveSets: number
}

export function volumeByWeek(
  workouts: Workout[],
  sets: WorkoutSet[],
  endISO: string,
  weekCount = 8,
): WeeklyVolumePoint[] {
  const currentWeek = startOfWeekISO(endISO)
  const result: WeeklyVolumePoint[] = []
  for (let i = weekCount - 1; i >= 0; i -= 1) {
    const weekStart = addDaysISO(currentWeek, -7 * i)
    const weekEnd = addDaysISO(weekStart, 6)
    const summary = trainingPeriodSummary(workouts, sets, weekStart, weekEnd)
    result.push({
      weekStart,
      label: formatShortEs(weekStart),
      volume: summary.volume,
      sessions: summary.sessions,
      effectiveSets: summary.effectiveSets,
    })
  }
  return result
}

export interface MuscleGroupVolume {
  muscleGroup: MuscleGroup
  label: string
  sets: number
  volume: number
  exercises: number
}

export function muscleGroupDistribution(
  workouts: Workout[],
  workoutExercises: WorkoutExercise[],
  sets: WorkoutSet[],
  startISO: string,
  endISO: string,
): MuscleGroupVolume[] {
  const completedIds = new Set(
    workouts
      .filter((workout) => workout.status === 'completed' && workout.date >= startISO && workout.date <= endISO)
      .map((workout) => workout.id),
  )
  const exerciseMap = new Map(
    workoutExercises
      .filter((exercise) => completedIds.has(exercise.workoutId))
      .map((exercise) => [exercise.id, exercise]),
  )
  const map = new Map<MuscleGroup, { sets: number; volume: number; exercises: Set<string> }>()
  for (const set of sets) {
    if (!completedIds.has(set.workoutId) || !set.completed || set.isWarmup) continue
    const exercise = exerciseMap.get(set.workoutExerciseId)
    if (!exercise) continue
    const current = map.get(exercise.muscleGroup) ?? { sets: 0, volume: 0, exercises: new Set<string>() }
    current.sets += 1
    current.volume += set.weightKg * set.reps
    current.exercises.add(exercise.id)
    map.set(exercise.muscleGroup, current)
  }
  return Array.from(map.entries())
    .map(([muscleGroup, value]) => ({
      muscleGroup,
      label: MUSCLE_LABELS[muscleGroup],
      sets: value.sets,
      volume: roundTo(value.volume, 1),
      exercises: value.exercises.size,
    }))
    .sort((a, b) => b.sets - a.sets)
}

export interface PersonalRecord {
  type: 'maxWeight' | 'maxReps' | 'maxVolume' | 'bestE1rm'
  label: string
  value: number
  unit: string
  date: string
  workoutId: string
  weightKg?: number
  reps?: number
}

export interface SessionComparison {
  lastSession: {
    date: string
    workoutId: string
    maxWeight: number
    reps: number
    sets: number
    volume: number
  } | null
  previousSession: {
    date: string
    workoutId: string
    maxWeight: number
    reps: number
    sets: number
    volume: number
  } | null
  weightDiff: number | null
  repsDiff: number | null
  volumeDiff: number | null
  setsDiff: number | null
}

export interface StrengthPoint {
  date: string
  label: string
  workoutId: string
  maxWeight: number
  e1rm: number
  volume: number
  sets: number
}

export function strengthHistory(
  workouts: Workout[],
  workoutExercises: WorkoutExercise[],
  sets: WorkoutSet[],
  exerciseKey: string,
): StrengthPoint[] {
  const relevantExercises = workoutExercises.filter(
    (exercise) => (exercise.exerciseId || exercise.exerciseName) === exerciseKey,
  )
  const byId = new Map(relevantExercises.map((exercise) => [exercise.id, exercise]))
  const workoutMap = new Map(
    workouts.filter((workout) => workout.status === 'completed').map((workout) => [workout.id, workout]),
  )
  const grouped = new Map<string, { points: StrengthPoint; exerciseName: string }>()
  for (const set of sets) {
    if (!set.completed || set.isWarmup) continue
    const exercise = byId.get(set.workoutExerciseId)
    const workout = workoutMap.get(set.workoutId)
    if (!exercise || !workout) continue
    const existing = grouped.get(workout.date)
    const e1rm = epley1RM(set.weightKg, set.reps)
    if (existing) {
      existing.points.maxWeight = Math.max(existing.points.maxWeight, set.weightKg)
      existing.points.e1rm = Math.max(existing.points.e1rm, e1rm)
      existing.points.volume = roundTo(existing.points.volume + set.weightKg * set.reps, 1)
      existing.points.sets += 1
    } else {
      grouped.set(workout.date, {
        exerciseName: exercise.exerciseName,
        points: {
          date: workout.date,
          label: formatShortEs(workout.date),
          workoutId: workout.id,
          maxWeight: set.weightKg,
          e1rm,
          volume: roundTo(set.weightKg * set.reps, 1),
          sets: 1,
        },
      })
    }
  }
  return Array.from(grouped.values())
    .sort((a, b) => a.points.date.localeCompare(b.points.date))
    .map((item) => item.points)
}

export function personalRecords(
  workouts: Workout[],
  workoutExercises: WorkoutExercise[],
  sets: WorkoutSet[],
  exerciseKey: string,
): PersonalRecord[] {
  const relevantExercises = workoutExercises.filter(
    (exercise) => (exercise.exerciseId || exercise.exerciseName) === exerciseKey,
  )
  const byId = new Map(relevantExercises.map((exercise) => [exercise.id, exercise]))
  const workoutMap = new Map(
    workouts.filter((workout) => workout.status === 'completed').map((workout) => [workout.id, workout]),
  )

  let maxWeight = 0
  let maxWeightDate = ''
  let maxWeightWorkoutId = ''
  let maxWeightReps = 0

  let maxReps = 0
  let maxRepsWeight = 0
  let maxRepsDate = ''
  let maxRepsWorkoutId = ''

  let maxVolume = 0
  let maxVolumeDate = ''
  let maxVolumeWorkoutId = ''

  let bestE1rm = 0
  let bestE1rmWeight = 0
  let bestE1rmReps = 0
  let bestE1rmDate = ''
  let bestE1rmWorkoutId = ''

  // Group sets by workout for volume calculation
  const setsByWorkout = new Map<string, WorkoutSet[]>()
  for (const set of sets) {
    if (!set.completed || set.isWarmup) continue
    const exercise = byId.get(set.workoutExerciseId)
    const workout = workoutMap.get(set.workoutId)
    if (!exercise || !workout) continue
    const list = setsByWorkout.get(set.workoutId) ?? []
    list.push(set)
    setsByWorkout.set(set.workoutId, list)
  }

  for (const set of sets) {
    if (!set.completed || set.isWarmup) continue
    const exercise = byId.get(set.workoutExerciseId)
    const workout = workoutMap.get(set.workoutId)
    if (!exercise || !workout) continue

    // Max weight
    if (set.weightKg > maxWeight) {
      maxWeight = set.weightKg
      maxWeightDate = workout.date
      maxWeightWorkoutId = workout.id
      maxWeightReps = set.reps
    }

    // Max reps
    if (set.reps > maxReps) {
      maxReps = set.reps
      maxRepsWeight = set.weightKg
      maxRepsDate = workout.date
      maxRepsWorkoutId = workout.id
    }

    // Best 1RM
    const e1rm = epley1RM(set.weightKg, set.reps)
    if (e1rm > bestE1rm) {
      bestE1rm = e1rm
      bestE1rmWeight = set.weightKg
      bestE1rmReps = set.reps
      bestE1rmDate = workout.date
      bestE1rmWorkoutId = workout.id
    }
  }

  // Max volume per session
  for (const [workoutId, workoutSets] of setsByWorkout) {
    const workout = workoutMap.get(workoutId)
    if (!workout) continue
    const volume = roundTo(workoutSets.reduce((sum, s) => sum + s.weightKg * s.reps, 0), 1)
    if (volume > maxVolume) {
      maxVolume = volume
      maxVolumeDate = workout.date
      maxVolumeWorkoutId = workout.id
    }
  }

  const records: PersonalRecord[] = []

  if (maxWeight > 0) {
    records.push({
      type: 'maxWeight',
      label: 'Mayor peso',
      value: maxWeight,
      unit: 'kg',
      date: maxWeightDate,
      workoutId: maxWeightWorkoutId,
      weightKg: maxWeight,
      reps: maxWeightReps,
    })
  }

  if (maxReps > 0) {
    records.push({
      type: 'maxReps',
      label: 'Más repeticiones',
      value: maxReps,
      unit: 'reps',
      date: maxRepsDate,
      workoutId: maxRepsWorkoutId,
      weightKg: maxRepsWeight,
      reps: maxReps,
    })
  }

  if (maxVolume > 0) {
    records.push({
      type: 'maxVolume',
      label: 'Mayor volumen',
      value: maxVolume,
      unit: 'kg×reps',
      date: maxVolumeDate,
      workoutId: maxVolumeWorkoutId,
    })
  }

  if (bestE1rm > 0) {
    records.push({
      type: 'bestE1rm',
      label: 'Mejor 1RM est.',
      value: bestE1rm,
      unit: 'kg',
      date: bestE1rmDate,
      workoutId: bestE1rmWorkoutId,
      weightKg: bestE1rmWeight,
      reps: bestE1rmReps,
    })
  }

  return records
}

export function sessionComparison(
  workouts: Workout[],
  workoutExercises: WorkoutExercise[],
  sets: WorkoutSet[],
  exerciseKey: string,
): SessionComparison {
  const relevantExercises = workoutExercises.filter(
    (exercise) => (exercise.exerciseId || exercise.exerciseName) === exerciseKey,
  )
  const byId = new Map(relevantExercises.map((exercise) => [exercise.id, exercise]))
  const workoutMap = new Map(
    workouts.filter((workout) => workout.status === 'completed').map((workout) => [workout.id, workout]),
  )

  // Group sets by workout
  const byWorkout = new Map<string, WorkoutSet[]>()
  for (const set of sets) {
    if (!set.completed || set.isWarmup) continue
    const exercise = byId.get(set.workoutExerciseId)
    const workout = workoutMap.get(set.workoutId)
    if (!exercise || !workout) continue
    const list = byWorkout.get(set.workoutId) ?? []
    list.push(set)
    byWorkout.set(set.workoutId, list)
  }

  // Sort workouts by date descending
  const sortedWorkouts = Array.from(byWorkout.keys())
    .map((id) => workoutMap.get(id)!)
    .sort((a, b) => b.date.localeCompare(a.date))

  if (sortedWorkouts.length === 0) {
    return { lastSession: null, previousSession: null, weightDiff: null, repsDiff: null, volumeDiff: null, setsDiff: null }
  }

  const lastWorkout = sortedWorkouts[0]
  const lastSets = byWorkout.get(lastWorkout.id) ?? []
  const lastMaxWeight = Math.max(...lastSets.map((s) => s.weightKg), 0)
  const lastReps = lastSets.reduce((sum, s) => sum + (s.reps || 0), 0)
  const lastVolume = roundTo(lastSets.reduce((sum, s) => sum + s.weightKg * s.reps, 0), 1)

  const lastSession = {
    date: lastWorkout.date,
    workoutId: lastWorkout.id,
    maxWeight: lastMaxWeight,
    reps: lastReps,
    sets: lastSets.length,
    volume: lastVolume,
  }

  if (sortedWorkouts.length < 2) {
    return { lastSession, previousSession: null, weightDiff: null, repsDiff: null, volumeDiff: null, setsDiff: null }
  }

  const prevWorkout = sortedWorkouts[1]
  const prevSets = byWorkout.get(prevWorkout.id) ?? []
  const prevMaxWeight = Math.max(...prevSets.map((s) => s.weightKg), 0)
  const prevReps = prevSets.reduce((sum, s) => sum + (s.reps || 0), 0)
  const prevVolume = roundTo(prevSets.reduce((sum, s) => sum + s.weightKg * s.reps, 0), 1)

  const previousSession = {
    date: prevWorkout.date,
    workoutId: prevWorkout.id,
    maxWeight: prevMaxWeight,
    reps: prevReps,
    sets: prevSets.length,
    volume: prevVolume,
  }

  return {
    lastSession,
    previousSession,
    weightDiff: roundTo(lastMaxWeight - prevMaxWeight, 1),
    repsDiff: lastReps - prevReps,
    volumeDiff: roundTo(lastVolume - prevVolume, 1),
    setsDiff: lastSets.length - prevSets.length,
  }
}

export function weeklyStrengthSummary(
  workouts: Workout[],
  workoutExercises: WorkoutExercise[],
  sets: WorkoutSet[],
  weekStart: string,
  weekEnd: string,
): { exercises: Array<{ name: string; key: string; sessions: number; maxWeight: number; volume: number; change: number | null }>; newPRs: number } {
  const completedWorkouts = workouts.filter(
    (w) => w.status === 'completed' && w.date >= weekStart && w.date <= weekEnd,
  )
  const completedIds = new Set(completedWorkouts.map((w) => w.id))

  // Previous week for comparison
  const prevWeekStart = addDaysISO(weekStart, -7)
  const prevWeekEnd = addDaysISO(weekEnd, -7)
  const prevCompletedWorkouts = workouts.filter(
    (w) => w.status === 'completed' && w.date >= prevWeekStart && w.date <= prevWeekEnd,
  )
  const prevCompletedIds = new Set(prevCompletedWorkouts.map((w) => w.id))

  const exerciseMap = new Map<string, { name: string; key: string; sessions: number; maxWeight: number; volume: number; prevMaxWeight: number }>()

  for (const set of sets) {
    if (!set.completed || set.isWarmup) continue
    if (!completedIds.has(set.workoutId)) continue
    const we = workoutExercises.find((w) => w.id === set.workoutExerciseId)
    if (!we) continue
    const key = we.exerciseId || we.exerciseName
    const existing = exerciseMap.get(key)
    if (existing) {
      existing.maxWeight = Math.max(existing.maxWeight, set.weightKg)
      existing.volume = roundTo(existing.volume + set.weightKg * set.reps, 1)
      existing.sessions = existing.sessions // already counted
    } else {
      exerciseMap.set(key, {
        name: we.exerciseName,
        key,
        sessions: 1,
        maxWeight: set.weightKg,
        volume: roundTo(set.weightKg * set.reps, 1),
        prevMaxWeight: 0,
      })
    }
  }

  // Count sessions per exercise
  for (const we of workoutExercises) {
    if (!completedIds.has(we.workoutId)) continue
    const key = we.exerciseId || we.exerciseName
    const existing = exerciseMap.get(key)
    if (existing) existing.sessions = (existing.sessions || 0) + 0 // placeholder, will fix below
  }

  // Actually count unique workouts per exercise
  const sessionsPerExercise = new Map<string, Set<string>>()
  for (const we of workoutExercises) {
    if (!completedIds.has(we.workoutId)) continue
    const key = we.exerciseId || we.exerciseName
    const set = sessionsPerExercise.get(key) ?? new Set()
    set.add(we.workoutId)
    sessionsPerExercise.set(key, set)
  }

  // Previous week max weights
  const prevMaxByExercise = new Map<string, number>()
  for (const set of sets) {
    if (!set.completed || set.isWarmup) continue
    if (!prevCompletedIds.has(set.workoutId)) continue
    const we = workoutExercises.find((w) => w.id === set.workoutExerciseId)
    if (!we) continue
    const key = we.exerciseId || we.exerciseName
    const current = prevMaxByExercise.get(key) ?? 0
    prevMaxByExercise.set(key, Math.max(current, set.weightKg))
  }

  const exercises = Array.from(exerciseMap.entries()).map(([key, data]) => ({
    name: data.name,
    key,
    sessions: sessionsPerExercise.get(key)?.size ?? 0,
    maxWeight: data.maxWeight,
    volume: data.volume,
    change: prevMaxByExercise.has(key) ? roundTo(data.maxWeight - (prevMaxByExercise.get(key) ?? 0), 1) : null,
  }))

  // Count new PRs this week (exercises where max weight > previous week)
  let newPRs = 0
  for (const ex of exercises) {
    if (ex.change !== null && ex.change > 0) newPRs++
  }

  return { exercises, newPRs }
}

export interface ExerciseHistoryOption {
  key: string
  name: string
  muscleGroup: MuscleGroup
  sessions: number
}

export function exerciseHistoryOptions(
  workouts: Workout[],
  workoutExercises: WorkoutExercise[],
  sets: WorkoutSet[],
): ExerciseHistoryOption[] {
  const completed = new Set(workouts.filter((workout) => workout.status === 'completed').map((workout) => workout.id))
  const completedExerciseIds = new Set(
    sets
      .filter((set) => completed.has(set.workoutId) && set.completed && !set.isWarmup)
      .map((set) => set.workoutExerciseId),
  )
  const map = new Map<string, ExerciseHistoryOption>()
  for (const exercise of workoutExercises) {
    if (!completedExerciseIds.has(exercise.id)) continue
    const key = exercise.exerciseId || exercise.exerciseName
    const existing = map.get(key)
    if (existing) {
      existing.sessions += 1
      continue
    }
    map.set(key, {
      key,
      name: exercise.exerciseName,
      muscleGroup: exercise.muscleGroup,
      sessions: 1,
    })
  }
  return Array.from(map.values()).sort((a, b) => b.sessions - a.sessions)
}

export interface BodyWeightSummary {
  latest?: BodyWeight
  first?: BodyWeight
  change: number
  min?: number
  max?: number
  entries: BodyWeight[]
}

export function bodyWeightSummary(weights: BodyWeight[], startISO?: string, endISO?: string): BodyWeightSummary {
  const entries = weights
    .filter((weight) => (!startISO || weight.date >= startISO) && (!endISO || weight.date <= endISO))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
  const allSorted = weights.slice().sort((a, b) => a.date.localeCompare(b.date))
  return {
    entries,
    latest: allSorted.at(-1),
    first: allSorted[0],
    change: allSorted.length >= 2 ? roundTo(allSorted.at(-1)!.weightKg - allSorted[0].weightKg, 1) : 0,
    min: entries.length ? Math.min(...entries.map((weight) => weight.weightKg)) : undefined,
    max: entries.length ? Math.max(...entries.map((weight) => weight.weightKg)) : undefined,
  }
}

export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null
  return roundTo(((current - previous) / previous) * 100, 1)
}

/** Días consecutivos con al menos una comida registrada, terminando en endISO. */
export function nutritionStreak(entries: FoodEntry[], endISO: string): number {
  const dates = new Set(entries.map((entry) => entry.date))
  let streak = 0
  let cursor = endISO
  while (dates.has(cursor) && streak < 3650) {
    streak += 1
    cursor = addDaysISO(cursor, -1)
  }
  return streak
}
