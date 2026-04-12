'use client'

import { useEffect, useState, useCallback } from 'react'
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api'
import Image from 'next/image'
import Link from 'next/link'

const LIBRARIES = ['places']

const ORANGE = '#FF6B00'
const GRAY   = '#9CA3AF'
const RED    = '#EF4444'

/* ── Timer offre ─────────────────────────────────────────────────────────── */
function Timer({ dateFin }) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    function calc() {
      const diff = new Date(dateFin) - new Date()
      if (diff <= 0) { setLabel('Expirée'); return }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      if (h > 48) {
        setLabel(`${Math.floor(h / 24)}j restants`)
      } else if (h > 0) {
        setLabel(`${h}h ${m}m`)
      } else {
        setLabel(`${m}m ${s}s`)
      }
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [dateFin])

  return <span style={{ fontWeight: 700, color: ORANGE }}>{label}</span>
}

/* ── Icône marker SVG (orange = offre active, gris = inactif) ─────────────── */
function getMarkerIcon(hasOffre, isSelected) {
  const color = hasOffre ? ORANGE : GRAY
  const size  = hasOffre ? 32 : 22
  const ring  = isSelected ? 4 : 3
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - ring}" fill="${color}" stroke="white" stroke-width="${ring}"/>` +
    (hasOffre
      ? `<circle cx="${size - 5}" cy="5" r="4" fill="${RED}" stroke="white" stroke-width="1.5"/>`
      : '') +
    `</svg>`
  )
  return {
    url: `data:image/svg+xml;charset=UTF-8,${svg}`,
    scaledSize: new window.google.maps.Size(size, size),
    anchor:     new window.google.maps.Point(size / 2, size / 2),
  }
}

/* ── Composant principal ─────────────────────────────────────────────────── */
export default function CarteVille({ villeNom, villeLat, villeLng }) {
  const [commerces,  setCommerces]  = useState([])
  const [selected,   setSelected]   = useState(null)
  const [mapReady,   setMapReady]   = useState(false)
  const [isMobile,   setIsMobile]   = useState(false)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY,
    libraries: LIBRARIES,
  })

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    setIsMobile(mq.matches)
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    fetch(`/api/carte?ville=${encodeURIComponent(villeNom)}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCommerces(data) })
      .catch(() => {})
  }, [villeNom])

  // Géocode côté client les commerces sans coords (clé Maps déjà chargée dans le navigateur)
  useEffect(() => {
    if (!isLoaded || commerces.length === 0) return
    const sansCoords = commerces.filter(c => !c.latitude && c.place_id)
    if (sansCoords.length === 0) return

    const geocoder = new window.google.maps.Geocoder()
    sansCoords.forEach(c => {
      geocoder.geocode({ placeId: c.place_id }, (results, status) => {
        if (status !== 'OK' || !results?.[0]?.geometry?.location) return
        const lat = results[0].geometry.location.lat()
        const lng = results[0].geometry.location.lng()
        setCommerces(prev => prev.map(p =>
          p.id === c.id ? { ...p, latitude: lat, longitude: lng } : p
        ))
        fetch('/api/carte/update-coords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: c.id, latitude: lat, longitude: lng }),
        }).catch(() => {})
      })
    })
  }, [isLoaded, commerces.length])

  const handleMarkerClick = useCallback((commerce) => {
    setSelected(prev => prev?.id === commerce.id ? null : commerce)
  }, [])

  if (!isLoaded) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9CA3AF', fontSize: 14 }}>Chargement de la carte…</p>
      </div>
    )
  }

  const infoMaxWidth = 340

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={{ lat: villeLat, lng: villeLng }}
        zoom={14}
        onLoad={() => setMapReady(true)}
        onClick={() => setSelected(null)}
        options={{
          clickableIcons:      false,
          zoomControl:         true,
          streetViewControl:   false,
          mapTypeControl:      false,
          fullscreenControl:   false,
          styles: [
            { featureType: 'poi',          elementType: 'labels', stylers: [{ visibility: 'off' }] },
            { featureType: 'poi.business',                         stylers: [{ visibility: 'off' }] },
          ],
        }}
      >
        {mapReady && commerces
          .filter(c => typeof c.latitude === 'number' && typeof c.longitude === 'number')
          .map(c => (
            <MarkerF
              key={c.id}
              position={{ lat: c.latitude, lng: c.longitude }}
              onClick={() => handleMarkerClick(c)}
              icon={getMarkerIcon(!!c.offre_active, selected?.id === c.id)}
            />
          ))}

        {mapReady && selected && (
          <InfoWindowF
            position={{ lat: selected.latitude, lng: selected.longitude }}
            onCloseClick={() => setSelected(null)}
            options={{
              maxWidth:    infoMaxWidth,
              pixelOffset: new window.google.maps.Size(0, -24),
            }}
          >
            <div style={{
              fontFamily: 'Arial, sans-serif',
              width: isMobile ? '85vw' : 300,
              maxWidth: 320,
              boxSizing: 'border-box',
              overflowX: 'hidden',
            }}>
              {/* Photo */}
              {selected.photo_url && (
                <div style={{ position: 'relative', height: 120, margin: '-8px 0 10px', overflow: 'hidden', borderRadius: '8px 8px 0 0' }}>
                  <Image
                    src={selected.photo_url}
                    alt={selected.nom}
                    fill
                    style={{ objectFit: 'cover' }}
                    unoptimized
                  />
                </div>
              )}

              {/* Nom + note (note masquée sur mobile) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <p style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: '#0A0A0A',
                  lineHeight: 1.3,
                  flex: 1,
                  margin: 0,
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}>
                  {selected.nom}
                </p>
                {!isMobile && selected.note_google && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: ORANGE,
                    background: '#FFF0E0',
                    padding: '2px 7px',
                    borderRadius: 20,
                    whiteSpace: 'nowrap',
                    marginLeft: 8,
                    flexShrink: 0,
                  }}>
                    ⭐ {selected.note_google}
                  </span>
                )}
              </div>

              {/* Offre active */}
              {selected.offre_active ? (
                <div style={{ background: '#FFF0E0', borderRadius: 8, padding: '7px 9px', marginBottom: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: ORANGE, marginBottom: 2, wordBreak: 'break-word' }}>
                    🔥 {selected.offre_active.titre}
                  </p>
                  <p style={{ fontSize: 11, color: '#3D3D3D', margin: 0 }}>
                    ⏱️ Expire dans : <Timer dateFin={selected.offre_active.date_fin} />
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>Pas d&apos;offre en ce moment</p>
              )}

              {/* Boutons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {selected.offre_active ? (
                  <Link
                    href={`/offre/${selected.offre_active.id}`}
                    style={{
                      display: 'block',
                      width: '100%',
                      background: ORANGE,
                      color: 'white',
                      fontWeight: 700,
                      fontSize: 14,
                      borderRadius: 9,
                      padding: '8px 0',
                      textAlign: 'center',
                      textDecoration: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    Voir l&apos;offre
                  </Link>
                ) : (
                  <Link
                    href={`/commercant/${selected.id}`}
                    style={{
                      display: 'block',
                      width: '100%',
                      background: '#F5F5F5',
                      color: '#0A0A0A',
                      fontWeight: 700,
                      fontSize: 14,
                      borderRadius: 9,
                      padding: '8px 0',
                      textAlign: 'center',
                      textDecoration: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    Voir le commerce
                  </Link>
                )}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selected.latitude},${selected.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    width: '100%',
                    background: 'white',
                    color: ORANGE,
                    fontWeight: 700,
                    fontSize: 14,
                    borderRadius: 9,
                    padding: '8px 0',
                    textAlign: 'center',
                    textDecoration: 'none',
                    border: `1.5px solid ${ORANGE}`,
                    boxSizing: 'border-box',
                  }}
                >
                  📍 S&apos;y rendre
                </a>
              </div>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  )
}
