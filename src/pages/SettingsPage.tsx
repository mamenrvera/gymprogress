import { useEffect, useState } from 'react'
import {
  Moon,
  Sun,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { cn } from '../lib/cn'
import { formatGrams, formatKcal } from '../lib/format'
import { recommend, type Goal as RecGoal, type ActivityLevel, type StrengthLevel, type CardioActivity, type Sex } from '../lib/nutritionRecommendation'


const GOAL_OPTIONS: { value: RecGoal; label: string }[] = [
  { value: 'lose_fat', label: 'Perder grasa' },
  { value: 'gain_muscle', label: 'Ganar masa muscular' },
  { value: 'recomposition', label: 'Perder grasa y ganar músculo' },
  { value: 'maintain', label: 'Mantener peso' },
  { value: 'performance', label: 'Mejorar rendimiento' },
  { value: 'other', label: 'Otro objetivo' },
]

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'Muy sedentaria' },
  { value: 'light', label: 'Poco activa' },
  { value: 'moderate', label: 'Moderadamente activa' },
  { value: 'active', label: 'Muy activa' },
  { value: 'very_active', label: 'Trabajo físico intenso' },
]

const CARDIO_OPTIONS = ['Caminar', 'Correr', 'Ciclismo', 'Cinta de correr', 'Escaladora', 'Natación', 'Pádel', 'Tenis', 'Fútbol', 'Baloncesto', 'Otro']

export function SettingsPage() {
  const { settings, theme, changeTheme, notify, refreshSettings } = useApp()
  const { profile, updateProfile, updateTargets } = useAuth()
  const [savingSection, setSavingSection] = useState<string | null>(null)
  const [recalcPreview, setRecalcPreview] = useState<ReturnType<typeof recommend> | null>(null)
  const [showRecalc, setShowRecalc] = useState(false)

  // Personal data form (local state)
  const [personal, setPersonal] = useState({
    name: profile?.name || settings?.profile.name || '',
    weightKg: profile?.initial_weight_kg ?? settings?.profile.initialWeightKg ?? 63,
    heightCm: profile?.height_cm ?? settings?.profile.heightCm ?? 163,
    age: profile?.age ?? 30,
    sex: (profile?.sex ?? 'unknown') as Sex,
    goal: (profile?.goal ?? settings?.profile.goal ?? 'maintain') as RecGoal,
  })
  const [activity, setActivity] = useState({
    activityLevel: (profile?.activity_level ?? 'moderate') as ActivityLevel,
    stepsPerDay: profile?.steps_per_day ?? null,
    strengthDays: profile?.strength_days_per_week ?? 3,
    strengthMinutes: profile?.strength_session_minutes ?? 60,
    strengthLevel: (profile?.strength_level ?? 'beginner') as StrengthLevel,
  })
  const [cardio, setCardio] = useState<CardioActivity[]>(
    (profile?.cardio_activities as CardioActivity[] | null) ?? [],
  )
  const [targetOrigin, setTargetOrigin] = useState<'manual' | 'recommended'>(
    (profile?.target_origin as 'manual' | 'recommended') ?? 'manual',
  )
  const [manualTargets, setManualTargets] = useState({ calories: settings?.targets.calories ?? 1400, protein: settings?.targets.protein ?? 125, fat: settings?.targets.fat ?? 40, carbs: settings?.targets.carbs ?? 90, carbMin: settings?.targets.carbMin ?? 85, carbMax: settings?.targets.carbMax ?? 95 })
  const [manualError, setManualError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    setPersonal({
      name: profile.name || '',
      weightKg: profile.initial_weight_kg ?? 63,
      heightCm: profile.height_cm ?? 163,
      age: profile.age ?? 30,
      sex: (profile.sex ?? 'unknown') as Sex,
      goal: (profile.goal ?? 'maintain') as RecGoal,
    })
    setActivity({
      activityLevel: (profile.activity_level ?? 'moderate') as ActivityLevel,
      stepsPerDay: profile.steps_per_day ?? null,
      strengthDays: profile.strength_days_per_week ?? 3,
      strengthMinutes: profile.strength_session_minutes ?? 60,
      strengthLevel: (profile.strength_level ?? 'beginner') as StrengthLevel,
    })
    setCardio((profile.cardio_activities as CardioActivity[] | null) ?? [])
    setTargetOrigin((profile.target_origin as 'manual' | 'recommended') ?? 'manual')
  }, [profile])

  useEffect(() => {
    if (!settings) return
    setManualTargets({ calories: settings.targets.calories, protein: settings.targets.protein, fat: settings.targets.fat, carbs: settings.targets.carbs, carbMin: settings.targets.carbMin, carbMax: settings.targets.carbMax })
  }, [settings?.updatedAt])



  const savePersonal = async () => {
    setSavingSection('personal')
    try {
      await updateProfile({
        name: personal.name,
        initial_weight_kg: personal.weightKg,
        height_cm: personal.heightCm,
        goal: personal.goal,
        age: personal.age,
        sex: personal.sex,
      })
      notify('Datos personales guardados')
    } catch {
      notify('No se pudieron guardar los datos personales', 'error')
    } finally {
      setSavingSection(null)
    }
  }

  const saveActivity = async () => {
    setSavingSection('activity')
    try {
      await updateProfile({
        activity_level: activity.activityLevel,
        steps_per_day: activity.stepsPerDay,
        strength_days_per_week: activity.strengthDays,
        strength_session_minutes: activity.strengthMinutes,
        strength_level: activity.strengthLevel,
      })
      notify('Actividad guardada')
    } catch {
      notify('No se pudo guardar la actividad', 'error')
    } finally {
      setSavingSection(null)
    }
  }

  const saveCardio = async () => {
    setSavingSection('cardio')
    try {
      await updateProfile({ cardio_activities: cardio })
      notify('Cardio y deportes guardados')
    } catch {
      notify('No se pudieron guardar los deportes', 'error')
    } finally {
      setSavingSection(null)
    }
  }

  const saveTargetOrigin = async (origin: 'manual' | 'recommended') => {
    setSavingSection('origin')
    try {
      await updateProfile({ target_origin: origin })
      setTargetOrigin(origin)
      notify('Preferencia guardada')
    } catch {
      notify('No se pudo guardar la preferencia', 'error')
    } finally {
      setSavingSection(null)
    }
  }

  const runRecalc = () => {
    const rec = recommend({
      weightKg: personal.weightKg,
      heightCm: personal.heightCm,
      age: personal.age,
      sex: personal.sex,
      goal: personal.goal as RecGoal,
      activityLevel: activity.activityLevel,
      stepsPerDay: activity.stepsPerDay,
      strengthDaysPerWeek: activity.strengthDays,
      strengthSessionMinutes: activity.strengthMinutes,
      strengthLevel: activity.strengthLevel,
      cardio,
    })
    setRecalcPreview(rec)
    setShowRecalc(true)
  }

  const applyRecalc = async () => {
    if (!recalcPreview) return
    setSavingSection('recalc')
    try {
      await updateTargets({
        calories: recalcPreview.calories,
        protein: recalcPreview.protein,
        fat: recalcPreview.fat,
        carbs: recalcPreview.carbs,
        carb_min: Math.round(recalcPreview.carbs * 0.9),
        carb_max: Math.round(recalcPreview.carbs * 1.1),
      })
      await updateProfile({ target_origin: 'recommended' })
      await refreshSettings()
      setTargetOrigin('recommended')
      setShowRecalc(false)
      setRecalcPreview(null)
      notify('Objetivos actualizados')
    } catch {
      notify('No se pudieron actualizar los objetivos', 'error')
    } finally {
      setSavingSection(null)
    }
  }





  if (!settings) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-12 w-52" />
        <div className="skeleton h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader
        eyebrow="Configuración"
        title="Ajustes"
        subtitle="Tu perfil, tus objetivos y tus datos."

      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {/* Apariencia (existente) */}
          <section className="card-pad">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/10 text-accent">
                {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </span>
              <div>
                <h2 className="text-sm font-semibold text-fg">Apariencia</h2>
                <p className="text-[10px] text-faint">El tema se guarda al instante.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" aria-pressed={theme === 'dark'} onClick={() => void changeTheme('dark')} className={cn('relative overflow-hidden rounded-xl border p-3 text-left transition', theme === 'dark' ? 'border-lime-500/50 ring-1 ring-lime-500/20' : 'border-line hover:border-ink-500/60')}>
                <div className="mb-2 flex h-14 items-end gap-1 rounded-lg border border-ink-700 bg-ink-950 p-2">
                  <span className="h-3 w-3 rounded-full bg-lime-400" />
                  <span className="h-6 flex-1 rounded bg-ink-700" />
                </div>
                <span className="flex items-center gap-1.5 text-xs font-medium text-fg"><Moon className="h-3.5 w-3.5" /> Oscuro</span>
              </button>
              <button type="button" aria-pressed={theme === 'light'} onClick={() => void changeTheme('light')} className={cn('relative overflow-hidden rounded-xl border p-3 text-left transition', theme === 'light' ? 'border-lime-500/50 ring-1 ring-lime-500/20' : 'border-line hover:border-ink-500/60')}>
                <div className="mb-2 flex h-14 items-end gap-1 rounded-lg border border-slate-200 bg-slate-100 p-2">
                  <span className="h-3 w-3 rounded-full bg-lime-500" />
                  <span className="h-6 flex-1 rounded bg-white" />
                </div>
                <span className="flex items-center gap-1.5 text-xs font-medium text-fg"><Sun className="h-3.5 w-3.5" /> Claro</span>
              </button>
            </div>
          </section>

          {/* DATOS PERSONALES (onboarding) */}
          <section className="card-pad">
            <h2 className="text-sm font-semibold text-fg mb-3">Datos personales</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Nombre</label>
                <input className="input" value={personal.name || ''} onChange={(e) => setPersonal({ ...personal, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Peso actual (kg)</label>
                <input type="number" className="input tabular" value={personal.weightKg || ''} onChange={(e) => setPersonal({ ...personal, weightKg: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })} />
              </div>
              <div>
                <label className="label">Altura (cm)</label>
                <input type="number" className="input tabular" value={personal.heightCm || ''} onChange={(e) => setPersonal({ ...personal, heightCm: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })} />
              </div>
              <div>
                <label className="label">Edad</label>
                <input type="number" className="input tabular" value={personal.age || ''} onChange={(e) => setPersonal({ ...personal, age: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Sexo</label>
                <select className="input" value={personal.sex || ''} onChange={(e) => setPersonal({ ...personal, sex: e.target.value as Sex })}>
                  <option value="unknown">Prefiero no indicar</option>
                  <option value="male">Hombre</option>
                  <option value="female">Mujer</option>
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="label">Objetivo físico</label>
              <select className="input" value={personal.goal || ''} onChange={(e) => setPersonal({ ...personal, goal: e.target.value as RecGoal })}>
                {GOAL_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <Button size="sm" className="mt-3" onClick={savePersonal} loading={savingSection === 'personal'}>Guardar datos personales</Button>
          </section>

          {/* ACTIVIDAD DIARIA */}
          <section className="card-pad">
            <h2 className="text-sm font-semibold text-fg mb-3">Actividad diaria</h2>
            <div>
              <label className="label">Nivel de actividad</label>
              <select className="input" value={activity.activityLevel || ''} onChange={(e) => setActivity({ ...activity, activityLevel: e.target.value as ActivityLevel })}>
                {ACTIVITY_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div className="mt-3">
              <label className="label">Pasos diarios (opcional)</label>
              <input type="number" className="input tabular" value={activity.stepsPerDay ?? ''} onChange={(e) => setActivity({ ...activity, stepsPerDay: e.target.value ? e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) : null })} />
            </div>
            <div className="mt-3">
              <label className="label">Experiencia entrenando</label>
              <select className="input" value={activity.strengthLevel || ''} onChange={(e) => setActivity({ ...activity, strengthLevel: e.target.value as StrengthLevel })}>
                <option value="none">No entreno fuerza</option>
                <option value="beginner">Principiante</option>
                <option value="intermediate">Intermedio</option>
                <option value="advanced">Avanzado</option>
              </select>
            </div>
            <Button size="sm" className="mt-3" onClick={saveActivity} loading={savingSection === 'activity'}>Guardar actividad</Button>
          </section>

          {/* ENTRENAMIENTO */}
          <section className="card-pad">
            <h2 className="text-sm font-semibold text-fg mb-3">Entrenamiento</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Días de fuerza / semana</label>
                <input type="number" min="0" max="7" className="input tabular" value={activity.strengthDays || ''} onChange={(e) => setActivity({ ...activity, strengthDays: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })} />
              </div>
              <div>
                <label className="label">Duración sesión (min)</label>
                <input type="number" min="0" className="input tabular" value={activity.strengthMinutes || ''} onChange={(e) => setActivity({ ...activity, strengthMinutes: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })} />
              </div>
            </div>
            <Button size="sm" className="mt-3" onClick={saveActivity} loading={savingSection === 'activity'}>Guardar entrenamiento</Button>
          </section>

          {/* CARDIO Y DEPORTES */}
          <section className="card-pad">
            <h2 className="text-sm font-semibold text-fg mb-3">Cardio y deportes</h2>
            <div className="flex flex-wrap gap-2">
              {CARDIO_OPTIONS.map((opt) => {
                const selected = cardio.some((c) => c.type === opt)
                return (
                  <button key={opt} type="button" onClick={() => {
                    if (selected) setCardio(cardio.filter((c) => c.type !== opt))
                    else setCardio([...cardio, { type: opt, daysPerWeek: 2, durationMin: 30, intensity: 'moderate' }])
                  }} className={`chip transition ${selected ? 'border-lime-500/50 text-accent' : ''}`}>
                    {opt}
                  </button>
                )
              })}
            </div>
            {cardio.map((c, idx) => (
              <div key={c.type} className="mt-3 rounded-xl border border-line bg-raised/50 p-3 space-y-2">
                <p className="text-xs font-medium text-fg">{c.type}</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="label text-[10px]">Días/sem</label>
                    <input type="number" min="1" max="7" className="input tabular text-xs" value={c.daysPerWeek || ''} onChange={(e) => { const next = [...cardio]; next[idx] = { ...c, daysPerWeek: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) }; setCardio(next) }} />
                  </div>
                  <div>
                    <label className="label text-[10px]">Min/sesión</label>
                    <input type="number" min="5" className="input tabular text-xs" value={c.durationMin || ''} onChange={(e) => { const next = [...cardio]; next[idx] = { ...c, durationMin: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) }; setCardio(next) }} />
                  </div>
                  <div>
                    <label className="label text-[10px]">Intensidad</label>
                    <select className="input text-xs" value={c.intensity || ''} onChange={(e) => { const next = [...cardio]; next[idx] = { ...c, intensity: e.target.value as CardioActivity['intensity'] }; setCardio(next) }}>
                      <option value="low">Baja</option>
                      <option value="moderate">Moderada</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
            <Button size="sm" className="mt-3" onClick={saveCardio} loading={savingSection === 'cardio'}>Guardar cardio y deportes</Button>
          </section>

          {/* NUTRICIÓN: preferencia y objetivos */}
          <section className="card-pad">
            <h2 className="text-sm font-semibold text-fg mb-3">Nutrición</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => saveTargetOrigin('manual')} className={`chip transition ${targetOrigin === 'manual' ? 'border-lime-500/50 text-accent' : ''}`}>Objetivos propios</button>
              <button type="button" onClick={() => saveTargetOrigin('recommended')} className={`chip transition ${targetOrigin === 'recommended' ? 'border-lime-500/50 text-accent' : ''}`}>Objetivos recomendados</button>
            </div>
            <p className="mt-2 text-[10px] text-faint">
              {targetOrigin === 'manual' ? 'Estás usando tus propios objetivos nutricionales. Puedes editarlos manualmente.' : 'GymProgress puede recalcular tus objetivos a partir de tus datos.'}
            </p>

            {targetOrigin === 'manual' ? (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="label">Calorías (kcal)</label>
                    <input type="number" min="0" className="input tabular" value={manualTargets.calories} onChange={(e) => setManualTargets({ ...manualTargets, calories: Math.max(0, Number(e.target.value) || 0) })} />
                  </div>
                  <div>
                    <label className="label">Proteínas (g)</label>
                    <input type="number" min="0" className="input tabular" value={manualTargets.protein} onChange={(e) => setManualTargets({ ...manualTargets, protein: Math.max(0, Number(e.target.value) || 0) })} />
                  </div>
                  <div>
                    <label className="label">Grasas (g)</label>
                    <input type="number" min="0" className="input tabular" value={manualTargets.fat} onChange={(e) => setManualTargets({ ...manualTargets, fat: Math.max(0, Number(e.target.value) || 0) })} />
                  </div>
                  <div>
                    <label className="label">Carbohidratos (g)</label>
                    <input type="number" min="0" className="input tabular" value={manualTargets.carbs} onChange={(e) => setManualTargets({ ...manualTargets, carbs: Math.max(0, Number(e.target.value) || 0) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
                  <div>
                    <label className="label">Rango carbos mínimo</label>
                    <input type="number" min="0" className="input tabular" value={manualTargets.carbMin} onChange={(e) => setManualTargets({ ...manualTargets, carbMin: Math.max(0, Number(e.target.value) || 0) })} />
                  </div>
                  <div>
                    <label className="label">Rango carbos máximo</label>
                    <input type="number" min="0" className="input tabular" value={manualTargets.carbMax} onChange={(e) => setManualTargets({ ...manualTargets, carbMax: Math.max(0, Number(e.target.value) || 0) })} />
                  </div>
                </div>
                {manualError && <p className="text-xs text-rose-400">{manualError}</p>}
                <div className="flex gap-2">
                  <Button size="sm" onClick={async () => {
                    setManualError(null)
                    if (manualTargets.calories <= 0) { setManualError('Las calorías deben ser mayores que 0'); return }
                    setSavingSection('manual')
                    try {
                      await updateTargets({ calories: manualTargets.calories, protein: manualTargets.protein, fat: manualTargets.fat, carbs: manualTargets.carbs, carb_min: manualTargets.carbMin, carb_max: manualTargets.carbMax })
                      await updateProfile({ target_origin: 'manual' })
                      setTargetOrigin('manual')
                      await refreshSettings()
                      notify('Objetivos guardados')
                    } catch (e) {
                      setManualError(e instanceof Error ? e.message : 'No se pudieron guardar los objetivos')
                    } finally {
                      setSavingSection(null)
                    }
                  }} loading={savingSection === 'manual'}>Guardar objetivos</Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    if (settings) setManualTargets({ calories: settings.targets.calories, protein: settings.targets.protein, fat: settings.targets.fat, carbs: settings.targets.carbs, carbMin: settings.targets.carbMin, carbMax: settings.targets.carbMax })
                    setManualError(null)
                  }}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <Button size="sm" onClick={runRecalc} loading={savingSection === 'recalc'}>Recalcular mis objetivos</Button>
                {showRecalc && recalcPreview && (
                  <div className="mt-3 rounded-xl border border-line bg-raised/50 p-3 space-y-2">
                    <p className="text-xs font-semibold text-fg">Propuesta de objetivos</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="card p-2 text-center"><p className="text-[10px] text-faint">Calorías</p><p className="font-semibold tabular text-fg">{recalcPreview.calories} kcal</p></div>
                      <div className="card p-2 text-center"><p className="text-[10px] text-faint">Proteínas</p><p className="font-semibold tabular text-protein">{recalcPreview.protein} g</p></div>
                      <div className="card p-2 text-center"><p className="text-[10px] text-faint">Carbohidratos</p><p className="font-semibold tabular text-carbs">{recalcPreview.carbs} g</p></div>
                      <div className="card p-2 text-center"><p className="text-[10px] text-faint">Grasas</p><p className="font-semibold tabular text-fat">{recalcPreview.fat} g</p></div>
                    </div>
                    {recalcPreview.warnings.length > 0 && (
                      <div className="text-xs text-amber-400">{recalcPreview.warnings.map((w, i) => <p key={i}>{w}</p>)}</div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={applyRecalc} loading={savingSection === 'recalc'}>Aceptar y guardar</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setShowRecalc(false); setRecalcPreview(null) }}>Cancelar</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="card-pad">
            <h2 className="text-sm font-semibold text-fg">Resumen actual</h2>
            <p className="mt-0.5 text-[10px] text-faint">Objetivos guardados</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-line bg-raised/60 px-2.5 py-2">
                <p className="text-[9px] uppercase text-faint">Calorías</p>
                <p className="mt-0.5 text-sm font-semibold tabular text-fg">{formatKcal(settings.targets.calories)}</p>
              </div>
              <div className="rounded-lg border border-line bg-raised/60 px-2.5 py-2">
                <p className="text-[9px] uppercase text-faint">Proteína</p>
                <p className="mt-0.5 text-sm font-semibold tabular text-protein">{formatGrams(settings.targets.protein)} g</p>
              </div>
              <div className="rounded-lg border border-line bg-raised/60 px-2.5 py-2">
                <p className="text-[9px] uppercase text-faint">Grasas</p>
                <p className="mt-0.5 text-sm font-semibold tabular text-fat">{formatGrams(settings.targets.fat)} g</p>
              </div>
              <div className="rounded-lg border border-line bg-raised/60 px-2.5 py-2">
                <p className="text-[9px] uppercase text-faint">Carbohidratos</p>
                <p className="mt-0.5 text-sm font-semibold tabular text-carbs">{formatGrams(settings.targets.carbs)} g</p>
              </div>
            </div>
          </section>

                  </aside>
      </div>
    </div>
  )
}
