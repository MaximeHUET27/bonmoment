'use client'

/**
 * Composant scanner QR code — chargé uniquement côté client (ssr: false).
 * Utilise html5-qrcode pour accéder à la caméra et décoder les QR codes.
 */

import { useEffect, useRef } from 'react'

async function safeStop(scanner) {
  try {
    await scanner.stop()
  } catch {
    // scanner n'était pas en cours — on ignore
  }
}

export default function QrScanner({ onDetect, active }) {
  const scannerRef    = useRef(null)
  const detectedRef   = useRef(false)
  const isStartedRef  = useRef(false)  // true uniquement après start() résolu

  useEffect(() => {
    if (!active) return

    detectedRef.current  = false
    isStartedRef.current = false

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      const scanner = new Html5Qrcode('qr-reader-div')
      scannerRef.current = scanner

      return scanner.start(
        { facingMode: 'environment' },
        {
          fps:   10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (text) => {
          if (detectedRef.current) return
          detectedRef.current = true
          safeStop(scanner).finally(() => onDetect(text))
        },
        () => {} // erreur par frame — normal, on ignore
      ).then(() => {
        isStartedRef.current = true
      })
    }).catch(() => {})

    return () => {
      const s = scannerRef.current
      if (!s || !isStartedRef.current) {
        scannerRef.current = null
        return
      }
      isStartedRef.current = false
      safeStop(s).finally(() => {
        s.clear?.()
        scannerRef.current = null
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-black">
      {/* Styles pour masquer l'UI native de html5-qrcode */}
      <style>{`
        #qr-reader-div { border: none !important; }
        #qr-reader-div__scan_region > img { display: none !important; }
        #qr-reader-div__dashboard { display: none !important; }
        #qr-reader-div__status_span { display: none !important; }
        #qr-reader-div video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
      `}</style>

      {/* Div cible de html5-qrcode */}
      <div id="qr-reader-div" className="w-full" style={{ minHeight: 300 }} />

      {/* Overlay avec coins oranges — style scanner moderne */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {/* Fond semi-transparent autour du cadre */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Cadre de visée 250×250 */}
        <div className="relative z-10 w-[250px] h-[250px]">
          {/* Découpe du fond sur le cadre */}
          <div className="absolute inset-0 bg-transparent" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }} />

          {/* Coin haut-gauche */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-[4px] border-l-[4px] border-[#FF6B00] rounded-tl-sm" />
          {/* Coin haut-droit */}
          <div className="absolute top-0 right-0 w-8 h-8 border-t-[4px] border-r-[4px] border-[#FF6B00] rounded-tr-sm" />
          {/* Coin bas-gauche */}
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[4px] border-l-[4px] border-[#FF6B00] rounded-bl-sm" />
          {/* Coin bas-droit */}
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[4px] border-r-[4px] border-[#FF6B00] rounded-br-sm" />

          {/* Ligne de scan animée */}
          <div className="absolute left-2 right-2 h-[2px] bg-[#FF6B00]/70 rounded-full animate-[scanLine_2s_ease-in-out_infinite]" />
        </div>
      </div>

      <style>{`
        @keyframes scanLine {
          0%   { top: 8px; }
          50%  { top: calc(100% - 8px); }
          100% { top: 8px; }
        }
        #qr-reader-div .absolute { top: var(--scan-top, 8px); }
      `}</style>
    </div>
  )
}
