import { createClient, type SupabaseClient, type AuthError, type User, type Session } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Re-export types from @supabase/supabase-js for consumers
export type { User, Session }

// ============================================================
// CONFIGURACIÓN DEL CLIENTE SUPABASE
// ============================================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // En desarrollo sin credenciales, evitamos romper la app
  console.warn('[Supabase] Variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no configuradas')
}

let supabaseInstance: SupabaseClient<Database> | null = null

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseInstance) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase no configurado: faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY')
    }
    supabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'gymprogress-auth',
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
      global: {
        headers: { 'X-Client-Info': 'gymprogress-web' },
      },
    })
  }
  return supabaseInstance
}

// Exportar instancia lazy para compatibilidad
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    return getSupabaseClient()[prop as keyof SupabaseClient<Database>]
  },
})

// ============================================================
// HELPERS DE AUTENTICACIÓN
// ============================================================

export async function getSession(): Promise<Session | null> {
  try {
    const { data, error } = await getSupabaseClient().auth.getSession()
    if (error) throw error
    return data.session
  } catch (e) {
    console.error('[Supabase] Error getting session:', e)
    return null
  }
}

export async function getUser(): Promise<User | null> {
  try {
    const { data, error } = await getSupabaseClient().auth.getUser()
    if (error) throw error
    return data.user
  } catch (e) {
    console.error('[Supabase] Error getting user:', e)
    return null
  }
}

export async function signUp(email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  return { user: data.user, error }
}

export async function signIn(email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email,
    password,
  })
  return { user: data.user, error }
}

export async function signOut(): Promise<AuthError | null> {
  const { error } = await getSupabaseClient().auth.signOut()
  return error
}

export function getAppUrl(): string {
  // Configuración clara por entorno: no construir URLs a partir del dominio
  if (import.meta.env.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL
  }
  return import.meta.env.PROD
    ? 'https://gymprogress-seven.vercel.app'
    : 'http://localhost:5173'
}

export async function resetPassword(email: string): Promise<AuthError | null> {
  const appUrl = getAppUrl()
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/reset-password`,
  })
  return error
}

export async function updatePassword(newPassword: string): Promise<AuthError | null> {
  const { error } = await getSupabaseClient().auth.updateUser({ password: newPassword })
  return error
}

export async function updateEmail(newEmail: string): Promise<AuthError | null> {
  const { error } = await getSupabaseClient().auth.updateUser({ email: newEmail })
  return error
}

// ============================================================
// HELPERS DE PERFIL
// ============================================================

export interface Profile {
  id: string
  name: string | null
  initial_weight_kg: number | null
  height_cm: number | null
  goal: string | null
  created_at: string
  updated_at: string
}

export interface Targets {
  user_id: string
  calories: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
  carb_min: number | null
  carb_max: number | null
  updated_at: string
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) {
    console.error('[Supabase] Error fetching profile:', error)
    return null
  }
  return data
}

export async function fetchTargets(userId: string): Promise<Targets | null> {
  const { data, error } = await getSupabaseClient()
    .from('targets')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) {
    console.error('[Supabase] Error fetching targets:', error)
    return null
  }
  return data
}

export async function upsertProfile(
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
): Promise<Profile | null> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .upsert({ id: userId, ...updates }, { onConflict: 'id' })
    .select()
    .single()
  if (error) {
    console.error('[Supabase] Error upserting profile:', error)
    return null
  }
  return data
}

export async function upsertTargets(
  userId: string,
  updates: Partial<Omit<Targets, 'user_id' | 'updated_at'>>
): Promise<Targets | null> {
  const { data, error } = await getSupabaseClient()
    .from('targets')
    .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) {
    console.error('[Supabase] Error upserting targets:', error)
    return null
  }
  return data
}

export async function fetchUserPreferences(userId: string): Promise<{ theme: 'dark' | 'light' } | null> {
  const { data, error } = await getSupabaseClient()
    .from('user_preferences')
    .select('theme')
    .eq('user_id', userId)
    .single()
  if (error) {
    console.error('[Supabase] Error fetching preferences:', error)
    return null
  }
  return data ? { theme: data.theme === 'light' ? 'light' : 'dark' } : null
}

export async function upsertUserPreferences(userId: string, theme: 'dark' | 'light'): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('user_preferences')
    .upsert({ user_id: userId, theme }, { onConflict: 'user_id' })
  if (error) console.error('[Supabase] Error upserting preferences:', error)
}

// ============================================================
// TIPOS PARA SINCRONIZACIÓN
// ============================================================

export type SyncStatus = 'synced' | 'pending' | 'error' | 'offline'

export interface SyncState {
  status: SyncStatus
  lastSyncedAt: string | null
  pendingCount: number
  error: string | null
}

// ============================================================
// VERIFICACIÓN DE CONEXIÓN
// ============================================================

export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await getSupabaseClient().from('profiles').select('id').limit(1)
    return !error
  } catch {
    return false
  }
}