import { supabase } from './supabase'

const BUCKET_NAME = 'exercise-photos'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const SIGNED_URL_EXPIRY = 3600 // 1 hour

export interface UploadResult {
  path: string  // Storage path, NOT a URL
}

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Formato no soportado. Usa JPEG, PNG o WebP.'
  }
  if (file.size > MAX_FILE_SIZE) {
    return `La imagen es demasiado grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo 5 MB.`
  }
  return null
}

export async function uploadExercisePhoto(
  userId: string,
  exerciseId: string,
  file: File,
): Promise<UploadResult> {
  const validationError = validateImageFile(file)
  if (validationError) throw new Error(validationError)

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/${exerciseId}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) {
    if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
      throw new Error('El bucket de almacenamiento no existe. Ejecuta la migración 004 en Supabase SQL Editor para crearlo.')
    }
    throw uploadError
  }

  // Return the storage path, NOT a public URL
  return { path }
}

export async function deleteExercisePhoto(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path])
  if (error) throw error
}

export async function createSignedUrl(path: string, expiresIn: number = SIGNED_URL_EXPIRY): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresIn)
  if (error) {
    console.error('[Storage] Error creating signed URL:', error)
    return null
  }
  return data.signedUrl
}

export function compressImage(file: File, maxWidth = 800, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      const ratio = Math.min(maxWidth / img.width, 1)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('No se pudo crear el canvas')); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('No se pudo comprimir la imagen'))
        },
        file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        quality,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo cargar la imagen'))
    }
    img.src = url
  })
}

// Cache for signed URLs to avoid regenerating them too frequently
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

export async function getCachedSignedUrl(path: string): Promise<string | null> {
  const cached = signedUrlCache.get(path)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url
  }
  const url = await createSignedUrl(path)
  if (url) {
    signedUrlCache.set(path, { url, expiresAt: Date.now() + (SIGNED_URL_EXPIRY - 60) * 1000 })
  }
  return url
}

export function clearSignedUrlCache(): void {
  signedUrlCache.clear()
}