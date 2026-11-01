import { useState } from 'react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { Button } from '../ui/Button'
import { recommend, type Goal, type ActivityLevel, type StrengthLevel, type CardioActivity, type Sex } from '../../lib/nutritionRecommendation'

interface OnboardingData {
  name: string
  weightKg: number
  heightCm: number
  age: number
  sex: Sex
  goal: Goal
  activityLevel: ActivityLevel
  stepsPerDay: number | null
  strengthDaysPerWeek: number
  strengthSessionMinutes: number
  strengthLevel: StrengthLevel
  cardio: CardioActivity[]
  hasDiet: boolean
  manualCalories: number
  manualProtein: number
  manualCarbs: number
  manualFat: number
}

interface Props {
  initialName?: string
  onComplete: (data: OnboardingData, recommended: ReturnType<typeof recommend> | null) => void
  onSkip?: () => void
}

const GOALS: { value: Goal; label: string; desc: string }[] = [
  { value: 'lose_fat', label: 'Perder grasa', desc: 'Déficit moderado y sostenible.' },
  { value: 'gain_muscle', label: 'Ganar masa muscular', desc: 'Superávit moderado.' },
  { value: 'recomposition', label: 'Recomposición', desc: 'Perder grasa y ganar músculo a la vez.' },
  { value: 'maintain', label: 'Mantener peso', desc: 'Estabilidad energética.' },
  { value: 'performance', label: 'Rendimiento deportivo', desc: 'Energía para rendir y recuperar.' },
  { value: 'other', label: 'Otro objetivo', desc: 'Mantenimiento general.' },
]

const ACTIVITIES: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'Muy sedentaria' },
  { value: 'light', label: 'Poco activa' },
  { value: 'moderate', label: 'Moderadamente activa' },
  { value: 'active', label: 'Muy activa' },
  { value: 'very_active', label: 'Trabajo físico intenso' },
]

const CARDIO_OPTIONS = ['Caminar', 'Correr', 'Ciclismo', 'Cinta de correr', 'Escaladora', 'Natación', 'Pádel', 'Tenis', 'Fútbol', 'Baloncesto', 'Otro']

export function OnboardingWizard({ initialName = '', onComplete, onSkip }: Props) {
  const [step, setStep] = useState(1)
  const totalSteps = 7
  const [data, setData] = useState<OnboardingData>({
    name: initialName,
    weightKg: 70,
    heightCm: 170,
    age: 30,
    sex: 'unknown',
    goal: 'maintain',
    activityLevel: 'moderate',
    stepsPerDay: null,
    strengthDaysPerWeek: 3,
    strengthSessionMinutes: 60,
    strengthLevel: 'beginner',
    cardio: [],
    hasDiet: false,
    manualCalories: 2000,
    manualProtein: 150,
    manualCarbs: 200,
    manualFat: 70,
  })

  const recommended = data.hasDiet ? null : recommend({
    weightKg: data.weightKg,
    heightCm: data.heightCm,
    age: data.age,
    sex: data.sex,
    goal: data.goal,
    activityLevel: data.activityLevel,
    stepsPerDay: data.stepsPerDay,
    strengthDaysPerWeek: data.strengthDaysPerWeek,
    strengthSessionMinutes: data.strengthSessionMinutes,
    strengthLevel: data.strengthLevel === 'none' ? 'none' : data.strengthLevel,
    cardio: data.cardio,
    isMinor: data.age < 18,
  })

  const update = (patch: Partial<OnboardingData>) => setData((d) => ({ ...d, ...patch }))

  const canNext = () => {
    if (step === 1) return data.name.trim().length > 0 && data.weightKg > 0 && data.heightCm > 0 && data.age > 0 && data.age < 120
    return true
  }

  const next = () => { if (canNext() && step < totalSteps) setStep(step + 1) }
  const prev = () => { if (step > 1) setStep(step - 1) }

  const finish = () => {
    onComplete(data, recommended)
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="card max-w-xl w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-faint">Paso {step} de {totalSteps}</p>
          {onSkip && <button onClick={onSkip} className="text-xs text-faint hover:text-fg">Saltar</button>}
        </div>
        <div className="h-1.5 w-full rounded-full bg-line overflow-hidden">
          <div className="h-full bg-lime-400 transition-all" style={{ width: `${(step / totalSteps) * 100}%` }} />
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-fg">Datos personales</h2>
            <div>
              <label className="label">Nombre</label>
              <input className="input" value={data.name || ''} onChange={(e) => update({ name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Peso (kg)</label>
                <input type="number" className="input tabular" value={data.weightKg || ''} onChange={(e) => update({ weightKg: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })} />
              </div>
              <div>
                <label className="label">Altura (cm)</label>
                <input type="number" className="input tabular" value={data.heightCm || ''} onChange={(e) => update({ heightCm: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Edad</label>
                <input type="number" className="input tabular" value={data.age || ''} onChange={(e) => update({ age: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })} />
              </div>
              <div>
                <label className="label">Sexo fisiológico</label>
                <select className="input" value={data.sex || ''} onChange={(e) => update({ sex: e.target.value as Sex })}>
                  <option value="unknown">Prefiero no indicar</option>
                  <option value="male">Hombre</option>
                  <option value="female">Mujer</option>
                </select>
              </div>
            </div>
            {data.sex === 'unknown' && <p className="text-[10px] text-amber-400">La estimación energética será menos precisa.</p>}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-fg">Objetivo físico</h2>
            <div className="space-y-2">
              {GOALS.map((g) => (
                <button key={g.value} type="button" onClick={() => update({ goal: g.value })} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${data.goal === g.value ? 'border-lime-500/50 bg-lime-500/10' : 'border-line bg-raised/60'}`}>
                  <div>
                    <p className="text-sm font-medium text-fg">{g.label}</p>
                    <p className="text-[10px] text-faint">{g.desc}</p>
                  </div>
                  {data.goal === g.value && <Check className="h-4 w-4 text-accent" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-fg">Actividad diaria</h2>
            <div>
              <label className="label">Actividad habitual</label>
              <select className="input" value={data.activityLevel || ''} onChange={(e) => update({ activityLevel: e.target.value as ActivityLevel })}>
                {ACTIVITIES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Pasos diarios (opcional)</label>
              <input type="number" className="input tabular" placeholder="No lo sé" value={data.stepsPerDay ?? ''} onChange={(e) => update({ stepsPerDay: e.target.value ? e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) : null })} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-fg">Entrenamiento de fuerza</h2>
            <div>
              <label className="label">Días por semana</label>
              <input type="number" min="0" max="7" className="input tabular" value={data.strengthDaysPerWeek || ''} onChange={(e) => update({ strengthDaysPerWeek: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })} />
            </div>
            <div>
              <label className="label">Duración por sesión (min)</label>
              <input type="number" min="0" className="input tabular" value={data.strengthSessionMinutes || ''} onChange={(e) => update({ strengthSessionMinutes: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })} />
            </div>
            <div>
              <label className="label">Nivel</label>
              <select className="input" value={data.strengthLevel || ''} onChange={(e) => update({ strengthLevel: e.target.value as StrengthLevel })}>
                <option value="none">No entreno fuerza</option>
                <option value="beginner">Principiante</option>
                <option value="intermediate">Intermedio</option>
                <option value="advanced">Avanzado</option>
              </select>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-fg">Cardio y deportes</h2>
            <div className="flex flex-wrap gap-2">
              {CARDIO_OPTIONS.map((opt) => {
                const selected = data.cardio.some((c) => c.type === opt)
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      if (selected) update({ cardio: data.cardio.filter((c) => c.type !== opt) })
                      else update({ cardio: [...data.cardio, { type: opt, daysPerWeek: 2, durationMin: 30, intensity: 'moderate' }] })
                    }}
                    className={`chip transition ${selected ? 'border-lime-500/50 text-accent' : ''}`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
            {data.cardio.map((c, idx) => (
              <div key={c.type} className="rounded-xl border border-line bg-raised/50 p-3 space-y-2">
                <p className="text-xs font-medium text-fg">{c.type}</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="label text-[10px]">Días/sem</label>
                    <input type="number" min="1" max="7" className="input tabular text-xs" value={c.daysPerWeek || ''} onChange={(e) => {
                      const next = [...data.cardio]; next[idx] = { ...c, daysPerWeek: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) }; update({ cardio: next })
                    }} />
                  </div>
                  <div>
                    <label className="label text-[10px]">Min/sesión</label>
                    <input type="number" min="5" className="input tabular text-xs" value={c.durationMin || ''} onChange={(e) => {
                      const next = [...data.cardio]; next[idx] = { ...c, durationMin: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) }; update({ cardio: next })
                    }} />
                  </div>
                  <div>
                    <label className="label text-[10px]">Intensidad</label>
                    <select className="input text-xs" value={c.intensity || ''} onChange={(e) => {
                      const next = [...data.cardio]; next[idx] = { ...c, intensity: e.target.value as CardioActivity['intensity'] }; update({ cardio: next })
                    }}>
                      <option value="low">Baja</option>
                      <option value="moderate">Moderada</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-fg">Situación nutricional</h2>
            <p className="text-xs text-muted">¿Tienes una dieta u objetivos nutricionales establecidos actualmente?</p>
            <div className="space-y-2">
              <button type="button" onClick={() => update({ hasDiet: true })} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${data.hasDiet ? 'border-lime-500/50 bg-lime-500/10' : 'border-line bg-raised/60'}`}>
                <span className="text-sm font-medium text-fg">Sí, tengo una dieta y conozco mis objetivos diarios</span>
              </button>
              <button type="button" onClick={() => update({ hasDiet: false })} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${!data.hasDiet ? 'border-lime-500/50 bg-lime-500/10' : 'border-line bg-raised/60'}`}>
                <span className="text-sm font-medium text-fg">No, quiero que GymProgress me recomiende unos objetivos</span>
              </button>
            </div>
            {data.hasDiet && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Calorías (kcal)</label>
                  <input type="number" className="input tabular" value={data.manualCalories || ''} onChange={(e) => update({ manualCalories: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })} />
                </div>
                <div>
                  <label className="label">Proteínas (g)</label>
                  <input type="number" className="input tabular" value={data.manualProtein || ''} onChange={(e) => update({ manualProtein: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })} />
                </div>
                <div>
                  <label className="label">Carbohidratos (g)</label>
                  <input type="number" className="input tabular" value={data.manualCarbs || ''} onChange={(e) => update({ manualCarbs: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })} />
                </div>
                <div>
                  <label className="label">Grasas (g)</label>
                  <input type="number" className="input tabular" value={data.manualFat || ''} onChange={(e) => update({ manualFat: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })} />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 7 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-fg">Tus objetivos nutricionales {data.hasDiet ? 'introducidos' : 'recomendados'}</h2>
            {data.hasDiet ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="card p-3 text-center"><p className="text-[10px] text-faint">Calorías</p><p className="text-lg font-semibold tabular text-fg">{data.manualCalories} kcal</p></div>
                <div className="card p-3 text-center"><p className="text-[10px] text-faint">Proteínas</p><p className="text-lg font-semibold tabular text-protein">{data.manualProtein} g</p></div>
                <div className="card p-3 text-center"><p className="text-[10px] text-faint">Carbohidratos</p><p className="text-lg font-semibold tabular text-carbs">{data.manualCarbs} g</p></div>
                <div className="card p-3 text-center"><p className="text-[10px] text-faint">Grasas</p><p className="text-lg font-semibold tabular text-fat">{data.manualFat} g</p></div>
              </div>
            ) : recommended ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="card p-3 text-center"><p className="text-[10px] text-faint">Calorías</p><p className="text-lg font-semibold tabular text-fg">{recommended.calories} kcal</p></div>
                  <div className="card p-3 text-center"><p className="text-[10px] text-faint">Proteínas</p><p className="text-lg font-semibold tabular text-protein">{recommended.protein} g</p></div>
                  <div className="card p-3 text-center"><p className="text-[10px] text-faint">Carbohidratos</p><p className="text-lg font-semibold tabular text-carbs">{recommended.carbs} g</p></div>
                  <div className="card p-3 text-center"><p className="text-[10px] text-faint">Grasas</p><p className="text-lg font-semibold tabular text-fat">{recommended.fat} g</p></div>
                </div>
                {recommended.warnings.length > 0 && (
                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-400">
                    {recommended.warnings.map((w, i) => <p key={i}>{w}</p>)}
                  </div>
                )}
                <div className="rounded-xl border border-line bg-raised/50 p-3 text-[10px] text-faint space-y-1">
                  {recommended.explanation.map((e, i) => <p key={i}>{e}</p>)}
                </div>
              </>
            ) : null}
            <p className="text-[10px] text-faint">Estos valores son iniciales y ajustables desde Ajustes.</p>
          </div>
        )}

        <div className="flex justify-between gap-2 pt-2">
          <Button variant="ghost" onClick={prev} disabled={step === 1}>
            <ChevronLeft className="h-4 w-4" /> Atrás
          </Button>
          {step < totalSteps ? (
            <Button onClick={next} disabled={!canNext()}>Siguiente <ChevronRight className="h-4 w-4" /></Button>
          ) : (
            <Button onClick={finish}>Aceptar y empezar</Button>
          )}
        </div>
      </div>
    </div>
  )
}
