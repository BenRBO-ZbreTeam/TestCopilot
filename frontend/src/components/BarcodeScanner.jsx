import { useEffect, useRef, useState } from 'react'
import { X, Flashlight, Camera } from 'lucide-react'

export default function BarcodeScanner({ onDetected, onClose }) {
  const scannerRef = useRef(null)
  const instanceRef = useRef(null)
  const [error, setError] = useState('')
  const [torch, setTorch] = useState(false)
  const [cameras, setCameras] = useState([])
  const [activeCam, setActiveCam] = useState(null)
  const [scanning, setScanning] = useState(false)
  const lastDetected = useRef('')
  const lastTime = useRef(0)

  useEffect(() => {
    let html5QrCode

    async function startScanner() {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')

        const devices = await Html5Qrcode.getCameras()
        setCameras(devices)

        // Préférer la caméra arrière
        const backCam = devices.find(d =>
          /back|rear|environment|arrière/i.test(d.label)
        ) || devices[devices.length - 1]

        const camId = backCam?.id
        setActiveCam(camId)

        html5QrCode = new Html5Qrcode('qr-scanner-region', { verbose: false })
        instanceRef.current = html5QrCode

        await html5QrCode.start(
          camId || { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 260, height: 160 },
            aspectRatio: 1.7778,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.ITF,
            ],
          },
          (decodedText) => {
            const now = Date.now()
            // Debounce : même code pas plus de 1x par 2 secondes
            if (decodedText === lastDetected.current && now - lastTime.current < 2000) return
            lastDetected.current = decodedText
            lastTime.current = now

            // Vibration haptic si disponible
            if (navigator.vibrate) navigator.vibrate([50])

            onDetected(decodedText)
          },
          () => {}
        )
        setScanning(true)
      } catch (err) {
        if (err?.message?.includes('Permission')) {
          setError('Accès à la caméra refusé. Autorisez la caméra dans les paramètres.')
        } else if (err?.message?.includes('No cameras')) {
          setError('Aucune caméra détectée sur cet appareil.')
        } else {
          setError(`Impossible d'ouvrir la caméra : ${err.message}`)
        }
      }
    }

    startScanner()

    return () => {
      if (instanceRef.current) {
        instanceRef.current.stop().catch(() => {})
      }
    }
  }, [onDetected])

  async function toggleTorch() {
    if (!instanceRef.current) return
    try {
      const newState = !torch
      await instanceRef.current.applyVideoConstraints({ advanced: [{ torch: newState }] })
      setTorch(newState)
    } catch { /* Non supporté */ }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000', zIndex: 800,
      display: 'flex', flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 16px 8px',
        paddingTop: 'calc(16px + env(safe-area-inset-top))',
        background: 'rgba(0,0,0,.7)',
        backdropFilter: 'blur(10px)',
        position: 'relative', zIndex: 1,
      }}>
        <span style={{ color: 'white', fontSize: 15, fontWeight: 600 }}>Scanner un code-barres</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={toggleTorch}
            style={{
              background: torch ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.1)',
              border: 'none', color: 'white', padding: 8, borderRadius: 8, cursor: 'pointer'
            }}
            title="Lampe torche"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 2h8l1 7H7L8 2z"/>
              <path d="M7 9l-2 13h14L17 9"/>
              <line x1="12" y1="13" x2="12" y2="17"/>
            </svg>
          </button>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: 'white', padding: 8, borderRadius: 8, cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Zone scanner */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div id="qr-scanner-region" style={{ width: '100%', height: '100%' }} />

        {/* Overlay avec fenêtre de scan */}
        {scanning && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            {/* Coins du cadre */}
            <div style={{ position: 'relative', width: 260, height: 160 }}>
              {[
                { top: 0, left: 0, borderTop: '3px solid white', borderLeft: '3px solid white' },
                { top: 0, right: 0, borderTop: '3px solid white', borderRight: '3px solid white' },
                { bottom: 0, left: 0, borderBottom: '3px solid white', borderLeft: '3px solid white' },
                { bottom: 0, right: 0, borderBottom: '3px solid white', borderRight: '3px solid white' },
              ].map((style, i) => (
                <div key={i} style={{
                  position: 'absolute', width: 20, height: 20, ...style, borderRadius: 2
                }} />
              ))}
              {/* Ligne de scan animée */}
              <style>{`
                @keyframes scanLine {
                  0% { top: 8px; }
                  50% { top: calc(100% - 8px); }
                  100% { top: 8px; }
                }
              `}</style>
              <div style={{
                position: 'absolute', left: 4, right: 4, height: 1,
                background: 'rgba(255,255,255,.7)',
                animation: 'scanLine 2s ease-in-out infinite',
                boxShadow: '0 0 6px rgba(255,255,255,.5)'
              }} />
            </div>
            <p style={{
              color: 'rgba(255,255,255,.8)', fontSize: 13, marginTop: 16,
              textAlign: 'center', padding: '0 24px'
            }}>
              Centrez le code-barres dans le cadre
            </p>
          </div>
        )}

        {error && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center'
          }}>
            <div style={{
              background: 'rgba(255,59,48,.15)', border: '1px solid rgba(255,59,48,.4)',
              borderRadius: 12, padding: '20px 24px', color: 'white', maxWidth: 300
            }}>
              <p style={{ fontSize: 14, marginBottom: 16 }}>{error}</p>
              <button onClick={onClose} className="btn btn-secondary">Fermer</button>
            </div>
          </div>
        )}
      </div>

      {/* Pied */}
      <div style={{
        padding: '12px 16px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        background: 'rgba(0,0,0,.7)',
        backdropFilter: 'blur(10px)',
        textAlign: 'center',
      }}>
        <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>
          Codes EAN-8, EAN-13, Code128, UPC supportés
        </p>
      </div>
    </div>
  )
}
