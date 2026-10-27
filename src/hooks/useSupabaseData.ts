import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  fetchFoodsFromSupabase,
  fetchEntriesFromSupabase,
  fetchExercisesFromSupabase,
  fetchWorkoutsFromSupabase,
  fetchWorkoutExercisesFromSupabase,
  fetchSetsFromSupabase,
  fetchBodyWeightsFromSupabase,
  fetchSettingsFromSupabase,
} from '../lib/supabase-data'
import type {
  Food,
  FoodEntry,
  Exercise,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  BodyWeight,
  Settings,
} from '../types'

// ============================================================
// GENERIC HOOK: Fetch data from Supabase with loading/error states
// ============================================================
interface UseQueryResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

function useSupabaseQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): UseQueryResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      if (mountedRef.current) {
        setData(result)
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : 'Error al cargar datos')
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, deps)

  useEffect(() => {
    mountedRef.current = true
    void fetch()
    return () => { mountedRef.current = false }
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

// ============================================================
// HOOKS ESPECÍFICOS
// ============================================================

export function useFoods(): UseQueryResult<Food[]> {
  const fetcher = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    return fetchFoodsFromSupabase(user.id)
  }, [])
  return useSupabaseQuery(fetcher, [])
}

export function useEntries(date?: string): UseQueryResult<FoodEntry[]> {
  const fetcher = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const entries = await fetchEntriesFromSupabase(user.id)
    if (date) return entries.filter(e => e.date === date)
    return entries
  }, [date])
  return useSupabaseQuery(fetcher, [date])
}

export function useExercises(): UseQueryResult<Exercise[]> {
  const fetcher = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    return fetchExercisesFromSupabase()
  }, [])
  return useSupabaseQuery(fetcher, [])
}

export function useWorkouts(date?: string): UseQueryResult<Workout[]> {
  const fetcher = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const workouts = await fetchWorkoutsFromSupabase(user.id)
    if (date) return workouts.filter(w => w.date === date)
    return workouts
  }, [date])
  return useSupabaseQuery(fetcher, [date])
}

export function useWorkoutExercises(workoutId?: string): UseQueryResult<WorkoutExercise[]> {
  const fetcher = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const all = await fetchWorkoutExercisesFromSupabase(user.id)
    if (workoutId) return all.filter(we => we.workoutId === workoutId)
    return all
  }, [workoutId])
  return useSupabaseQuery(fetcher, [workoutId])
}

export function useSets(workoutId?: string): UseQueryResult<WorkoutSet[]> {
  const fetcher = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const all = await fetchSetsFromSupabase(user.id)
    if (workoutId) return all.filter(s => s.workoutId === workoutId)
    return all
  }, [workoutId])
  return useSupabaseQuery(fetcher, [workoutId])
}

export function useBodyWeights(): UseQueryResult<BodyWeight[]> {
  const fetcher = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    return fetchBodyWeightsFromSupabase(user.id)
  }, [])
  return useSupabaseQuery(fetcher, [])
}

export function useSettings(): UseQueryResult<Settings | null> {
  const fetcher = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    return fetchSettingsFromSupabase(user.id)
  }, [])
  return useSupabaseQuery(fetcher, [])
}

// ============================================================
// MUTATION HELPER: Refresh data after mutation
// ============================================================
export function useMutation<TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  onSuccess?: () => void
): {
  mutate: (args: TArgs) => Promise<TResult>
  loading: boolean
  error: string | null
} {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(async (args: TArgs): Promise<TResult> => {
    setLoading(true)
    setError(null)
    try {
      const result = await mutationFn(args)
      onSuccess?.()
      return result
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error en la operación'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [mutationFn, onSuccess])

  return { mutate, loading, error }
}