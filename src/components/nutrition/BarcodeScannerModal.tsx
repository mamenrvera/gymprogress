import { useEffect, useRef, useState } from 'react'
import { Camera, FileImage, Keyboard, Loader2, Search, X, AlertCircle } from 'lucide-react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { isValidBarcode, normalizeBarcode } from '../../lib/openFoodFacts'

type Status = 'preparing' | 'scanning' | 'detected' | 'error'

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>('preparing')
  const [error, setError] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [manualError, setManualError] = useState<string | null>(null)
  const [mode, setMode] = useState<'camera' | 'manual'>('camera')
  const [helpVisible, setHelpVisible] = useState(false)
  const [imageScanning, setImageScanning] = useState(false)

  useEffect(() => {
    if (!open) return
    detectedRef.current = false
    setError(null)
    setManualCode('')
    setManualError(null)
    setMode('camera')
    setHelpVisible(false)
    setStatus('preparing')

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
            const code = normalizeBarcode(decodedText)
            if (!isValidBarcode(code)) return // ignore ambiguous reads
            detectedRef.current = true
            setStatus('detected')
            if (helpTimer !== null) {
              window.clearTimeout(helpTimer)
              helpTimer = null
            }
            try { scanner.stop() } catch { /* ignore */ }
            onDetectedRef.current(code)
          },
          () => { /* ignore per-frame scan failures */ },
        )

        if (cancelled) return
        setStatus('scanning')

        // Optimize focus/zoom based on capabilities
        try {
          const caps = scanner.getRunningTrackCapabilities() as unknown as Record<string, unknown>
          const constraints: Record<string, unknown> = {}
          const focusModes = (caps as { focusMode?: string[] }).focusMode
          if (Array.isArray(focusModes) && focusModes.includes('continuous')) {
            constraints.focusMode = 'continuous'
          }
          const zoomCap = (caps as { zoom?: { min?: number; max?: number } }).zoom
          if (zoomCap && typeof zoomCap.min === 'number' && typeof zoomCap.max === 'number') {
            if (zoomCap.min <= 1 && zoomCap.max >= 1) {
              constraints.zoom = 1
            }
          }
          if (Object.keys(constraints).length > 0) {
            await scanner.applyVideoConstraints(constraints as MediaTrackConstraints).catch(() => { /* unsupported */ })
          }
        } catch { /* capability detection not available */ }

        helpTimer = window.setTimeout(() => {
          if (!cancelled && !detectedRef.current) {
            setHelpVisible(true)
          }
        }, 8000)
      } catch (e) {
        if (cancelled) return
        console.error('[BarcodeScanner] Camera error:', e)
        setError('No se pudo acceder a la cámara. Introduce el código manualmente.')
        setStatus('error')
        setMode('manual')
      }
    }

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
    const code = normalizeBarcode(manualCode)
    if (!code) {
      setManualError('Introduce los números del código de barras.')
      return
    }
    if (!isValidBarcode(code)) {
      setManualError('El código no tiene un formato válido. Revisa los números impresos.')
      return
    }
    setManualError(null)
    setStatus('detected')
    onDetectedRef.current(code)
  }

  const handleImageScan = async (file: File | null) => {
    if (!file) return
    setImageScanning(true)
    setError(null)
    try {
      if (!scannerRef.current) {
        const scanner = new Html5Qrcode('barcode-reader', { verbose: false })
        scannerRef.current = scanner
      }
      const result = await scannerRef.current.scanFile(file, false)
      const code = normalizeBarcode(result)
      if (!isValidBarcode(code)) {
        setError('No se ha podido leer un código válido en la imagen. Intenta de nuevo.')
        return
      }
      setStatus('detected')
      onDetectedRef.current(code)
    } catch (e) {
      console.error('[BarcodeScanner] Image scan error:', e)
      setError('No se ha podido leer el código en la imagen. Prueba con otra foto o introduce el código manualmente.')
    } finally {
      setImageScanning(false)
    }
  }

  const statusText: Record<Status, string> = {
    preparing: 'Preparando cámara…',
    scanning: 'Buscando código…',
    detected: 'Código detectado',
    error: 'No se ha podido acceder a la cámara',
  }

  return (
    <Modal open={open} onClose={onClose} title="Escanear código de barras" icon={<Camera className="h-4 w-4" />} size="md">
      <div className="space-y-4">
        {mode === 'camera' ? (
          <>
            <div id="barcode-reader" ref={readerRef} className="overflow-hidden rounded-xl border border-line bg-black" style={{ minHeight: 240 }} />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">{statusText[status]}</span>
              {status === 'scanning' && <span className="text-faint">Coloca el código dentro del marco</span>}
            </div>
            <p className="text-xs text-muted text-center">
              Acerca el código lentamente hasta que se vea nítido. Evita pegarlo a la cámara.
            </p>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            {helpVisible && !error && status === 'scanning' && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <p className="text-xs text-amber-300">
                  No se detecta el código. Prueba a alejar un poco el móvil, mantenerlo estable y con buena iluminación.
                </p>
              </div>
            )}
            <div className="flex flex-wrap justify-between gap-2">
              <Button variant="ghost" onClick={() => setMode('manual')}>
                <Keyboard className="h-4 w-4 mr-1.5" /> Introducir código manualmente
              </Button>
              <Button variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={imageScanning}>
                {imageScanning ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileImage className="h-4 w-4 mr-1.5" />}
                Leer desde foto
              </Button>
              <Button variant="secondary" onClick={onClose}>
                <X className="h-4 w-4 mr-1.5" /> Cancelar
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { handleImageScan(e.target.files?.[0] ?? null); e.target.value = '' }}
            />
          </>
        ) : (
          <>
            <div>
              <label className="label" htmlFor="manual-barcode">Código de barras</label>
              <input
                id="manual-barcode"
                className="input"
                placeholder="Ej. 8480000107831"
                value={manualCode}
                onChange={(e) => { setManualCode(e.target.value.replace(/\D/g, '')); setManualError(null) }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit() }}
                inputMode="numeric"
                autoFocus
              />
              {manualError && <p className="text-xs text-rose-400 mt-1">{manualError}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setMode('camera')}>
                <Camera className="h-4 w-4 mr-1.5" /> Usar cámara
              </Button>
              <Button variant="secondary" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleManualSubmit} disabled={!manualCode.trim()}>
                <Search className="h-4 w-4 mr-1.5" /> Buscar producto
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
