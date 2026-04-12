'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'
import { toSlug } from '@/lib/utils'

function AutoFitLine({ text, className }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let size = 20
    el.style.fontSize = size + 'px'
    while (el.scrollWidth > el.clientWidth && size > 7) {
      size -= 0.5
      el.style.fontSize = size + 'px'
    }
  }, [text])
  return <div ref={ref} className={className}>{text}</div>
}

function AficheInner() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const commerceId   = searchParams.get('id')
  const [commerce, setCommerce] = useState(null)
  const [notFound, setNotFound] = useState(false)

  // Cacher footer + chatbot du layout global sur cette page
  useEffect(() => {
    document.body.classList.add('affiche-page')
    return () => document.body.classList.remove('affiche-page')
  }, [])

  useEffect(() => {
    if (!commerceId) { setNotFound(true); return }
    const supabase = createClient()
    supabase
      .from('commerces')
      .select('id, nom, ville')
      .eq('id', commerceId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) setNotFound(true)
        else setCommerce(data)
      })
  }, [commerceId])

  if (notFound) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', fontFamily: 'Montserrat, sans-serif' }}>
        <p style={{ fontSize: '18px', color: '#3D3D3D' }}>Commerce introuvable.</p>
      </div>
    )
  }

  if (!commerce) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', fontFamily: 'Montserrat, sans-serif' }}>
        <p style={{ color: '#9CA3AF' }}>Chargement…</p>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: #F5F5F5; }

        .affiche-container {
          position: relative;
          width: 210mm;
          height: 297mm;
          margin: 0 auto;
          overflow: hidden;
          background: white;
        }

        .affiche-fond {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        /* Écran téléphone : x 11.5%–53.75%, y 35.2%–65.1% (mesuré par analyse pixel) */
        .overlay-nom-commerce {
          position: absolute;
          top: 31%;
          left: 11.5%;
          width: 42.25%;
          text-align: center;
          font-family: 'Montserrat', sans-serif;
          font-weight: 800;
          font-size: 20px;
          color: #0A0A0A;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
        }

        .overlay-qr-commerce {
          position: absolute;
          top: 36.75%;
          left: 11.5%;
          width: 42.25%;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        /* Petit cadre ville : x 14.8%–33.5%, y 77.3%–91.8% (mesuré par analyse pixel) */
        .overlay-nom-ville {
          position: absolute;
          top: 75%;
          left: 14.8%;
          width: 19%;
          text-align: center;
          font-family: 'Montserrat', sans-serif;
          font-weight: 800;
          font-size: 20px;
          color: #0A0A0A;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
        }

        .overlay-qr-ville {
          position: absolute;
          top: 78.25%;
          left: 14.8%;
          width: 19.1%;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        /* Cacher footer + chatbot du layout global sur cette page */
        body.affiche-page footer,
        body.affiche-page [aria-label="Ouvrir l'aide BONMOMENT"] {
          display: none !important;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          body {
            margin: 0;
            padding: 0;
            background: white;
          }

          footer, nav, header,
          [aria-label="Ouvrir l'aide BONMOMENT"],
          .no-print {
            display: none !important;
          }

          .affiche-container {
            width: 100%;
            height: 100vh;
            page-break-after: avoid;
          }
        }
      `}</style>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '16px' }}>
        <button
          onClick={() => router.push('/commercant/dashboard')}
          style={{
            background: 'transparent',
            color: '#FF6B00',
            border: '2px solid #FF6B00',
            padding: '10px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ← Retour
        </button>
        <button
          onClick={() => window.print()}
          style={{
            background: '#FF6B00',
            color: 'white',
            border: 'none',
            padding: '12px 32px',
            borderRadius: '8px',
            fontSize: '16px',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🖨️ Imprimer cette affiche
        </button>
      </div>

      <div className="affiche-container">
        <img src="/affiche-bonmoment.png" alt="Affiche BONMOMENT" className="affiche-fond" />

        <AutoFitLine text={commerce.nom} className="overlay-nom-commerce" />

        <div className="overlay-qr-commerce">
          <QRCodeSVG
            value={`https://bonmoment.app/commercant/${commerce.id}`}
            size={305}
            level="H"
            bgColor="transparent"
          />
        </div>

        <AutoFitLine text={commerce.ville} className="overlay-nom-ville" />

        <div className="overlay-qr-ville">
          <QRCodeSVG
            value={`https://bonmoment.app/ville/${toSlug(commerce.ville)}`}
            size={140}
            level="H"
            bgColor="transparent"
          />
        </div>
      </div>
    </>
  )
}

export default function AffichePage() {
  return (
    <Suspense fallback={
      <div style={{ textAlign: 'center', padding: '4rem', fontFamily: 'Montserrat, sans-serif' }}>
        <p style={{ color: '#9CA3AF' }}>Chargement…</p>
      </div>
    }>
      <AficheInner />
    </Suspense>
  )
}
