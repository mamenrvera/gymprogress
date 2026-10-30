import { useEffect, useRef, useState } from 'react'
import { Camera, Keyboard, X, AlertCircle } from 'lucide-react'
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
  const onDetectedRef = useRef(onDetected)
  onDetectedRef.current = onDetected
  const [error, setError] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [mode, setMode] = useState<'camera' | 'manual'>('camera')
  const [helpVisible, setHelpVisible] = useState(false)

  useEffect(() => {
    if (!open) return
    detectedRef.current = false
    setError(null)
    setManualCode('')
    setMode('camera')
    setHelpVisible(false)

    let cancelled = false
    let helpTimer: number | null = null

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
          useBarCodeDetectorIfSupported: true,
        })
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              // Large, readable scan window: ~85% width, ~35% height, capped.
              const width = Math.min(Math.round(viewfinderWidth * 0.85), 320)
              const height = Math.min(Math.round(viewfinderHeight * 0.35), 160)
              return { width: Math.max(width, 220), height: Math.max(height, 90) }
            },
            aspectRatio: 16 / 9,
            disableFlip: false,
            videoConstraints: {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            } as MediaTrackConstraints,
          },
          (decodedText: string) => {
            if (cancelled || detectedRef.current) return
            detectedRef.current = true
            if (helpTimer !== null) {
              window.clearTimeout(helpTimer)
              helpTimer = null
            }
            try { scanner.stop() } catch { /* ignore */ }
            onDetectedRef.current(decodedText)
          },
          () => { /* ignore per-frame scan failures */ },
        )

        if (cancelled) return

        // After the stream is live, try to optimise focus/zoom based on what the
        // device actually supports. We never request a fixed/macro focus, and we
        // never simulate capabilities the browser does not expose.
        try {
          const caps = scanner.getRunningTrackCapabilities() as unknown as Record<string, unknown>
          const constraints: Record<string, unknown> = {}
          // Prefer continuous autofocus when the browser advertises it.
          const focusModes = (caps as { focusMode?: string[] }).focusMode
          if (Array.isArray(focusModes) && focusModes.includes('continuous')) {
            constraints.focusMode = 'continuous'
          }
          // Avoid unnecessary digital zoom: keep 1x when the range includes it.
          const zoomCap = (caps as { zoom?: { min?: number; max?: number } }).zoom
          if (zoomCap && typeof zoomCap.min === 'number' && typeof zoomCap.max === 'number') {
            if (zoomCap.min <= 1 && zoomCap.max >= 1) {
              constraints.zoom = 1
            }
          }
          if (Object.keys(constraints).length > 0) {
            await scanner.applyVideoConstraints(constraints as MediaTrackConstraints).catch(() => { /* unsupported */ })
          }
        } catch { /* capability detection not available; rely on browser defaults */ }

        // Show a hint if nothing is detected after a few seconds.
        helpTimer = window.setTimeout(() => {
          if (!cancelled && !detectedRef.current) {
            setHelpVisible(true)
          }
        }, 8000)
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
      if (helpTimer !== null) window.clearTimeout(helpTimer)
      if (scannerRef.current) {
        try { scannerRef.current.stop() } catch { /* ignore */ }
        try { scannerRef.current.clear() } catch { /* ignore */ }
        scannerRef.current = null
      }
    }
  }, [open])

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
            <div id="barcode-reader" ref={readerRef} className="overflow-hidden rounded-xl border border-line bg-black" style={{ minHeight: 240 }} />
            <p className="text-xs text-muted text-center">
              Acerca el código lentamente hasta que se vea nítido. Evita pegarlo a la cámara.
            </p>
            {error && (
              <p className="text-xs text-rose-400">{error}</p>
            )}
            {helpVisible && !error && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <p className="text-xs text-amber-300">
                  No se detecta el código. Prueba a alejar un poco el móvil, mantenerlo estable y con buena iluminación.
                </p>
              </div>
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
