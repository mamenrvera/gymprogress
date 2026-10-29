import { useRef, useState } from 'react'
import { Camera, FileImage, Loader2, X } from 'lucide-react'
import { runOcrOnImage } from '../../lib/nutritionLabelOcr'
import type { ParsedLabel } from '../../lib/nutritionLabelOcr'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface Props {
  open: boolean
  onClose: () => void
  onResult: (parsed: ParsedLabel) => void
}

export function LabelScannerModal({ open, onClose, onResult }: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setPreview(null)
    setFile(null)
    setProgress(0)
    setRunning(false)
    setError(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFile = (f: File | null) => {
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setError(null)
  }

  const handleRun = async () => {
    if (!file) return
    setRunning(true)
    setError(null)
    setProgress(0)
    try {
      const parsed = await runOcrOnImage(file, setProgress)
      if (parsed.caloriesPer100 === null && parsed.proteinPer100 === null && parsed.carbsPer100 === null && parsed.fatPer100 === null) {
        setError('No se han podido reconocer valores nutricionales. Prueba con una foto más nítida y bien iluminada.')
        setRunning(false)
        return
      }
      onResult(parsed)
      reset()
    } catch (e) {
      console.error('[LabelScanner] OCR error:', e)
      setError(e instanceof Error ? e.message : 'Error al analizar la imagen.')
      setRunning(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Leer etiqueta nutricional" icon={<Camera className="h-4 w-4" />} size="md">
      <div className="space-y-4">
        <p className="text-xs text-muted">
          Fotografía la tabla nutricional de forma nítida, con buena iluminación y sin reflejos. El reconocimiento se realiza en tu dispositivo.
        </p>

        {!preview ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-line py-8 text-sm font-medium text-muted transition hover:border-lime-500/40 hover:text-accent"
            >
              <Camera className="h-5 w-5" /> Hacer foto
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-line py-4 text-xs font-medium text-muted transition hover:border-lime-500/40 hover:text-accent"
            >
              <FileImage className="h-4 w-4" /> Seleccionar imagen existente
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <img src={preview} alt="Etiqueta" className="mx-auto max-h-48 rounded-xl border border-line object-contain" />
            {running && (
              <div className="space-y-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                  <div className="h-full bg-lime-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-center text-xs text-faint">Analizando… {progress}%</p>
              </div>
            )}
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={reset} disabled={running}>Repetir</Button>
              <Button onClick={() => void handleRun()} loading={running} disabled={running}>
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Analizar
              </Button>
            </div>
          </div>
        )}

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />

        <div className="flex justify-start">
          <Button variant="secondary" onClick={handleClose}>
            <X className="h-4 w-4 mr-1.5" /> Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  )
}