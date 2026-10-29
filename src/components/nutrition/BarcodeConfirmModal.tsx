import { useEffect, useState } from 'react'
import { Camera, Check, FileImage } from 'lucide-react'
import { scoreFood, gradeColor } from '../../lib/nutritionScore'
import { LabelScannerModal } from './LabelScannerModal'
import type { ParsedLabel } from '../../lib/nutritionLabelOcr'
import type { MealType } from '../../types'
import { MEAL_TYPES } from '../../types'
import { nutritionForGrams } from '../../lib/calculations'
import { formatGrams, formatKcal } from '../../lib/format'
import { saveFood, addFoodEntry } from '../../lib/repositories'
import { useApp } from '../../context/AppContext'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import type { OpenFoodFactsProduct } from '../../lib/openFoodFacts'

interface Props {
  open: boolean
  product: OpenFoodFactsProduct | null
  date: string
  defaultMeal?: MealType
  mealBlockId?: string
  onClose: () => void
  onAdded?: () => void
}

export function BarcodeConfirmModal({ open, product, date, defaultMeal = 'almuerzo', mealBlockId, onClose, onAdded }: Props) {
  const { notify } = useApp()
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [fiber, setFiber] = useState('')
  const [grams, setGrams] = useState('100')
  const [meal, setMeal] = useState<MealType>(defaultMeal)
  const [saving, setSaving] = useState(false)
  const [missing, setMissing] = useState<string[]>([])
  const [labelScannerOpen, setLabelScannerOpen] = useState(false)

  useEffect(() => {
    if (!open || !product) return
    setName(product.name || '')
    setBrand(product.brand || '')
    setCalories(product.caloriesPer100 !== null ? String(product.caloriesPer100) : '')
    setProtein(product.proteinPer100 !== null ? String(product.proteinPer100) : '')
    setCarbs(product.carbsPer100 !== null ? String(product.carbsPer100) : '')
    setFat(product.fatPer100 !== null ? String(product.fatPer100) : '')
    setFiber(product.fiberPer100 !== null ? String(product.fiberPer100) : '')
    setGrams('100')
    setMeal(defaultMeal)
    setSaving(false)
    const m: string[] = []
    if (product.caloriesPer100 === null) m.push('Calorías')
    if (product.proteinPer100 === null) m.push('Proteínas')
    if (product.carbsPer100 === null) m.push('Carbohidratos')
    if (product.fatPer100 === null) m.push('Grasas')
    setMissing(m)
  }, [open, product, defaultMeal])

  const parsedGrams = Math.max(0, Number(grams.replace(',', '.')) || 0)
  const per100 = {
    calories: Number(calories.replace(',', '.')) || 0,
    protein: Number(protein.replace(',', '.')) || 0,
    carbs: Number(carbs.replace(',', '.')) || 0,
    fat: Number(fat.replace(',', '.')) || 0,
    fiber: Number(fiber.replace(',', '.')) || 0,
  }
  const preview = per100.calories >= 0 ? nutritionForGrams(per100, parsedGrams) : null
  const foodScore = scoreFood({ per100, name, category: undefined })

  const handleLabelResult = (parsed: ParsedLabel) => {
    if (parsed.caloriesPer100 !== null) setCalories(String(parsed.caloriesPer100))
    if (parsed.proteinPer100 !== null) setProtein(String(parsed.proteinPer100))
    if (parsed.carbsPer100 !== null) setCarbs(String(parsed.carbsPer100))
    if (parsed.fatPer100 !== null) setFat(String(parsed.fatPer100))
    if (parsed.fiberPer100 !== null) setFiber(String(parsed.fiberPer100))
    if (parsed.baseUnit === '100ml') {
      notify('La etiqueta indica valores por 100 ml. Revísalos antes de guardar.', 'error')
    }
    setLabelScannerOpen(false)
  }

  const handleAdd = async () => {
    if (!name.trim()) {
      notify('Introduce un nombre para el alimento', 'error')
      return
    }
    if (!parsedGrams || parsedGrams > 5000) {
      notify('Introduce una cantidad entre 0,1 y 5000 g', 'error')
      return
    }
    setSaving(true)
    try {
      const food = await saveFood({
        name: name.trim(),
        brand: brand.trim() || undefined,
        category: undefined,
        barcode: product?.barcode,
        caloriesPer100: per100.calories,
        proteinPer100: per100.protein,
        carbsPer100: per100.carbs,
        fatPer100: per100.fat,
        fiberPer100: per100.fiber,
        notes: undefined,
      })
      await addFoodEntry({ food, grams: parsedGrams, date, meal, mealBlockId })
      notify(`${food.name} añadido`)
      onAdded?.()
      onClose()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo guardar el alimento', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!product) return null

  return (
    <>
    <Modal open={open} onClose={onClose} title="Producto escaneado" icon={<Camera className="h-4 w-4" />} size="lg">
      <div className="space-y-4">
        <div className="flex gap-3">
          {product.imageUrl && (
            <img src={product.imageUrl} alt={product.name} className="h-20 w-20 rounded-xl object-cover border border-line" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">{product.name || 'Producto sin nombre'}</p>
            {product.brand && <p className="text-xs text-muted">{product.brand}</p>}
            <p className="text-[10px] text-faint mt-1">Código: {product.barcode}</p>
          </div>
        </div>

        {missing.length > 0 && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-400">
            Faltan datos nutricionales: {missing.join(', ')}. Complétalos manualmente a partir de la etiqueta.
          </div>
        )}

        <div className="flex items-center gap-2 rounded-xl border border-line bg-raised/50 px-3 py-2 text-xs">
          <span className="text-muted">Calidad nutricional:</span>
          <span className={`rounded-md border px-2 py-0.5 font-semibold ${gradeColor(foodScore.grade)}`}>
            {foodScore.grade} · {foodScore.score}/100
          </span>
          <span className="text-faint truncate">{foodScore.explanation}</span>
        </div>

        <button
          type="button"
          onClick={() => setLabelScannerOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-2.5 text-xs font-medium text-muted transition hover:border-lime-500/40 hover:text-accent"
        >
          <FileImage className="h-3.5 w-3.5" /> Leer etiqueta nutricional con foto
        </button>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="bc-name">Nombre *</label>
            <input id="bc-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="bc-brand">Marca</label>
            <input id="bc-brand" className="input" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
        </div>

        <div className="rounded-xl border border-line bg-raised/50 p-3">
          <p className="mb-3 text-xs font-semibold text-fg">Valores por 100 g</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="bc-kcal">Calorías (kcal)</label>
              <input id="bc-kcal" type="text" inputMode="decimal" className="input tabular" value={calories} onChange={(e) => setCalories(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="bc-protein">Proteínas (g)</label>
              <input id="bc-protein" type="text" inputMode="decimal" className="input tabular" value={protein} onChange={(e) => setProtein(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="bc-carbs">Carbohidratos (g)</label>
              <input id="bc-carbs" type="text" inputMode="decimal" className="input tabular" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="bc-fat">Grasas (g)</label>
              <input id="bc-fat" type="text" inputMode="decimal" className="input tabular" value={fat} onChange={(e) => setFat(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="bc-fiber">Fibra (g)</label>
              <input id="bc-fiber" type="text" inputMode="decimal" className="input tabular" value={fiber} onChange={(e) => setFiber(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="bc-grams">Cantidad (g)</label>
            <input id="bc-grams" type="number" inputMode="decimal" min="0.1" max="5000" value={grams} onChange={(e) => setGrams(e.target.value)} className="input text-lg font-semibold tabular" />
          </div>
          <div>
            <label className="label" htmlFor="bc-meal">Comida</label>
            <select id="bc-meal" value={meal} onChange={(e) => setMeal(e.target.value as MealType)} className="input">
              {MEAL_TYPES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
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
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={() => void handleAdd()} loading={saving} disabled={!name.trim() || parsedGrams <= 0}>
            <Check className="h-4 w-4" /> Añadir al registro
          </Button>
        </div>
      </div>
    </Modal>

    <LabelScannerModal
      open={labelScannerOpen}
      onClose={() => setLabelScannerOpen(false)}
      onResult={handleLabelResult}
    />
    </>
  )
}