import { useState, useEffect } from 'react'
import { getCachedSignedUrl } from '../lib/storage'

/**
 * Hook to get a signed URL for an exercise photo.
 * Returns null while loading, the URL when ready, or null if no image.
 */
export function useExercisePhotoUrl(imagePath: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!imagePath) {
      setUrl(null)
      return
    }
    // If it's already a URL (legacy data), use it directly
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      setUrl(imagePath)
      return
    }
    // If it's a blob URL (temp preview), use it directly
    if (imagePath.startsWith('blob:')) {
      setUrl(imagePath)
      return
    }
    // Otherwise, it's a storage path - generate signed URL
    let cancelled = false
    getCachedSignedUrl(imagePath).then((signedUrl) => {
      if (!cancelled) {
        setUrl(signedUrl)
      }
    })
    return () => { cancelled = true }
  }, [imagePath])

  return url
}