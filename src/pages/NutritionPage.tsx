import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  BookOpen,
  Calculator,
  Flame,
  Pencil,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import type { Food, MealType } from '../types'
import { FOOD_CATEGORIES, MEAL_TYPES } from '../types'
import { db } from '../lib/db'
import { sumEntries } from '../lib/calculations'
import { formatGrams, formatKcal } from '../lib/format'
import { deleteFood } from '../lib/repositories'
import { useApp } from '../context/AppContext'
import { PageHeader } from '../components/ui/PageHeader'
import { DateNavigator } from '../components/ui/DateNavigator'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { NutritionSummary } from '../components/nutrition/NutritionSummary'
import { MealSection } from '../components/nutrition/MealSection'
import { AddFoodModal } from '../components/nutrition/AddFoodModal'
import { FoodFormModal } from '../components/nutrition/FoodFormModal'
import { EditFoodEntryModal } from '../components/nutrition/EditFoodEntryModal'
import { cn } from '../lib/cn'

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function NutritionPage() {
  const { selectedDate, settings, notify } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'alimentos' ? 'alimentos' : 'diario'

  const entries = useLiveQuery(() => db.entries.where('date').equals(selectedDate).toArray(), [selectedDate]) ?? []
  const foods = useLiveQuery(() => db.foods.orderBy('name').toArray(), []) ?? []

  const [addOpen, setAddOpen] = useState(false)
  const [addMeal, setAddMeal] = useState<MealType>('almuerzo')
  const [initialFoodId, setInitialFoodId] = useState<string | undefined>(undefined)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [foodFormOpen, setFoodFormOpen] = useState(false)
  const [editingFood, setEditingFood] = useState<Food | undefined>(undefined)
  const [deletingFood, setDeletingFood] = useState<Food | undefined>(undefined)
  const [librarySearch, setLibrarySearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  useEffect(() => {
    if (!searchParams.get('add')) return
    const mealParam = searchParams.get('meal')
    const validMeal = MEAL_TYPES.find((item) => item.value === mealParam)?.value as MealType | undefined
    setAddMeal(validMeal ?? 'almuerzo')
    setInitialFoodId(undefined)
    setAddOpen(true)
    const next = new URLSearchParams(searchParams)
    next.delete('add')
    next.delete('meal')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const totals = useMemo(() => sumEntries(entries), [entries])
  const editingEntry = entries.find((entry) => entry.id === editingEntryId)

  const filteredFoods = useMemo(() => {
    const term = normalize(librarySearch.trim())
    return foods.filter((food) => {
      if (categoryFilter && food.category !== categoryFilter) return false
      if (!term) return true
      return normalize(`${food.name} ${food.brand ?? ''} ${food.category ?? ''}`).includes(term)
    })
  }, [foods, librarySearch, categoryFilter])

  const openAddForMeal = (meal: MealType) => {
    setAddMeal(meal)
    setInitialFoodId(undefined)
    setAddOpen(true)
  }

  const setTab = (nextTab: 'diario' | 'alimentos') => {
    const next = new URLSearchParams(searchParams)
    if (nextTab === 'alimentos') next.set('tab', 'alimentos')
    else next.delete('tab')
    setSearchParams(next, { replace: true })
  }

  const handleDeleteFood = async () => {
    if (!deletingFood) return
    try {
      await deleteFood(deletingFood.id)
      notify('Alimento eliminado de la biblioteca. Los registros anteriores se conservan.')
      setDeletingFood(undefined)
    } catch {
      notify('No se pudo eliminar el alimento', 'error')
    }
  }

  if (!settings) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-12 w-60" />
        <div className="skeleton h-16 w-full" />
        <div className="skeleton h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader
        eyebrow="Nutrición"
        title="Alimentación"
        subtitle="Registra alimentos con su peso real, controla calorías y macros, y ajusta el día sin perder de vista el objetivo."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditingFood(undefined)
                setFoodFormOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuevo alimento</span>
              <span className="sm:hidden">Alimento</span>
            </Button>
            <Button size="sm" onClick={() => openAddForMeal('almuerzo')}>
              <UtensilsCrossed className="h-4 w-4" />
              Añadir alimento
            </Button>
          </>
        }
      />

      <DateNavigator />

      <div className="flex items-center justify-between gap-3">
        <div className="segmented" role="tablist" aria-label="Secciones de alimentación">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'diario'}
            onClick={() => setTab('diario')}
            className={cn('segmented-item flex items-center gap-1.5', tab === 'diario' && 'segmented-item-active')}
          >
            <Flame className="h-3.5 w-3.5" /> Diario
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'alimentos'}
            onClick={() => setTab('alimentos')}
            className={cn('segmented-item flex items-center gap-1.5', tab === 'alimentos' && 'segmented-item-active')}
          >
            <BookOpen className="h-3.5 w-3.5" /> Biblioteca
            <span className="rounded-full bg-line px-1.5 py-0.5 text-[9px] tabular">{foods.length}</span>
          </button>
        </div>
        <p className="hidden text-[11px] text-faint sm:block">
          {entries.length} {entries.length === 1 ? 'registro' : 'registros'} · {formatKcal(totals.calories)} kcal
        </p>
      </div>

      {tab === 'diario' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <aside className="lg:col-start-2 lg:row-start-1">
            <div className="space-y-4 lg:sticky lg:top-6">
              <NutritionSummary totals={totals} targets={settings.targets} />
              <button
                type="button"
                onClick={() => setTab('alimentos')}
                className="flex w-full items-center justify-between rounded-xl border border-line bg-raised/50 px-3.5 py-3 text-left transition hover:border-lime-500/30"
              >
                <span>
                  <span className="block text-xs font-medium text-fg">Biblioteca de alimentos</span>
                  <span className="mt-0.5 block text-[10px] text-faint">
                    {foods.length} guardados · consulta sus valores
                  </span>
                </span>
                <BookOpen className="h-4 w-4 text-faint" />
              </button>
            </div>
          </aside>

          <div className="space-y-3 lg:col-start-1 lg:row-start-1">
            {MEAL_TYPES.map((meal) => (
              <MealSection
                key={meal.value}
                meal={meal.value}
                entries={entries.filter((entry) => entry.meal === meal.value)}
                onAdd={() => openAddForMeal(meal.value)}
                onEdit={(entry) => setEditingEntryId(entry.id)}
              />
            ))}
            <p className="px-1 pt-1 text-[10px] leading-relaxed text-faint">
              Toca cualquier alimento para cambiar los gramos o la comida. Las calorías del resumen son las declaradas
              en la etiqueta; el cálculo 4-4-9 se muestra aparte como referencia.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
              <input
                type="search"
                value={librarySearch}
                onChange={(event) => setLibrarySearch(event.target.value)}
                placeholder="Buscar alimento por nombre o marca…"
                className="input pl-9"
                aria-label="Buscar en la biblioteca"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="input sm:w-52"
              aria-label="Filtrar por categoría"
            >
              <option value="">Todas las categorías</option>
              {FOOD_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {foods.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<BookOpen className="h-5 w-5" />}
                title="Aún no tienes alimentos"
                description="Crea un alimento con los datos de su envase y reutilízalo siempre que quieras."
                action={
                  <Button
                    onClick={() => {
                      setEditingFood(undefined)
                      setFoodFormOpen(true)
                    }}
                  >
                    <Plus className="h-4 w-4" /> Crear primer alimento
                  </Button>
                }
              />
            </div>
          ) : filteredFoods.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<Search className="h-5 w-5" />}
                title="Sin resultados"
                description="Prueba con otro nombre o cambia el filtro de categoría."
              />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredFoods.map((food) => {
                const macroKcal = Math.round((food.per100.protein * 4 + food.per100.carbs * 4 + food.per100.fat * 9) * 10) / 10
                return (
                  <article key={food.id} className="card flex flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-fg">{food.name}</h3>
                        <p className="mt-0.5 truncate text-[10px] text-faint">
                          {[food.brand, food.category].filter(Boolean).join(' · ') || 'Sin marca ni categoría'}
                        </p>
                      </div>
                      <span className="chip shrink-0 border-lime-500/25 text-accent">
                        {formatKcal(food.per100.calories)} kcal
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-lg border border-line bg-raised/60 px-2 py-2 text-center">
                      <div>
                        <p className="text-[9px] uppercase text-faint">Prot.</p>
                        <p className="text-xs font-semibold tabular text-protein">{formatGrams(food.per100.protein)} g</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase text-faint">Carb.</p>
                        <p className="text-xs font-semibold tabular text-carbs">{formatGrams(food.per100.carbs)} g</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase text-faint">Grasa</p>
                        <p className="text-xs font-semibold tabular text-fat">{formatGrams(food.per100.fat)} g</p>
                      </div>
                    </div>

                    <p className="mt-2 flex items-center gap-1 text-[10px] text-faint">
                      <Calculator className="h-3 w-3" /> Por 100 g · macros: {formatKcal(macroKcal)} kcal
                    </p>

                    <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-3">
                      <Button
                        size="sm"
                        className="flex-1 px-2"
                        onClick={() => {
                          setInitialFoodId(food.id)
                          setAddMeal('almuerzo')
                          setAddOpen(true)
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" /> Añadir
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFood(food)
                          setFoodFormOpen(true)
                        }}
                        className="btn-icon h-8 w-8"
                        aria-label={`Editar ${food.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingFood(food)}
                        className="btn-icon h-8 w-8 hover:text-rose-400"
                        aria-label={`Eliminar ${food.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      <AddFoodModal
        open={addOpen}
        onClose={() => {
          setAddOpen(false)
          setInitialFoodId(undefined)
        }}
        date={selectedDate}
        defaultMeal={addMeal}
        initialFoodId={initialFoodId}
      />
      <FoodFormModal
        open={foodFormOpen}
        food={editingFood}
        onClose={() => {
          setFoodFormOpen(false)
          setEditingFood(undefined)
        }}
      />
      <EditFoodEntryModal
        open={Boolean(editingEntry)}
        entry={editingEntry}
        onClose={() => setEditingEntryId(null)}
      />
      <ConfirmDialog
        open={Boolean(deletingFood)}
        title="Eliminar alimento"
        message={`¿Quieres eliminar «${deletingFood?.name ?? ''}» de tu biblioteca? Los registros de comidas que ya has hecho se conservan.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDeleteFood}
        onClose={() => setDeletingFood(undefined)}
      />
    </div>
  )
}
