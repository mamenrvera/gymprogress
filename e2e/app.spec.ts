import { expect, test, type Page } from '@playwright/test'

async function openApp(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText('Datos guardados en este dispositivo. Sin nube, sin cuentas.')).toBeVisible()
}

async function createFood(
  page: Page,
  food: {
    name: string
    brand?: string
    category?: string
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber?: number
  },
) {
  await page.goto('/alimentacion?tab=alimentos')
  await expect(page.getByRole('heading', { name: 'Alimentación', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: /Nuevo alimento/i }).click()
  await expect(page.getByRole('heading', { name: 'Nuevo alimento' })).toBeVisible()

  await page.locator('#food-name').fill(food.name)
  if (food.brand) await page.locator('#food-brand').fill(food.brand)
  if (food.category) await page.locator('#food-category').selectOption(food.category)
  await page.locator('#food-kcal').fill(String(food.calories))
  await page.locator('#food-protein').fill(String(food.protein))
  await page.locator('#food-carbs').fill(String(food.carbs))
  await page.locator('#food-fat').fill(String(food.fat))
  await page.locator('#food-fiber').fill(String(food.fiber ?? 0))

  await page.getByRole('button', { name: 'Crear alimento', exact: true }).click()
  await expect(page.getByRole('heading', { name: food.name, exact: true })).toBeVisible()
}

async function addFoodToMeal(page: Page, foodName: string, grams: number, meal = 'desayuno') {
  const mealLabel = meal.charAt(0).toUpperCase() + meal.slice(1)
  await page.getByRole('button', { name: `Añadir alimento a ${mealLabel.toLowerCase()}`, exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Añadir alimento' })).toBeVisible()
  await page.getByRole('button', { name: new RegExp(foodName) }).click()
  await page.locator('#entry-grams').fill(String(grams))
  await expect(page.getByText(`Aporte de ${grams} g`)).toBeVisible()
  await page.getByRole('button', { name: `Añadir al ${mealLabel.toLowerCase()}`, exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Añadir alimento' })).toBeHidden()
}

test('nutrición: crea un alimento, registra gramos y conserva la instantánea', async ({ page }) => {
  await openApp(page)

  // Objetivos iniciales y aviso de energía independiente.
  await expect(page.getByRole('img', { name: /Proteínas: 0 de 125 g/ })).toBeVisible()
  await expect(page.getByRole('img', { name: /Grasas: 0 de 40 g/ })).toBeVisible()
  await expect(page.getByRole('img', { name: /Carbohidratos: 0 de 90 g/ })).toBeVisible()
  await expect(page.getByText(/Tus macros suman/).first()).toContainText('1220 kcal')
  await expect(page.getByText(/Tus macros suman/).first()).toContainText('1400 kcal')

  await createFood(page, {
    name: 'Avena integral E2E',
    brand: 'Marca de prueba',
    category: 'Cereales y tubérculos',
    calories: 380,
    protein: 13,
    carbs: 60,
    fat: 7,
    fiber: 10,
  })

  await page.getByRole('tab', { name: /Diario/ }).click()
  await addFoodToMeal(page, 'Avena integral E2E', 150)

  const summary = page.locator('.card-pad').filter({ has: page.getByRole('heading', { name: 'Resumen del día' }) })
  await expect(summary.getByText('570', { exact: true })).toBeVisible()
  await expect(summary.getByText('Etiqueta')).toBeVisible()
  await expect(summary.getByText('533 kcal', { exact: true })).toBeVisible()
  await expect(page.getByText('150 g · P 19,5 · C 90 · G 10,5')).toBeVisible()

  // Inicio refleja las calorías declaradas como valor principal.
  await page.getByRole('link', { name: 'Inicio', exact: true }).click()
  // El valor grande de calorías en la sección de energía (font-display)
  await expect(page.locator('.font-display').getByText('570', { exact: true })).toBeVisible()
  await expect(page.getByText(/Etiqueta 570 kcal · macros 533 kcal/)).toBeVisible()
  await expect(page.getByRole('img', { name: /Proteínas: 19,5 de 125 g, 16 %/ })).toBeVisible()

  // La instantánea del registro sobrevive al borrar el alimento de la biblioteca.
  await page.getByRole('link', { name: 'Alimentación', exact: true }).click()
  await page.getByRole('tab', { name: /Biblioteca/ }).click()
  await page.getByRole('button', { name: 'Eliminar Avena integral E2E' }).click()
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Avena integral E2E' })).toBeHidden()

  await page.getByRole('tab', { name: /Diario/ }).click()
  // El alimento ya no está en la biblioteca, así que la única ocurrencia es la entrada del diario
  await expect(page.getByText('Avena integral E2E').first()).toBeVisible()

  await page.reload()
  await expect(page.getByText('Avena integral E2E').first()).toBeVisible()
  await expect(page.getByText('150 g · P 19,5 · C 90 · G 10,5')).toBeVisible()
})

test('entrenamiento: series, volumen, 1RM y finalización', async ({ page }) => {
  await openApp(page)

  await page.getByRole('link', { name: 'Entrenamiento', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Entrenamiento', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Nueva sesión' }).click()
  await expect(page.getByRole('heading', { name: 'Nueva sesión' })).toBeVisible()
  await page.locator('#workout-name').fill('Torso E2E')
  await page.getByRole('button', { name: 'Crear y empezar' }).click()

  await expect(page.getByRole('heading', { name: 'Torso E2E', level: 1 })).toBeVisible()
  await expect(page.getByText('En curso').first()).toBeVisible()

  await page.getByRole('button', { name: 'Añadir ejercicio', exact: true }).first().click()
  await page.getByRole('button', { name: 'Añadir Press banca', exact: true }).click()
  await page.getByRole('button', { name: 'Listo' }).click()
  await expect(page.getByRole('heading', { name: 'Press banca', level: 3 })).toBeVisible()

  await page.getByRole('button', { name: 'Añadir serie' }).click()
  const weight = page.getByRole('spinbutton', { name: 'Press banca, serie 1, peso en kilos' })
  const reps = page.getByRole('spinbutton', { name: 'Press banca, serie 1, repeticiones' })
  await weight.fill('60')
  await weight.blur()
  await reps.fill('8')
  await reps.blur()
  // Esperar a que los commits se propaguen a la BD
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: 'Marcar serie 1 como completada' }).click()
  // Esperar a que la UI se actualice con las stats
  await page.waitForTimeout(1000)

  // Primero verificar las stats a nivel de ejercicio (más específicas)
  await expect(page.getByText(/1 ef\. · 480 kg/)).toBeVisible()
  await expect(page.getByText('Mejor serie: 60 kg × 8 · 1RM est. 76 kg')).toBeVisible()

  await page.getByRole('button', { name: 'Añadir serie' }).click()
  await expect(page.getByRole('button', { name: 'Marcar serie 2 como pendiente' })).toBeVisible()
  await expect(page.getByText(/2 ef\. · 960 kg/)).toBeVisible()
  await expect(page.getByText('Mejor serie: 60 kg × 8 · 1RM est. 76 kg')).toBeVisible()

  await page.getByRole('button', { name: 'Finalizar sesión' }).click()
  await expect(page.getByRole('heading', { name: 'Entrenamiento', level: 1 })).toBeVisible()
  await expect(page.getByText('Torso E2E').first()).toBeVisible()
  // En la lista de sesiones: "2 series ef." y "960 kg" están en elementos separados
  await expect(page.getByText('2 series ef.').first()).toBeVisible()
  await expect(page.getByText('960 kg').first()).toBeVisible()

  await page.getByRole('link', { name: 'Progreso', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Progreso', level: 1 })).toBeVisible()
  const volumeCard = page.locator('.card-pad').filter({ hasText: 'Volumen total' })
  await expect(volumeCard.getByText(/960 kg/).first()).toBeVisible()
  await expect(page.getByText(/960 kg/).first()).toBeVisible()
  await expect(page.getByText('1 sesiones completadas · 960 kg de volumen')).toBeVisible()

  await page.reload()
  const volumeCardAfterReload = page.locator('.card-pad').filter({ hasText: 'Volumen total' })
  await expect(volumeCardAfterReload.getByText(/960 kg/).first()).toBeVisible()
})

test('ajustes: objetivos independientes, persistencia y tema claro', async ({ page }) => {
  await openApp(page)
  await page.getByRole('link', { name: 'Ajustes y perfil', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ajustes', level: 1 })).toBeVisible()
  await expect(page.getByText(/Tus macros suman/).first()).toContainText('1220 kcal')

  await page.locator('#settings-name').fill('Mamen')
  await page.locator('#settings-calories').fill('1500')
  await page.locator('#settings-protein').fill('130')
  await page.locator('#settings-fat').fill('42')
  await page.locator('#settings-carbs').fill('92')

  const notice = page.getByText(/Tus macros suman/).first()
  await expect(notice).toContainText('1266 kcal')
  await expect(notice).toContainText('1500 kcal')
  await expect(notice).toContainText('faltan 234 kcal')

  await page.getByRole('button', { name: 'Guardar ajustes', exact: true }).click()
  await expect(page.getByText('Ajustes guardados')).toBeVisible()
  await expect(page.getByText('Sin cambios')).toBeVisible()

  await page.getByRole('button', { name: /Claro/ }).click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Ajustes', level: 1 })).toBeVisible()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await expect(page.locator('#settings-calories')).toHaveValue('1500')
  await expect(page.locator('#settings-protein')).toHaveValue('130')
  await expect(page.locator('#settings-fat')).toHaveValue('42')
  await expect(page.locator('#settings-carbs')).toHaveValue('92')

  await page.getByRole('link', { name: 'Inicio', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Hola, Mamen' })).toBeVisible()
  await expect(page.getByRole('img', { name: /Proteínas: 0 de 130 g/ })).toBeVisible()
  await expect(page.getByRole('img', { name: /Grasas: 0 de 42 g/ })).toBeVisible()
  await expect(page.getByRole('img', { name: /Carbohidratos: 0 de 92 g/ })).toBeVisible()
  // "de 1500 kcal" en la sección de energía del inicio
  await expect(page.locator('.font-display').locator('..').getByText('de 1500 kcal')).toBeVisible()
})

test('peso corporal: registra, calcula IMC y muestra la evolución', async ({ page }) => {
  await openApp(page)

  await page.getByRole('button', { name: 'Registrar peso' }).first().click()
  await expect(page.getByRole('heading', { name: 'Registrar peso corporal' })).toBeVisible()
  await page.locator('#weight-value').fill('62.5')
  await page.locator('#weight-note').fill('En ayunas')
  await page.getByRole('button', { name: 'Guardar peso' }).click()
  await expect(page.getByText('Peso corporal guardado').first()).toBeVisible()
  await expect(page.getByText('62,5 kg').first()).toBeVisible()
  await expect(page.getByText('23,5', { exact: true })).toBeVisible()

  const yesterday = await page.evaluate(() => {
    const date = new Date()
    date.setDate(date.getDate() - 1)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  })

  await page.getByRole('button', { name: 'Registrar peso' }).first().click()
  await page.locator('#weight-date').fill(yesterday)
  await page.locator('#weight-value').fill('63')
  await page.getByRole('button', { name: 'Guardar peso' }).click()
  await expect(page.getByText('Peso corporal guardado').first()).toBeVisible()
  await expect(page.getByText('-0,5 kg desde el inicio')).toBeVisible()

  await page.getByRole('link', { name: 'Progreso', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Progreso', level: 1 })).toBeVisible()
  await expect(page.getByText('Peso corporal').first()).toBeVisible()
  await expect(page.getByText('62,5 kg').first()).toBeVisible()
  await expect(page.getByText('En ayunas').first()).toBeVisible()
})

test('móvil: navegación inferior, sin desbordamiento horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openApp(page)

  const mobileNav = page.getByRole('navigation', { name: 'Navegación móvil' })
  await expect(mobileNav).toBeVisible()
  await expect(mobileNav.getByRole('link', { name: 'Comidas' })).toBeVisible()
  await expect(page.getByRole('complementary')).toBeHidden()

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1)

  await mobileNav.getByRole('link', { name: 'Comidas' }).click()
  await expect(page.getByRole('heading', { name: 'Alimentación', level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Añadir alimento a desayuno', exact: true })).toBeVisible()

  await mobileNav.getByRole('link', { name: 'Entrenar' }).click()
  await expect(page.getByRole('heading', { name: 'Entrenamiento', level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nueva sesión' })).toBeVisible()

  const overflowAfter = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflowAfter).toBeLessThanOrEqual(1)
})
