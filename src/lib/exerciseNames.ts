/**
 * Utilidades para detectar ejercicios duplicados en el catálogo compartido.
 * La normalización ignora mayúsculas/minúsculas y espacios sobrantes
 * al principio y al final del nombre.
 */

/** Normaliza un nombre de ejercicio para comparación (trim + lowercase). */
export function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase()
}

export interface ExerciseNameEntry {
  id: string
  name: string
}

/**
 * Busca un ejercicio con el mismo nombre normalizado en el catálogo.
 * @param exercises Lista de ejercicios del catálogo completo (todos los usuarios)
 * @param name Nombre a comprobar
 * @param excludeId ID de ejercicio a excluir (útil al editar: el propio ejercicio no es duplicado de sí mismo)
 * @returns El ejercicio duplicado encontrado, o undefined si no hay duplicado
 */
export function findDuplicateExercise<T extends ExerciseNameEntry>(
  exercises: T[],
  name: string,
  excludeId?: string,
): T | undefined {
  const normalized = normalizeExerciseName(name)
  return exercises.find(
    (exercise) =>
      exercise.id !== excludeId && normalizeExerciseName(exercise.name) === normalized,
  )
}

/** Mensaje estándar de error de duplicado. */
export const DUPLICATE_EXERCISE_MESSAGE =
  'Este ejercicio ya existe en el catálogo de GymProgress. No puedes crear un duplicado.'