import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertTriangle,
  Database,
  Download,
  HardDrive,
  Info,
  Moon,
  RotateCcw,
  Save,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  Upload,
  User,
  UtensilsCrossed,
} from 'lucide-react'
import { GOALS } from '../types'
import { settingsSchema, type SettingsFormValues } from '../lib/validators'
import { clearHistory, downloadBackup, getStorageInfo, importBackupFile, resetApplication } from '../lib/backup'
import { kcalFromMacros } from '../lib/calculations'
import { useApp } from '../context/AppContext'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { MacroEnergyNotice } from '../components/nutrition/NutritionSummary'
import { cn } from '../lib/cn'
import { formatGrams, formatKcal, formatNumber } from '../lib/format'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface StorageInfo {
  usedBytes?: number
  quotaBytes?: number
  persisted?: boolean
}

const DEFAULTS = {
  initialWeightKg: 63,
  heightCm: 163,
  goal: 'perder_grasa_ganar_musculo' as const,
  calories: 1400,
  protein: 125,
  fat: 40,
  carbs: 90,
  carbMin: 85,
  carbMax: 95,
}

function formatBytes(value?: number): string {
  if (!value || !Number.isFinite(value)) return '—'
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${formatNumber(value / (1024 * 1024), 1)} MB`
}

export function SettingsPage() {
  const { settings, theme, changeTheme, notify, updateSettings } = useApp()
  const [pendingImport, setPendingImport] = useState<File | undefined>(undefined)
  const [confirmClearHistory, setConfirmClearHistory] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [storage, setStorage] = useState<StorageInfo>({})
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() => {
    if (typeof window === 'undefined') return false
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
    return standalone || iosStandalone
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: settings?.profile.name ?? '',
      initialWeightKg: settings?.profile.initialWeightKg ?? 63,
      heightCm: settings?.profile.heightCm ?? 163,
      goal: settings?.profile.goal ?? 'perder_grasa_ganar_musculo',
      calories: settings?.targets.calories ?? 1400,
      protein: settings?.targets.protein ?? 125,
      fat: settings?.targets.fat ?? 40,
      carbs: settings?.targets.carbs ?? 90,
      carbMin: settings?.targets.carbMin ?? 85,
      carbMax: settings?.targets.carbMax ?? 95,
    },
  })

  useEffect(() => {
    if (!settings) return
    reset({
      name: settings.profile.name ?? '',
      initialWeightKg: settings.profile.initialWeightKg,
      heightCm: settings.profile.heightCm,
      goal: settings.profile.goal,
      calories: settings.targets.calories,
      protein: settings.targets.protein,
      fat: settings.targets.fat,
      carbs: settings.targets.carbs,
      carbMin: settings.targets.carbMin,
      carbMax: settings.targets.carbMax,
    })
  }, [settings?.updatedAt, reset, settings])

  useEffect(() => {
    void getStorageInfo().then(setStorage)
  }, [settings?.updatedAt])

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      setInstalled(true)
      setInstallEvent(null)
    }
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const values = watch()
  const protein = Number(values.protein) || 0
  const carbs = Number(values.carbs) || 0
  const fat = Number(values.fat) || 0
  const calories = Number(values.calories) || 0
  const carbMin = Number(values.carbMin) || 0
  const carbMax = Number(values.carbMax) || 0
  const macroKcal = kcalFromMacros(protein, carbs, fat)
  const carbOutOfRange = carbs > 0 && carbMax >= carbMin && (carbs < carbMin || carbs > carbMax)

  const onSubmit = handleSubmit(async (formValues) => {
    try {
      await updateSettings(formValues)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudieron guardar los ajustes', 'error')
    }
  })

  const handleExport = async () => {
    try {
      const filename = await downloadBackup()
      notify(`Copia de seguridad descargada: ${filename}`)
    } catch {
      notify('No se pudo crear la copia de seguridad', 'error')
    }
  }

  const handleFileSelected = (file?: File) => {
    if (!file) return
    setPendingImport(file)
  }

  const handleImport = async () => {
    if (!pendingImport) return
    try {
      await importBackupFile(pendingImport)
      notify('Copia importada correctamente. Tus datos se han sustituido.')
      setPendingImport(undefined)
      void getStorageInfo().then(setStorage)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo importar la copia', 'error')
    }
  }

  const handleClearHistory = async () => {
    try {
      await clearHistory()
      notify('Historial eliminado. Se conservan alimentos, ejercicios y ajustes.')
      setConfirmClearHistory(false)
    } catch {
      notify('No se pudo borrar el historial', 'error')
    }
  }

  const handleReset = async () => {
    try {
      await resetApplication()
      notify('Aplicación restablecida con los valores iniciales')
      setConfirmReset(false)
    } catch {
      notify('No se pudo restablecer la aplicación', 'error')
    }
  }

  const loadDefaults = () => {
    reset({
      ...getValues(),
      ...DEFAULTS,
    })
    notify('Valores iniciales cargados en el formulario. Pulsa «Guardar» para aplicarlos.', 'info')
  }

  const promptInstall = async () => {
    if (!installEvent) return
    try {
      await installEvent.prompt()
      const choice = await installEvent.userChoice
      if (choice.outcome === 'accepted') {
        setInstalled(true)
        notify('GymProgress instalada en tu dispositivo')
      }
      setInstallEvent(null)
    } catch {
      notify('No se pudo iniciar la instalación', 'error')
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
        subtitle="Tu perfil, tus objetivos y tus datos. Todo se guarda en este dispositivo."
        actions={
          <Button type="submit" form="settings-form" size="sm" loading={isSubmitting} disabled={!isDirty}>
            <Save className="h-4 w-4" />
            {isDirty ? 'Guardar cambios' : 'Sin cambios'}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <form id="settings-form" onSubmit={onSubmit} className="space-y-4" noValidate>
            <section className="card-pad">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/10 text-accent">
                  <User className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-fg">Perfil</h2>
                  <p className="text-[10px] text-faint">Datos de referencia para el IMC y los cálculos.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="settings-name">
                    Nombre
                  </label>
                  <input
                    id="settings-name"
                    className="input"
                    placeholder="Opcional, para el saludo de inicio"
                    {...register('name')}
                  />
                  {errors.name ? <p className="field-error">{errors.name.message}</p> : null}
                </div>
                <div>
                  <label className="label" htmlFor="settings-weight">
                    Peso inicial (kg)
                  </label>
                  <input
                    id="settings-weight"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="20"
                    max="400"
                    className={cn('input tabular', errors.initialWeightKg && 'input-error')}
                    {...register('initialWeightKg', { valueAsNumber: true })}
                  />
                  {errors.initialWeightKg ? <p className="field-error">{errors.initialWeightKg.message}</p> : null}
                </div>
                <div>
                  <label className="label" htmlFor="settings-height">
                    Altura (cm)
                  </label>
                  <input
                    id="settings-height"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="80"
                    max="250"
                    className={cn('input tabular', errors.heightCm && 'input-error')}
                    {...register('heightCm', { valueAsNumber: true })}
                  />
                  {errors.heightCm ? <p className="field-error">{errors.heightCm.message}</p> : null}
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="settings-goal">
                    Objetivo
                  </label>
                  <select id="settings-goal" className="input" {...register('goal')}>
                    {GOALS.map((goal) => (
                      <option key={goal.value} value={goal.value}>
                        {goal.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="card-pad">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/10 text-accent">
                    <UtensilsCrossed className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-fg">Objetivos nutricionales</h2>
                    <p className="text-[10px] text-faint">Cuatro metas independientes. No se recalculan entre sí.</p>
                  </div>
                </div>
                <button type="button" onClick={loadDefaults} className="btn-ghost px-2 py-1.5 text-[10px]">
                  <RotateCcw className="h-3 w-3" /> Valores iniciales
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="label" htmlFor="settings-calories">
                    Calorías / día
                  </label>
                  <input
                    id="settings-calories"
                    type="number"
                    inputMode="numeric"
                    step="10"
                    min="500"
                    max="8000"
                    className={cn('input tabular', errors.calories && 'input-error')}
                    {...register('calories', { valueAsNumber: true })}
                  />
                  {errors.calories ? <p className="field-error">{errors.calories.message}</p> : null}
                </div>
                <div>
                  <label className="label" htmlFor="settings-protein">
                    Proteína (g)
                  </label>
                  <input
                    id="settings-protein"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    max="500"
                    className={cn('input tabular', errors.protein && 'input-error')}
                    {...register('protein', { valueAsNumber: true })}
                  />
                  {errors.protein ? <p className="field-error">{errors.protein.message}</p> : null}
                </div>
                <div>
                  <label className="label" htmlFor="settings-fat">
                    Grasas (g)
                  </label>
                  <input
                    id="settings-fat"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    max="300"
                    className={cn('input tabular', errors.fat && 'input-error')}
                    {...register('fat', { valueAsNumber: true })}
                  />
                  {errors.fat ? <p className="field-error">{errors.fat.message}</p> : null}
                </div>
                <div>
                  <label className="label" htmlFor="settings-carbs">
                    Carbohidratos (g)
                  </label>
                  <input
                    id="settings-carbs"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    max="800"
                    className={cn('input tabular', errors.carbs && 'input-error')}
                    {...register('carbs', { valueAsNumber: true })}
                  />
                  {errors.carbs ? <p className="field-error">{errors.carbs.message}</p> : null}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-sm">
                <div>
                  <label className="label" htmlFor="settings-carb-min">
                    Rango carbos · mínimo
                  </label>
                  <input
                    id="settings-carb-min"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    max="800"
                    className={cn('input tabular', errors.carbMin && 'input-error')}
                    {...register('carbMin', { valueAsNumber: true })}
                  />
                  {errors.carbMin ? <p className="field-error">{errors.carbMin.message}</p> : null}
                </div>
                <div>
                  <label className="label" htmlFor="settings-carb-max">
                    Rango carbos · máximo
                  </label>
                  <input
                    id="settings-carb-max"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    max="800"
                    className={cn('input tabular', errors.carbMax && 'input-error')}
                    {...register('carbMax', { valueAsNumber: true })}
                  />
                  {errors.carbMax ? <p className="field-error">{errors.carbMax.message}</p> : null}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-line bg-raised/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-fg">Energía calculada de los macros</p>
                  <p className="text-sm font-semibold tabular text-fg">{formatKcal(macroKcal)} kcal</p>
                </div>
                <p className="mt-1 text-[10px] text-faint">
                  P {formatGrams(protein)} × 4 + C {formatGrams(carbs)} × 4 + G {formatGrams(fat)} × 9 ={' '}
                  {formatKcal(macroKcal)} kcal · objetivo energético {formatKcal(calories)} kcal
                </p>
              </div>

              {carbOutOfRange ? (
                <p className="mt-3 flex items-start gap-1.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-[11px] leading-relaxed text-amber-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  El objetivo de carbohidratos ({formatGrams(carbs)} g) está fuera del rango indicado (
                  {formatGrams(carbMin)}–{formatGrams(carbMax)} g). Puedes guardarlo igualmente; el rango es solo una
                  referencia visual.
                </p>
              ) : null}

              <MacroEnergyNotice
                targets={{ calories, protein, fat, carbs, carbMin, carbMax }}
                className="mt-3"
              />

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
                <p className="text-[10px] text-faint">
                  Los objetivos de macros y calorías son independientes. GymProgress no modifica ninguno
                  automáticamente.
                </p>
                <Button type="submit" loading={isSubmitting}>
                  <Save className="h-4 w-4" /> Guardar ajustes
                </Button>
              </div>
            </section>
          </form>

          <section className="card-pad">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/10 text-accent">
                {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </span>
              <div>
                <h2 className="text-sm font-semibold text-fg">Apariencia</h2>
                <p className="text-[10px] text-faint">El tema se guarda al instante en este dispositivo.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={theme === 'dark'}
                onClick={() => void changeTheme('dark')}
                className={cn(
                  'relative overflow-hidden rounded-xl border p-3 text-left transition',
                  theme === 'dark' ? 'border-lime-500/50 ring-1 ring-lime-500/20' : 'border-line hover:border-ink-500/60',
                )}
              >
                <div className="mb-2 flex h-14 items-end gap-1 rounded-lg border border-ink-700 bg-ink-950 p-2">
                  <span className="h-3 w-3 rounded-full bg-lime-400" />
                  <span className="h-6 flex-1 rounded bg-ink-700" />
                  <span className="h-4 w-6 rounded bg-ink-800" />
                </div>
                <span className="flex items-center gap-1.5 text-xs font-medium text-fg">
                  <Moon className="h-3.5 w-3.5" /> Oscuro
                </span>
              </button>
              <button
                type="button"
                aria-pressed={theme === 'light'}
                onClick={() => void changeTheme('light')}
                className={cn(
                  'relative overflow-hidden rounded-xl border p-3 text-left transition',
                  theme === 'light' ? 'border-lime-500/50 ring-1 ring-lime-500/20' : 'border-line hover:border-ink-500/60',
                )}
              >
                <div className="mb-2 flex h-14 items-end gap-1 rounded-lg border border-slate-200 bg-slate-100 p-2">
                  <span className="h-3 w-3 rounded-full bg-lime-500" />
                  <span className="h-6 flex-1 rounded bg-white" />
                  <span className="h-4 w-6 rounded bg-slate-200" />
                </div>
                <span className="flex items-center gap-1.5 text-xs font-medium text-fg">
                  <Sun className="h-3.5 w-3.5" /> Claro
                </span>
              </button>
            </div>
          </section>

          <section className="card-pad">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/10 text-accent">
                <Database className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-fg">Datos y copias de seguridad</h2>
                <p className="text-[10px] text-faint">Exporta un JSON para no perder tu historial.</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" size="sm" onClick={() => void handleExport()} className="flex-1">
                <Download className="h-4 w-4" /> Exportar copia
              </Button>
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} className="flex-1">
                <Upload className="h-4 w-4" /> Importar copia
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(event) => {
                  handleFileSelected(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </div>

            <div className="mt-4 space-y-2 border-t border-line pt-4">
              <div className="flex flex-col gap-2 rounded-xl border border-line bg-raised/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium text-fg">Borrar historial</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-faint">
                    Elimina comidas, sesiones, series y pesajes. Conserva alimentos, ejercicios y ajustes.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setConfirmClearHistory(true)}>
                  <Trash2 className="h-3.5 w-3.5" /> Borrar historial
                </Button>
              </div>
              <div className="flex flex-col gap-2 rounded-xl border border-rose-500/25 bg-rose-500/[0.05] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium text-rose-300">Restablecer aplicación</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                    Borra todos tus datos y vuelve a los valores iniciales (63 kg, 1400 kcal, 125/40/90).
                  </p>
                </div>
                <Button variant="danger" size="sm" onClick={() => setConfirmReset(true)}>
                  <RotateCcw className="h-3.5 w-3.5" /> Restablecer
                </Button>
              </div>
            </div>
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
            <p className="mt-3 text-[10px] text-faint">
              Rango de carbohidratos: {formatGrams(settings.targets.carbMin)}–{formatGrams(settings.targets.carbMax)} g
            </p>
            <div className="mt-3 rounded-lg border border-line bg-raised/40 px-2.5 py-2 text-[10px] text-faint">
              Peso inicial {formatNumber(settings.profile.initialWeightKg)} kg · altura {formatNumber(settings.profile.heightCm)} cm
            </div>
          </section>

          <section className="card-pad">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-fg">Instalar la app</h2>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              GymProgress es una PWA: funciona sin conexión una vez cargada y puede abrirse como aplicación.
            </p>
            {installed ? (
              <span className="chip mt-3 border-lime-500/30 text-accent">
                <ShieldCheck className="h-3 w-3" /> Instalada
              </span>
            ) : installEvent ? (
              <Button size="sm" className="mt-3 w-full" onClick={() => void promptInstall()}>
                <Smartphone className="h-3.5 w-3.5" /> Instalar en este dispositivo
              </Button>
            ) : (
              <p className="mt-3 rounded-lg border border-line bg-raised/50 px-2.5 py-2 text-[10px] leading-relaxed text-faint">
                En Chrome o Edge: menú → «Instalar aplicación». En iPhone: Compartir → «Añadir a pantalla de inicio».
                La instalación completa requiere HTTPS o localhost.
              </p>
            )}
          </section>

          <section className="card-pad">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-fg">Almacenamiento</h2>
            </div>
            <div className="mt-3 space-y-1.5 text-[11px]">
              <div className="flex justify-between gap-2">
                <span className="text-faint">Usado</span>
                <span className="font-medium tabular text-fg">{formatBytes(storage.usedBytes)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-faint">Disponible</span>
                <span className="font-medium tabular text-fg">{formatBytes(storage.quotaBytes)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-faint">Persistente</span>
                <span className="font-medium text-fg">{storage.persisted ? 'Sí' : 'No'}</span>
              </div>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-faint">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              Los datos se guardan en Supabase (nube) y se sincronizan con este dispositivo. Si cierras sesión, los datos
              permanecen en la nube. Exporta una copia de vez en cuando por seguridad.
            </p>
          </section>

          <p className="px-1 text-[10px] leading-relaxed text-faint">
            GymProgress · versión 1.0 · React + Supabase · Datos sincronizados en la nube.
          </p>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(pendingImport)}
        title="Importar copia de seguridad"
        message="Se sustituirán todos los datos actuales (alimentos, comidas, entrenamientos, pesos y ajustes) por los de la copia. ¿Continuar?"
        confirmLabel="Importar y sustituir"
        danger
        onConfirm={handleImport}
        onClose={() => setPendingImport(undefined)}
      />
      <ConfirmDialog
        open={confirmClearHistory}
        title="Borrar historial"
        message="Se eliminarán todas las comidas registradas, sesiones de entrenamiento, series y pesajes. Los alimentos, ejercicios y ajustes se conservan. ¿Continuar?"
        confirmLabel="Borrar historial"
        danger
        onConfirm={handleClearHistory}
        onClose={() => setConfirmClearHistory(false)}
      />
      <ConfirmDialog
        open={confirmReset}
        title="Restablecer aplicación"
        message="Se borrarán TODOS tus datos y volverás a la configuración inicial (63 kg, 163 cm, 1400 kcal, 125 g de proteína, 40 g de grasa, 90 g de carbohidratos). Esta acción no se puede deshacer. ¿Continuar?"
        confirmLabel="Sí, restablecer todo"
        danger
        onConfirm={handleReset}
        onClose={() => setConfirmReset(false)}
      />
    </div>
  )
}
