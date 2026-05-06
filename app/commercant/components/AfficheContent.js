'use client'

import { useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { toSlug } from '@/lib/utils'

function AutoFitLine({ text, style }) {
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
  return <div ref={ref} style={style}>{text}</div>
}

export default function AfficheContent({ commerce }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: 'white' }}>
      <img
        src="/affiche-bonmoment.png"
        alt="Affiche BONMOMENT"
        crossOrigin="anonymous"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
      />

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
          whiteSpace: 'nowrap',
          overflow: 'hidden',
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
          whiteSpace: 'nowrap',
          overflow: 'hidden',
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
