import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { supabase, type User, type Session, type Profile, type Targets } from '../lib/supabase'
import { applyTheme } from '../lib/theme'

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated'

export interface AuthContextValue {
  // Estado
  user: User | null
  session: Session | null
  profile: Profile | null
  targets: Targets | null
  status: AuthStatus
  error: string | null
  isPasswordRecovery: boolean

  // Acciones de autenticación
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>

  // Acciones de perfil
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  updateTargets: (updates: Partial<Targets>) => Promise<void>

  // Utilidades
  refreshSession: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [targets, setTargets] = useState<Targets | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
  // AuthContext is independent of AppContext to avoid circular dependency
  // Theme is applied directly; notifications are logged to console

  // Limpiar error
  const clearError = useCallback(() => setError(null), [])

  // Cargar perfil y targets del usuario
  const loadUserData = useCallback(async (userId: string) => {
    try {
      // Importar dinámicamente para evitar dependencia circular
      const { fetchProfile, fetchTargets, fetchUserPreferences } = await import('../lib/supabase')
      
      const [profileData, targetsData, preferences] = await Promise.all([
        fetchProfile(userId),
        fetchTargets(userId),
        fetchUserPreferences(userId),
      ])

      if (profileData) setProfile(profileData)
      if (targetsData) setTargets(targetsData)
      if (preferences?.theme) {
        // Apply theme directly
        applyTheme(preferences.theme)
        try { localStorage.setItem('gymprogress-theme', preferences.theme) } catch { /* ignore */ }
      }
    } catch (e) {
      console.error('[Auth] Error loading user data:', e)
    }
  }, [])

  // Inicializar sesión al montar
  useEffect(() => {
    let mounted = true

    async function initializeAuth() {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()

        if (!mounted) return

        // Detectar si estamos en flujo de recuperación de contraseña
        const isRecoveryUrl = typeof window !== 'undefined' &&
          window.location.pathname === '/reset-password' &&
          (window.location.search.includes('code=') || window.location.hash.includes('access_token'))

        if (initialSession?.user) {
          setSession(initialSession)
          setUser(initialSession.user)
          setStatus('authenticated')
          if (isRecoveryUrl) {
            setIsPasswordRecovery(true)
          }
          await loadUserData(initialSession.user.id)
        } else {
          setStatus('unauthenticated')
        }
      } catch (e) {
        console.error('[Auth] Error initializing auth:', e)
        if (mounted) {
          setStatus('unauthenticated')
          setError('Error al restaurar la sesión')
        }
      }
    }

    initializeAuth()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return

      console.log('[Auth] Auth state change:', event, newSession?.user?.id)

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true)
      }

      if (newSession?.user) {
        setSession(newSession)
        setUser(newSession.user)
        setStatus('authenticated')
        await loadUserData(newSession.user.id)
      } else {
        setSession(null)
        setUser(null)
        setProfile(null)
        setTargets(null)
        setStatus('unauthenticated')
        // Solo limpiar isPasswordRecovery si no hay sesión y no estamos en la página de reset
        if (typeof window !== 'undefined' && window.location.pathname !== '/reset-password') {
          setIsPasswordRecovery(false)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadUserData])

  // Acciones de autenticación
  const signUp = useCallback(async (email: string, password: string) => {
    setError(null)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      console.log('[Auth] Cuenta creada. Revisa tu correo para confirmar.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al crear la cuenta'
      setError(msg)
      console.error('[Auth]', msg)
      throw e
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      console.log('[Auth] Sesión iniciada correctamente')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Credenciales incorrectas'
      setError(msg)
      console.error('[Auth]', msg)
      throw e
    }
  }, [])

  const signOut = useCallback(async () => {
    setError(null)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      console.log('[Auth] Sesión cerrada')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cerrar sesión'
      setError(msg)
      console.error('[Auth]', msg)
      throw e
    }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    setError(null)
    try {
      // Importar getAppUrl dinámicamente para evitar dependencia circular
      const { getAppUrl } = await import('../lib/supabase')
      const appUrl = getAppUrl()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/reset-password`,
      })
      if (error) throw error
      console.log('[Auth] Se ha enviado un enlace de recuperación a tu correo')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al solicitar recuperación'
      setError(msg)
      console.error('[Auth]', msg)
      throw e
    }
  }, [])

  const updatePassword = useCallback(async (newPassword: string) => {
    setError(null)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setIsPasswordRecovery(false)
      console.log('[Auth] Contraseña actualizada')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al actualizar contraseña'
      setError(msg)
      console.error('[Auth]', msg)
      throw e
    }
  }, [])

  // Acciones de perfil
  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) return
    try {
      const { upsertProfile } = await import('../lib/supabase')
      const updated = await upsertProfile(user.id, updates)
      if (updated) setProfile(updated)
      console.log('[Auth] Perfil actualizado')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al actualizar perfil'
      setError(msg)
      console.error('[Auth]', msg)
      throw e
    }
  }, [user])

  const updateTargets = useCallback(async (updates: Partial<Targets>) => {
    if (!user) return
    try {
      const { upsertTargets } = await import('../lib/supabase')
      const updated = await upsertTargets(user.id, updates)
      if (updated) setTargets(updated)
      console.log('[Auth] Objetivos actualizados')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al actualizar objetivos'
      setError(msg)
      console.error('[Auth]', msg)
      throw e
    }
  }, [user])

  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      if (data.session) {
        setSession(data.session)
        setUser(data.session.user)
      }
    } catch (e) {
      console.error('[Auth] Error refreshing session:', e)
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    profile,
    targets,
    status,
    error,
    isPasswordRecovery,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    updateTargets,
    refreshSession,
    clearError,
  }), [
    user, session, profile, targets, status, error, isPasswordRecovery,
    signUp, signIn, signOut, resetPassword, updatePassword,
    updateProfile, updateTargets, refreshSession, clearError,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}

// Hook simplificado para componentes que solo necesitan saber si hay usuario
export function useUser(): User | null {
  return useAuth().user
}

export function useSession(): Session | null {
  return useAuth().session
}

export function useProfile(): Profile | null {
  return useAuth().profile
}

export function useTargets(): Targets | null {
  return useAuth().targets
}

export function useAuthStatus(): AuthStatus {
  return useAuth().status
}