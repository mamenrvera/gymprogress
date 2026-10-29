import { useEffect, useRef, useState } from 'react'
import { Camera, Keyboard, X } from 'lucide-react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

interface Props {
  open: boolean
  onClose: () => void
  onDetected: (barcode: string) => void
}

export function BarcodeScannerModal({ open, onClose, onDetected }: Props) {
  const readerRef = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const detectedRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [mode, setMode] = useState<'camera' | 'manual'>('camera')

  useEffect(() => {
    if (!open) return
    detectedRef.current = false
    setError(null)
    setManualCode('')
    setMode('camera')

    let cancelled = false

    async function start() {
      if (!readerRef.current) return
      try {
        const scanner = new Html5Qrcode('barcode-reader', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ],
          verbose: false,
        })
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 120 } },
          (decodedText) => {
            if (cancelled || detectedRef.current) return
            detectedRef.current = true
            try { scanner.stop() } catch { /* ignore */ }
            onDetected(decodedText)
          },
          () => { /* ignore scan failures */ },
        )
      } catch (e) {
        if (cancelled) return
        console.error('[BarcodeScanner] Camera error:', e)
        setError('No se pudo acceder a la cámara. Introduce el código manualmente.')
        setMode('manual')
      }
    }

    // Small delay to ensure the DOM element is ready
    const timer = setTimeout(start, 100)

    return () => {
      cancelled = true
      clearTimeout(timer)
      if (scannerRef.current) {
        try { scannerRef.current.stop() } catch { /* ignore */ }
        try { scannerRef.current.clear() } catch { /* ignore */ }
        scannerRef.current = null
      }
    }
  }, [open, onDetected])

  const handleManualSubmit = () => {
    const code = manualCode.trim()
    if (!code) return
    onDetected(code)
  }

  return (
    <Modal open={open} onClose={onClose} title="Escanear código de barras" icon={<Camera className="h-4 w-4" />} size="md">
      <div className="space-y-4">
        {mode === 'camera' ? (
          <>
            <div id="barcode-reader" ref={readerRef} className="overflow-hidden rounded-xl border border-line bg-black" style={{ minHeight: 220 }} />
            {error && (
              <p className="text-xs text-rose-400">{error}</p>
            )}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setMode('manual')}>
                <Keyboard className="h-4 w-4 mr-1.5" /> Introducir manualmente
              </Button>
              <Button variant="secondary" onClick={onClose}>
                <X className="h-4 w-4 mr-1.5" /> Cancelar
              </Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="label" htmlFor="manual-barcode">Código de barras</label>
              <input
                id="manual-barcode"
                className="input"
                placeholder="Ej. 8410076012345"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit() }}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setMode('camera')}>
                <Camera className="h-4 w-4 mr-1.5" /> Usar cámara
              </Button>
              <Button variant="secondary" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleManualSubmit} disabled={!manualCode.trim()}>Buscar</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}