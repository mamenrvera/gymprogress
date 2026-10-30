import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Calculator, Camera, Check, Loader2, Pencil, Plus, Search, Trash2, UtensilsCrossed } from 'lucide-react'
import type { Food, MealType } from '../../types'
import { MEAL_TYPES } from '../../types'
import { nutritionForGrams, roundTo } from '../../lib/calculations'
import { formatGrams, formatKcal } from '../../lib/format'
import { addFoodEntry, deleteFood } from '../../lib/repositories'
import { useApp } from '../../context/AppContext'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { cn } from '../../lib/cn'
import { FoodForm } from './FoodForm'
import { FoodFormModal } from './FoodFormModal'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useFoods } from '../../hooks/useSupabaseData'
import { BarcodeScannerModal } from './BarcodeScannerModal'
import { BarcodeConfirmModal } from './BarcodeConfirmModal'
import { LabelScannerModal } from './LabelScannerModal'
import { fetchProductByBarcode } from '../../lib/openFoodFacts'
import type { OpenFoodFactsProduct } from '../../lib/openFoodFacts'
import type { ParsedLabel } from '../../lib/nutritionLabelOcr'

interface AddFoodModalProps {
  open: boolean
  onClose: () => void
  date: string
  defaultMeal?: MealType
  mealBlockId?: string
  initialFoodId?: string
  onAdded?: () => void
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function AddFoodModal({ open, onClose, date, defaultMeal = 'almuerzo', mealBlockId, initialFoodId, onAdded }: AddFoodModalProps) {
  const { notify } = useApp()
  const { data: foodsData, refetch: refetchFoods } = useFoods()
  const foods = foodsData ?? []
  const [editingFood, setEditingFood] = useState<Food | null>(null)
  const [foodFormOpen, setFoodFormOpen] = useState(false)
  const [deletingFood, setDeletingFood] = useState<Food | null>(null)
  const [mode, setMode] = useState<'search' | 'create'>('search')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [grams, setGrams] = useState('100')
  const [meal, setMeal] = useState<MealType>(defaultMeal)
  const [saving, setSaving] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannedProduct, setScannedProduct] = useState<OpenFoodFactsProduct | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [labelScannerOpen, setLabelScannerOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setMode('search')
    setSearch('')
    setSelectedId(initialFoodId ?? null)
    setGrams('100')
    setMeal(defaultMeal)
    setSaving(false)
  }, [open, defaultMeal, initialFoodId])

  const selected = useMemo(() => foods?.find((food) => food.id === selectedId), [foods, selectedId])
  const filtered = useMemo(() => {
    if (!foods) return []
    const term = normalize(search.trim())
    if (!term) return foods
    return foods.filter((food) =>
      normalize(`${food.name} ${food.brand ?? ''} ${food.category ?? ''}`).includes(term),
    )
  }, [foods, search])

  const parsedGrams = Math.max(0, Number(grams.replace(',', '.')) || 0)
  const preview = selected ? nutritionForGrams(selected.per100, parsedGrams) : null
  const mealLabel = MEAL_TYPES.find((item) => item.value === meal)?.label ?? ''

  const handleAdd = async () => {
    if (!selected) return
    if (!parsedGrams || parsedGrams > 5000) {
      notify('Introduce una cantidad entre 0,1 y 5000 g', 'error')
      return
    }
    setSaving(true)
    try {
      await addFoodEntry({ food: selected, grams: parsedGrams, date, meal, mealBlockId })
      notify(`${selected.name} añadido a ${mealLabel.toLowerCase()}`)
      onAdded?.()
      onClose()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo añadir el alimento', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleBarcodeDetected = async (barcode: string) => {
    setScannerOpen(false)
    setScanning(true)
    try {
      const result = await fetchProductByBarcode(barcode)
      if (!result.found || !result.product) {
        notify('Producto no encontrado en Open Food Facts. Puedes crearlo manualmente.', 'error')
        setMode('create')
        return
      }
      setScannedProduct(result.product)
      setConfirmOpen(true)
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Error al buscar el producto', 'error')
    } finally {
      setScanning(false)
    }
  }

  const handleLabelResult = (parsed: ParsedLabel) => {
    const synthetic: OpenFoodFactsProduct = {
      barcode: '',
      name: '',
      caloriesPer100: parsed.caloriesPer100,
      proteinPer100: parsed.proteinPer100,
      carbsPer100: parsed.carbsPer100,
      fatPer100: parsed.fatPer100,
      saturatedFatPer100: parsed.saturatedFatPer100,
      sugarsPer100: parsed.sugarsPer100,
      fiberPer100: parsed.fiberPer100,
      saltPer100: parsed.saltPer100,
    }
    setScannedProduct(synthetic)
    setLabelScannerOpen(false)
    setConfirmOpen(true)
  }

  const title = mode === 'create' ? 'Nuevo alimento' : 'Añadir alimento'
  const description =
    mode === 'create'
      ? 'Guarda los valores del envase. Después podrás registrarlo con el peso exacto.'
      : 'Busca en tu biblioteca o crea un alimento con los datos de su etiqueta.'

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      icon={mode === 'create' ? <Plus className="h-4 w-4" /> : <UtensilsCrossed className="h-4 w-4" />}
      size={mode === 'create' ? 'lg' : 'md'}
    >
      {mode === 'create' ? (
        <div className="space-y-3">
          <button type="button" className="btn-ghost -ml-2 px-2 py-1.5 text-xs" onClick={() => setMode('search')}>
            <ArrowLeft className="h-3.5 w-3.5" /> Volver a la búsqueda
          </button>
          <FoodForm
            onCancel={() => setMode('search')}
            onSaved={(food) => {
              setSelectedId(food.id)
              setGrams('100')
              setMode('search')
            }}
          />
        </div>
      ) : selected ? (
        <div className="space-y-4">
          <button
            type="button"
            className="btn-ghost -ml-2 px-2 py-1.5 text-xs"
            onClick={() => setSelectedId(null)}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Cambiar alimento
          </button>

          <div className="rounded-xl border border-lime-500/25 bg-lime-400/[0.06] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-fg">{selected.name}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {[selected.brand, selected.category].filter(Boolean).join(' · ') || 'Sin marca o categoría'}
                </p>
              </div>
              <span className="chip shrink-0">{formatKcal(selected.per100.calories)} kcal/100 g</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="entry-grams">
                Cantidad (g)
              </label>
              <input
                id="entry-grams"
                type="number"
                inputMode="decimal"
                min="0.1"
                max="5000"
                step="any"
                value={grams}
                onChange={(event) => setGrams(event.target.value)}
                className="input text-lg font-semibold tabular"
              />
            </div>
            <div>
              <label className="label" htmlFor="entry-meal">
                Comida
              </label>
              <select
                id="entry-meal"
                value={meal}
                onChange={(event) => setMeal(event.target.value as MealType)}
                className="input"
              >
                {MEAL_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[50, 100, 150, 200, 250].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setGrams(String(amount))}
                className={cn('chip transition hover:border-lime-500/40 hover:text-fg', parsedGrams === amount && 'border-lime-500/50 text-accent')}
              >
                {amount} g
              </button>
            ))}
          </div>

          {preview ? (
            <div className="rounded-xl border border-line bg-raised p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-xs font-medium text-muted">Aporte de {formatGrams(parsedGrams)} g</p>
                <p className="font-display text-2xl font-semibold tabular text-fg">
                  {formatKcal(preview.caloriesDeclared)} <span className="text-xs font-normal text-faint">kcal</span>
                </p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-surface px-2 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-faint">Proteína</p>
                  <p className="text-sm font-semibold tabular text-protein">{formatGrams(preview.protein)} g</p>
                </div>
                <div className="rounded-lg bg-surface px-2 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-faint">Carbos</p>
                  <p className="text-sm font-semibold tabular text-carbs">{formatGrams(preview.carbs)} g</p>
                </div>
                <div className="rounded-lg bg-surface px-2 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-faint">Grasas</p>
                  <p className="text-sm font-semibold tabular text-fat">{formatGrams(preview.fat)} g</p>
                </div>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-[10px] text-faint">
                <Calculator className="h-3 w-3" />
                Etiqueta: {formatKcal(preview.caloriesDeclared)} kcal · calculado de macros:{' '}
                {formatKcal(roundTo(preview.caloriesEstimated, 0))} kcal
              </p>
            </div>
          ) : null}

          <Button className="w-full" size="lg" onClick={() => void handleAdd()} loading={saving} disabled={!selected || parsedGrams <= 0}>
            <Check className="h-4 w-4" />
            Añadir al {mealLabel.toLowerCase()}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, marca o categoría…"
              className="input pl-9"
              aria-label="Buscar alimento"
            />
          </div>

          {foods === undefined ? (
            <div className="space-y-2 py-2">
              <div className="skeleton h-14 w-full" />
              <div className="skeleton h-14 w-full" />
              <div className="skeleton h-14 w-full" />
            </div>
          ) : foods.length === 0 ? (
            <EmptyState
              icon={<UtensilsCrossed className="h-5 w-5" />}
              title="Tu biblioteca está vacía"
              description="Crea tu primer alimento con las calorías y macros de su envase."
              action={<Button onClick={() => setMode('create')}>Crear alimento</Button>}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Search className="h-5 w-5" />}
              title="Sin resultados"
              description={`No hay alimentos que coincidan con «${search}».`}
              action={
                <Button variant="secondary" onClick={() => setMode('create')}>
                  Crear «{search.trim()}»
                </Button>
              }
            />
          ) : (
            <div className="-mx-1 max-h-[46vh] space-y-1.5 overflow-y-auto px-1 py-1">
              {filtered.map((food) => (
                <div
                  key={food.id}
                  className="flex w-full items-center gap-2 rounded-xl border border-line bg-raised/60 px-3 py-2.5 transition hover:border-lime-500/40 hover:bg-raised"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(food.id)
                      setGrams('100')
                    }}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-fg">{food.name}</p>
                      <p className="truncate text-[11px] text-faint">
                        {[food.brand, food.category].filter(Boolean).join(' · ') || 'Sin marca'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold tabular text-fg">{formatKcal(food.per100.calories)} kcal</p>
                      <p className="text-[10px] tabular text-faint">
                        P {formatGrams(food.per100.protein)} · C {formatGrams(food.per100.carbs)} · G{' '}
                        {formatGrams(food.per100.fat)}
                      </p>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingFood(food)
                        setFoodFormOpen(true)
                      }}
                      className="btn-icon h-8 w-8 hover:text-accent"
                      aria-label={`Editar ${food.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeletingFood(food)
                      }}
                      className="btn-icon h-8 w-8 hover:text-rose-400"
                      aria-label={`Eliminar ${food.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setMode('create')}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-2.5 text-xs font-medium text-muted transition hover:border-lime-500/40 hover:text-accent"
          >
            <Plus className="h-3.5 w-3.5" /> Crear un alimento nuevo
          </button>

          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            disabled={scanning}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-2.5 text-xs font-medium text-muted transition hover:border-lime-500/40 hover:text-accent"
          >
            {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />} Escanear alimento
          </button>

          <button
            type="button"
            onClick={() => setLabelScannerOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-2.5 text-xs font-medium text-muted transition hover:border-lime-500/40 hover:text-accent"
          >
            <Camera className="h-3.5 w-3.5" /> Leer etiqueta desde foto
          </button>
        </div>
      )}
    </Modal>

    <BarcodeScannerModal
      open={scannerOpen}
      onClose={() => setScannerOpen(false)}
      onDetected={(code) => void handleBarcodeDetected(code)}
    />

    <BarcodeConfirmModal
      open={confirmOpen}
      product={scannedProduct}
      date={date}
      defaultMeal={meal}
      onClose={() => setConfirmOpen(false)}
      onAdded={() => {
        setConfirmOpen(false)
        onAdded?.()
        onClose()
      }}
    />

    <LabelScannerModal
      open={labelScannerOpen}
      onClose={() => setLabelScannerOpen(false)}
      onResult={handleLabelResult}
    />

    <FoodFormModal
      open={foodFormOpen}
      food={editingFood ?? undefined}
      onClose={() => {
        setFoodFormOpen(false)
        setEditingFood(null)
      }}
      onSaved={() => {
        void refetchFoods()
      }}
    />

    <ConfirmDialog
      open={Boolean(deletingFood)}
      title="Eliminar alimento"
      message={`¿Quieres eliminar «${deletingFood?.name ?? ''}» de la biblioteca? Las comidas registradas conservan sus valores.`}
      confirmLabel="Eliminar"
      danger
      onConfirm={async () => {
        if (!deletingFood) return
        try {
          await deleteFood(deletingFood.id)
          void refetchFoods()
        } catch {
          notify('No se pudo eliminar el alimento', 'error')
        } finally {
          setDeletingFood(null)
        }
      }}
      onClose={() => setDeletingFood(null)}
    />
    </>
  )
}
