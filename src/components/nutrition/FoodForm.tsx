import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Calculator, Info, Save } from 'lucide-react'
import type { Food } from '../../types'
import { FOOD_CATEGORIES } from '../../types'
import { foodSchema, type FoodFormValues, getFoodMacroWarnings, parseDecimal } from '../../lib/validators'
import { kcalFromMacros, roundTo } from '../../lib/calculations'
import { scoreFood, gradeColor } from '../../lib/nutritionScore'
import { saveFood } from '../../lib/repositories'
import { useApp } from '../../context/AppContext'
import { Button } from '../ui/Button'
import { cn } from '../../lib/cn'

interface FoodFormProps {
  initialFood?: Food
  onSaved: (food: Food) => void
  onCancel?: () => void
}

export function FoodForm({ initialFood, onSaved, onCancel }: FoodFormProps) {
  const { notify } = useApp()
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FoodFormValues>({
    resolver: zodResolver(foodSchema),
    defaultValues: {
      name: initialFood?.name ?? '',
      brand: initialFood?.brand ?? '',
      category: initialFood?.category ?? '',
      barcode: initialFood?.barcode ?? '',
      caloriesPer100: initialFood?.per100.calories ?? 0,
      proteinPer100: initialFood?.per100.protein ?? 0,
      carbsPer100: initialFood?.per100.carbs ?? 0,
      fatPer100: initialFood?.per100.fat ?? 0,
      fiberPer100: initialFood?.per100.fiber ?? 0,
      notes: initialFood?.notes ?? '',
    },
  })

  const values = watch()
  const declared = Number(values.caloriesPer100) || 0
  const protein = Number(values.proteinPer100) || 0
  const carbs = Number(values.carbsPer100) || 0
  const fat = Number(values.fatPer100) || 0
  const fiber = Number(values.fiberPer100) || 0
  const estimated = kcalFromMacros(protein, carbs, fat)
  const difference = roundTo(declared - estimated, 1)
  const mismatch = declared > 0 && Math.abs(difference) > Math.max(25, declared * 0.2)
  const macroWarnings = getFoodMacroWarnings({ proteinPer100: protein, carbsPer100: carbs, fatPer100: fat, fiberPer100: fiber })
  const foodScore = scoreFood({ per100: { calories: declared, protein, carbs, fat, fiber }, name: values.name, category: values.category })

  const onSubmit = handleSubmit(async (formValues) => {
    try {
      const food = await saveFood(formValues, initialFood?.id)
      notify(initialFood ? 'Alimento actualizado' : 'Alimento creado y listo para usar')
      onSaved(food)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo guardar el alimento', 'error')
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="food-name">
            Nombre del alimento *
          </label>
          <input
            id="food-name"
            className={cn('input', errors.name && 'input-error')}
            placeholder="Ej. Yogur griego natural"
            {...register('name')}
          />
          {errors.name ? <p className="field-error">{errors.name.message}</p> : null}
        </div>

        <div>
          <label className="label" htmlFor="food-brand">
            Marca
          </label>
          <input id="food-brand" className="input" placeholder="Opcional" {...register('brand')} />
          {errors.brand ? <p className="field-error">{errors.brand.message}</p> : null}
        </div>

        <div>
          <label className="label" htmlFor="food-category">
            Categoría
          </label>
          <select id="food-category" className="input" {...register('category')}>
            <option value="">Sin categoría</option>
            {FOOD_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="food-barcode">
            Código de barras (opcional)
          </label>
          <input
            id="food-barcode"
            className={cn('input', errors.barcode && 'input-error')}
            placeholder="Ej. 8410076012345"
            {...register('barcode')}
          />
          {errors.barcode ? <p className="field-error">{errors.barcode.message}</p> : null}
        </div>
      </div>

      <div className="rounded-xl border border-line bg-raised/50 p-3">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-fg">
          <Calculator className="h-3.5 w-3.5 text-accent" />
          Valores por 100 g
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="food-kcal">
              Calorías (kcal) *
            </label>
            <input
              id="food-kcal"
              type="text"
              inputMode="decimal"
              className={cn('input tabular', errors.caloriesPer100 && 'input-error')}
              {...register('caloriesPer100', { setValueAs: parseDecimal })}
            />
            {errors.caloriesPer100 ? <p className="field-error">{errors.caloriesPer100.message}</p> : null}
          </div>
          <div>
            <label className="label" htmlFor="food-protein">
              Proteínas (g) *
            </label>
            <input
              id="food-protein"
              type="text"
              inputMode="decimal"
              className={cn('input tabular', errors.proteinPer100 && 'input-error')}
              {...register('proteinPer100', { setValueAs: parseDecimal })}
            />
            {errors.proteinPer100 ? <p className="field-error">{errors.proteinPer100.message}</p> : null}
          </div>
          <div>
            <label className="label" htmlFor="food-carbs">
              Carbohidratos (g) *
            </label>
            <input
              id="food-carbs"
              type="text"
              inputMode="decimal"
              className={cn('input tabular', errors.carbsPer100 && 'input-error')}
              {...register('carbsPer100', { setValueAs: parseDecimal })}
            />
            {errors.carbsPer100 ? <p className="field-error">{errors.carbsPer100.message}</p> : null}
          </div>
          <div>
            <label className="label" htmlFor="food-fat">
              Grasas (g) *
            </label>
            <input
              id="food-fat"
              type="text"
              inputMode="decimal"
              className={cn('input tabular', errors.fatPer100 && 'input-error')}
              {...register('fatPer100', { setValueAs: parseDecimal })}
            />
            {errors.fatPer100 ? <p className="field-error">{errors.fatPer100.message}</p> : null}
          </div>
          <div>
            <label className="label" htmlFor="food-fiber">
              Fibra (g)
            </label>
            <input
              id="food-fiber"
              type="text"
              inputMode="decimal"
              className={cn('input tabular', errors.fiberPer100 && 'input-error')}
              {...register('fiberPer100', { setValueAs: parseDecimal })}
            />
            {errors.fiberPer100 ? <p className="field-error">{errors.fiberPer100.message}</p> : null}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-raised/50 p-3 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted">Calorías declaradas en la etiqueta</span>
          <span className="font-semibold tabular text-fg">{declared.toFixed(1)} kcal</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="text-muted">Calorías estimadas de los macros</span>
          <span className="font-semibold tabular text-fg">{estimated.toFixed(1)} kcal</span>
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-faint">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          Se guardan ambos valores por separado. Los objetivos no se recalculan a partir de esta etiqueta.
        </p>
        {mismatch ? (
          <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-2 text-[11px] leading-relaxed text-amber-400">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
            Hay una diferencia de {Math.abs(difference).toFixed(1)} kcal entre la etiqueta y los macros. Puede ser
            normal por la fibra, el alcohol o el redondeo del fabricante; revisa los datos si no cuadra.
          </p>
        ) : null}

        {macroWarnings.length > 0 ? (
          <div className="mt-2 space-y-1.5">
            {macroWarnings.map((warning, i) => (
              <p key={i} className="flex items-start gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-2 text-[11px] leading-relaxed text-amber-400">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                {warning}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <label className="label" htmlFor="food-notes">
          Notas
        </label>
        <textarea
          id="food-notes"
          rows={2}
          className="input resize-none"
          placeholder="Opcional: sabor, envase, equivalencias…"
          {...register('notes')}
        />
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-line bg-raised/50 px-3 py-2 text-xs">
        <span className="text-muted">Calidad nutricional:</span>
        <span className={`rounded-md border px-2 py-0.5 font-semibold ${gradeColor(foodScore.grade)}`}>
          {foodScore.grade} · {foodScore.score}/100
        </span>
        <span className="text-faint truncate">{foodScore.explanation}</span>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" loading={isSubmitting}>
          <Save className="h-4 w-4" />
          {initialFood ? 'Guardar cambios' : 'Crear alimento'}
        </Button>
      </div>
    </form>
  )
}
