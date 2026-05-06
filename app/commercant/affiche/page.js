'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'
import { toSlug } from '@/lib/utils'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

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
  const [isGenerating, setIsGenerating] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const afficheRef = useRef(null)

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

  const downloadPDF = async () => {
    if (!afficheRef.current || isGenerating) return
    setIsGenerating(true)

    try {
      const canvas = await html2canvas(afficheRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#FFFFFF',
        width: afficheRef.current.offsetWidth,
        height: afficheRef.current.offsetHeight,
        logging: false,
      })

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth = 210
      const pageHeight = 297
      let finalWidth = pageWidth
      let finalHeight = (canvas.height * pageWidth) / canvas.width

      if (finalHeight > pageHeight) {
        finalHeight = pageHeight
        finalWidth = (canvas.width * pageHeight) / canvas.height
      }

      const xOffset = (pageWidth - finalWidth) / 2
      const yOffset = (pageHeight - finalHeight) / 2

      const imgData = canvas.toDataURL('image/png', 1.0)
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight)

      const nomCommerce = commerce?.nom || 'commerce'
      const nomFichier = `affiche-bonmoment-${nomCommerce.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`
      pdf.save(nomFichier)
    } catch (error) {
      console.error('Erreur génération PDF:', error)
      alert('Erreur lors de la génération du PDF. Réessayez.')
    } finally {
      setIsGenerating(false)
    }
  }

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
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '16px' }}>
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
          onClick={downloadPDF}
          disabled={isGenerating || !imageLoaded}
          style={{
            background: isGenerating || !imageLoaded ? '#ccc' : '#FF6B00',
            color: 'white',
            border: 'none',
            padding: '14px 28px',
            borderRadius: '8px',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 600,
            fontSize: '16px',
            cursor: isGenerating || !imageLoaded ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {isGenerating ? '⏳ Génération en cours...' : '📥 Télécharger mon affiche (PDF)'}
        </button>
      </div>

      <div ref={afficheRef} className="affiche-container">
        <img
          src="/affiche-bonmoment.png"
          alt="Affiche BONMOMENT"
          className="affiche-fond"
          crossOrigin="anonymous"
          onLoad={() => setImageLoaded(true)}
        />

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
