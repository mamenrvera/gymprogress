import { useRef, useState, useEffect } from 'react'
import { Camera, Image as ImageIcon, Trash2, Upload } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { validateImageFile, compressImage, uploadExercisePhoto, deleteExercisePhoto, getCachedSignedUrl } from '../../lib/storage'

interface ExercisePhotoUploadProps {
  exerciseId?: string
  currentImageUrl?: string | null  // This is now a storage path, not a URL
  onImageChange: (imagePath: string | null) => void
  onFileSelect?: (file: File | null) => void
  disabled?: boolean
}

export function ExercisePhotoUpload({ exerciseId, currentImageUrl, onImageChange, onFileSelect, disabled }: ExercisePhotoUploadProps) {
  const { user } = useAuth()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingImage, setLoadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Load signed URL when currentImageUrl (path) changes
  useEffect(() => {
    if (!currentImageUrl) {
      setPreviewUrl(null)
      return
    }
    // If it's already a blob URL (temp preview), use it directly
    if (currentImageUrl.startsWith('blob:')) {
      setPreviewUrl(currentImageUrl)
      return
    }
    // Otherwise, it's a storage path - generate signed URL
    setLoadingImage(true)
    getCachedSignedUrl(currentImageUrl).then((url) => {
      setPreviewUrl(url)
      setLoadingImage(false)
    }).catch(() => {
      setPreviewUrl(null)
      setLoadingImage(false)
    })
  }, [currentImageUrl])

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleFileSelect = async (file: File | null) => {
    if (!file || !user) return
    setError(null)

    const validationError = validateImageFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    // Track selected file for parent
    onFileSelect?.(file)

    // Upload (only if exerciseId exists - for new exercises, we'll upload after creation)
    if (exerciseId) {
      setUploading(true)
      try {
        // Compress image
        const compressed = await compressImage(file, 800, 0.8)
        const compressedFile = new File([compressed], file.name, { type: compressed.type })

        // Upload new photo FIRST
        const result = await uploadExercisePhoto(user.id, exerciseId, compressedFile)

        // Only delete old photo AFTER new one is uploaded successfully
        if (currentImageUrl && !currentImageUrl.startsWith('blob:')) {
          try { await deleteExercisePhoto(currentImageUrl) } catch { /* ignore - best-effort cleanup */ }
        }

        onImageChange(result.path)  // Store path, not URL
        // Revoke object URL
        URL.revokeObjectURL(objectUrl)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error al subir la imagen'
        console.error('[ExercisePhotoUpload] Upload error:', msg, e)
        setError(msg)
        setPreviewUrl(currentImageUrl ? null : null)
        URL.revokeObjectURL(objectUrl)
      } finally {
        setUploading(false)
      }
    }
    // For new exercises, the parent handles upload after creation
    // The blob URL is stored temporarily in onImageChange for preview
  }

  const handleRemove = async () => {
    if (!user) return
    setError(null)
    setUploading(true)
    try {
      // currentImageUrl is now a storage path (e.g., "user-id/exercise-id.jpg")
      // not a URL, so we can use it directly
      if (currentImageUrl && !currentImageUrl.startsWith('blob:') && !currentImageUrl.startsWith('http')) {
        try {
          await deleteExercisePhoto(currentImageUrl)
        } catch (e) {
          console.warn('[ExercisePhotoUpload] Could not delete old photo (may require admin permissions):', e)
        }
      } else if (currentImageUrl && currentImageUrl.includes('exercise-photos/')) {
        // Legacy: extract path from URL
        const path = currentImageUrl.split('exercise-photos/')[1]
        if (path) {
          try {
            await deleteExercisePhoto(path)
          } catch (e) {
            console.warn('[ExercisePhotoUpload] Could not delete old photo (may require admin permissions):', e)
          }
        }
      }
      onImageChange(null)
      onFileSelect?.(null)
      setPreviewUrl(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar la imagen')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <label className="label">Foto del ejercicio o máquina</label>

      {loadingImage ? (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-line bg-raised/30 text-faint">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
        </div>
      ) : previewUrl ? (
        <div className="relative rounded-xl border border-line bg-raised/50 p-2">
          <img
            src={previewUrl}
            alt="Previsualización del ejercicio"
            className="mx-auto max-h-48 rounded-lg object-contain"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-surface/60">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-line bg-raised/30 text-faint">
          <div className="text-center">
            <ImageIcon className="mx-auto h-8 w-8 mb-1" />
            <p className="text-xs">Sin foto</p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-400">{error}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled || uploading}
          className="btn-secondary flex-1 text-xs"
        >
          <Camera className="h-3.5 w-3.5 mr-1.5" />
          Hacer foto
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="btn-secondary flex-1 text-xs"
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Subir imagen
        </button>
        {previewUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled || uploading}
            className="btn-ghost text-xs text-rose-400 hover:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Eliminar foto
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
      />
    </div>
  )
}