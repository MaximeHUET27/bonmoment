'use client'

import { useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { toSlug } from '@/lib/utils'

// Mesure le texte via un <span> interne → pas besoin d'overflow:hidden sur le conteneur,
// ce qui évite le clipping agressif de html2canvas.
function AutoFitLine({ text, style }) {
  const containerRef = useRef(null)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const span = container.querySelector('span')
    if (!span) return
    let size = 20
    span.style.fontSize = size + 'px'
    while (span.offsetWidth > container.clientWidth && size > 7) {
      size -= 0.5
      span.style.fontSize = size + 'px'
    }
  }, [text])
  return (
    <div ref={containerRef} style={style}>
      <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>{text}</span>
    </div>
  )
}

export default function AfficheContent({ commerce, logoAssoUrl }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: 'white' }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- rendu pour html2canvas, contexte hors Next.js */}
      <img
        src="/affiche-bonmoment.png"
        alt="Affiche BONMOMENT"
        crossOrigin="anonymous"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
      />

      {/* Logo mairie/asso : haut à droite, dans la zone libre (aucun élément overlay ici)
          Position : 15px du bord supérieur, 15px du bord droit.
          Marges par rapport aux éléments overlay les plus proches :
          - Commerce nom (top 28.5% = ~320px, droite ~427px) : 272px de distance horizontale ✓
          - Le logo ne dépasse pas le bas de la zone haute (top 15 → 95px vs nom à 320px) ✓
          Validation visuelle requise par Maxime : vérifier que l'image /affiche-bonmoment.png
          n'a pas d'élément dans ce coin. */}
      {logoAssoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- rendu pour html2canvas, contexte hors Next.js
        <img
          src={logoAssoUrl}
          alt="Logo partenaire"
          crossOrigin="anonymous"
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            width: '80px',
            height: '80px',
            objectFit: 'contain',
            zIndex: 10,
          }}
        />
      )}

      <AutoFitLine
        text={commerce.nom}
        style={{
          position: 'absolute',
          top: '28.5%',
          left: '11.5%',
          width: '42.25%',
          textAlign: 'center',
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 800,
          fontSize: '20px',
          color: '#0A0A0A',
          textTransform: 'uppercase',
          overflow: 'visible',
          zIndex: 10,
        }}
      />

      <div style={{ position: 'absolute', top: '36.75%', left: '11.5%', width: '42.25%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <QRCodeSVG
          value={`https://bonmoment.app/commercant/${commerce.id}`}
          size={305}
          level="H"
          bgColor="transparent"
        />
      </div>

      <AutoFitLine
        text={commerce.ville}
        style={{
          position: 'absolute',
          top: '72.5%',
          left: '14.8%',
          width: '19%',
          textAlign: 'center',
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 800,
          fontSize: '20px',
          color: '#0A0A0A',
          textTransform: 'uppercase',
          overflow: 'visible',
          zIndex: 10,
        }}
      />

      <div style={{ position: 'absolute', top: '78.25%', left: '14.8%', width: '19.1%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <QRCodeSVG
          value={`https://bonmoment.app/ville/${toSlug(commerce.ville)}`}
          size={140}
          level="H"
          bgColor="transparent"
        />
      </div>
    </div>
  )
}
