'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { toSlug } from '@/lib/utils'

/* ── Haversine ────────────────────────────────────────────────────────────── */
function haversine(lat1, lon1, lat2, lon2) {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a    = Math.sin(dLat / 2) ** 2 +
               Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
               Math.sin(dLon / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

/**
 * Overlay mobile-friendly de sélection de commune.
 *
 * @param {boolean}  isOpen
 * @param {function} onClose
 * @param {Array}    villesBonmoment   [{id, nom}] — villes BONMOMENT actives
 * @param {function} onSelectActive    (nomVille) → appelé quand ville active choisie
 *                                     si null → navigation vers /ville/[slug]
 * @param {function} onSubscribed      (nomVille) → appelé après abonnement (optionnel)
 */
export default function VilleSearchOverlay({
  isOpen,
  onClose,
  villesBonmoment = [],
  onSelectActive  = null,
  onSubscribed    = null,
}) {
  const router              = useRouter()
  const { user, supabase }  = useAuth()

  const [query,           setQuery]           = useState('')
  const [results,         setResults]         = useState([])
  const [searching,       setSearching]       = useState(false)
  const [phase,           setPhase]           = useState('search') // 'search' | 'proches'
  const [communeChoisie,  setCommuneChoisie]  = useState(null)
  const [voisines,        setVoisines]        = useState([])
  const [loadingVoisines, setLoadingVoisines] = useState(false)
  const [abonnesLocal,    setAbonnesLocal]    = useState(new Set())
  const [abonnement,      setAbonnement]      = useState(null)

  const inputRef = useRef(null)
  const debounce = useRef(null)

  const villesActivesSet = new Set(villesBonmoment.map(v => v.nom.toLowerCase()))

  /* Reset à l'ouverture */
  useEffect(() => {
    if (!isOpen) return
    setQuery('')
    setResults([])
    setPhase('search')
    setCommuneChoisie(null)
    setVoisines([])
    setAbonnesLocal(new Set())
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [isOpen])

  /* Debounce search geo.api.gouv.fr */
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    if (!query.trim() || query.length < 2) { setResults([]); return }

    debounce.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res  = await fetch(
          `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(query)}&fields=nom,code,codeDepartement,population&boost=population&limit=10`
        )
        const data = await res.json()
        data.sort((a, b) => {
          const aA = villesActivesSet.has(a.nom.toLowerCase()) ? 0 : 1
          const bA = villesActivesSet.has(b.nom.toLowerCase()) ? 0 : 1
          return aA - bA
        })
        setResults(data)
      } catch {}
      setSearching(false)
    }, 300)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  /* ── Sélection d'une commune ── */
  async function handleSelectCommune(commune) {
    const isActive = villesActivesSet.has(commune.nom.toLowerCase())

    if (isActive) {
      const villeBm = villesBonmoment.find(v => v.nom.toLowerCase() === commune.nom.toLowerCase())
      const nom = villeBm?.nom || commune.nom
      if (onSelectActive) onSelectActive(nom)
      else router.push(`/ville/${toSlug(nom)}`)
      onClose()
      return
    }

    /* Commune inactive → chercher villes actives proches */
    setPhase('proches')
    setCommuneChoisie(commune)
    setLoadingVoisines(true)
    setVoisines([])

    try {
      const centreRes  = await fetch(
        `https://geo.api.gouv.fr/communes?code=${commune.code}&fields=nom,centre`
      )
      const centreData = await centreRes.json()
      const coords     = centreData[0]?.centre?.coordinates // [lon, lat]

      if (!coords) { setLoadingVoisines(false); return }
      const [lon, lat] = coords

      const rayonRes    = await fetch(
        `https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lon}&rayon=20000&fields=nom,code,centre`
      )
      const voisinesGeo = await rayonRes.json()
      const voisinesMap  = new Map(voisinesGeo.map(c => [c.nom.toLowerCase(), c]))

      const proches = []
      for (const villeBm of villesBonmoment) {
        const geoMatch = voisinesMap.get(villeBm.nom.toLowerCase())
        let distance   = null

        if (geoMatch?.centre?.coordinates) {
          const [vLon, vLat] = geoMatch.centre.coordinates
          distance = haversine(lat, lon, vLat, vLon)
        } else {
          try {
            const r = await fetch(
              `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(villeBm.nom)}&fields=nom,centre&limit=1`
            )
            const d = await r.json()
            const c = d[0]?.centre?.coordinates
            if (c) distance = haversine(lat, lon, c[1], c[0])
          } catch {}
        }

        if (distance !== null && distance <= 50) {
          const { count } = await supabase
            .from('offres')
            .select('id, commerces!inner(ville)', { count: 'exact', head: true })
            .eq('statut', 'active')
            .gt('date_fin', new Date().toISOString())
            .eq('commerces.ville', villeBm.nom)
          proches.push({ ...villeBm, distance, nbOffres: count || 0 })
        }
      }

      proches.sort((a, b) => a.distance - b.distance)
      setVoisines(proches)
    } catch {}

    setLoadingVoisines(false)
  }

  /* ── Abonnement ── */
  async function subscriberVille(nomVille) {
    if (!user || !supabase) return
    setAbonnement(nomVille)

    const { data: current } = await supabase
      .from('users')
      .select('villes_abonnees')
      .eq('id', user.id)
      .single()

    const existant = current?.villes_abonnees || []
    if (!existant.includes(nomVille)) {
      await supabase
        .from('users')
        .update({ villes_abonnees: [...existant, nomVille] })
        .eq('id', user.id)
    }

    setAbonnesLocal(prev => new Set([...prev, nomVille]))
    setAbonnement(null)
    onSubscribed?.(nomVille)
  }

  async function subscriberTout() {
    for (const v of voisines) {
      if (!abonnesLocal.has(v.nom)) await subscriberVille(v.nom)
    }
  }

  if (!isOpen) return null

  const nbNonAbonnes = voisines.filter(v => !abonnesLocal.has(v.nom)).length

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">

      {/* Fond assombri */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panneau */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh]">

        {/* Handle mobile */}
        <div className="flex justify-center pt-3 pb-0 sm:hidden">
          <div className="w-10 h-1 bg-[#E0E0E0] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#F0F0F0]">
          {phase === 'proches' ? (
            <button
              onClick={() => { setPhase('search'); setCommuneChoisie(null); setVoisines([]) }}
              className="flex items-center gap-1.5 text-sm font-bold text-[#FF6B00] min-h-[36px]"
            >
              ← Retour
            </button>
          ) : (
            <p className="text-sm font-black text-[#0A0A0A]">Choisir une ville</p>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F5F5F5] text-[#3D3D3D] font-bold hover:bg-[#E0E0E0] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* ── Phase : recherche ── */}
        {phase === 'search' && (
          <>
            <div className="px-4 py-3 border-b border-[#F0F0F0]">
              <div className="flex items-center gap-2 bg-[#F5F5F5] rounded-xl px-3 py-2.5">
                <span>🔍</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Recherche ta ville..."
                  className="flex-1 bg-transparent text-sm text-[#0A0A0A] placeholder-[#3D3D3D]/40 outline-none"
                  autoComplete="off"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="text-[#3D3D3D]/40 hover:text-[#3D3D3D] text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {searching && (
                <div className="flex justify-center py-8">
                  <span className="w-6 h-6 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!searching && query.length >= 2 && results.length === 0 && (
                <p className="text-center text-sm text-[#3D3D3D]/50 py-8">
                  Aucune commune trouvée.
                </p>
              )}

              {/* Liste des villes BONMOMENT actives quand pas encore de recherche */}
              {!searching && query.length < 2 && villesBonmoment.length > 0 && (
                <div className="px-4 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D3D3D]/40 mb-3">
                    Villes actives sur BONMOMENT
                  </p>
                  {villesBonmoment.map(v => (
                    <button
                      key={v.id}
                      onClick={() => handleSelectCommune({ nom: v.nom, code: '' })}
                      className="w-full flex items-center justify-between py-3.5 border-b border-[#F5F5F5] last:border-0 hover:bg-[#FFF0E0] rounded-xl px-2 transition-colors min-h-[48px]"
                    >
                      <span className="text-sm font-bold text-[#0A0A0A]">📍 {v.nom}</span>
                      <span className="text-[10px] font-bold text-white bg-[#FF6B00] px-2 py-0.5 rounded-full">
                        Offres dispo
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Résultats de recherche */}
              {!searching && results.map(c => {
                const isActive = villesActivesSet.has(c.nom.toLowerCase())
                return (
                  <button
                    key={c.code}
                    onClick={() => handleSelectCommune(c)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#FFF0E0] transition-colors border-b border-[#F5F5F5] last:border-0 min-h-[52px]"
                  >
                    <div className="text-left min-w-0">
                      <p className={`text-sm font-bold ${isActive ? 'text-[#0A0A0A]' : 'text-[#3D3D3D]'}`}>
                        {c.nom}
                      </p>
                      {!isActive && (
                        <p className="text-[11px] text-[#3D3D3D]/50">
                          Dép. {c.codeDepartement}
                          {c.population ? ` · ${c.population.toLocaleString('fr-FR')} hab.` : ''}
                        </p>
                      )}
                    </div>
                    {isActive ? (
                      <span className="text-[10px] font-bold text-white bg-[#FF6B00] px-2 py-0.5 rounded-full shrink-0 ml-2">
                        Offres dispo
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#3D3D3D]/40 shrink-0 ml-2">Voir les villes proches →</span>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* ── Phase : communes proches ── */}
        {phase === 'proches' && (
          <div className="overflow-y-auto flex-1 px-5 py-5 flex flex-col gap-4">
            <div>
              <p className="text-sm font-black text-[#0A0A0A]">
                Pas encore de commerçant à {communeChoisie?.nom}.
              </p>
              <p className="text-xs text-[#3D3D3D]/60 mt-1">
                Voici les villes actives proches :
              </p>
            </div>

            {loadingVoisines && (
              <div className="flex justify-center py-8">
                <span className="w-6 h-6 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loadingVoisines && voisines.length === 0 && (
              <div className="text-center py-8">
                <p className="text-5xl mb-3">🗺️</p>
                <p className="text-sm font-bold text-[#0A0A0A]">
                  Aucune ville active dans un rayon de 20 km
                </p>
                <p className="text-xs text-[#3D3D3D]/50 mt-2">
                  Abonne-toi quand même pour être prévenu dès l'ouverture !
                </p>
                {villesBonmoment[0] && (
                  <button
                    onClick={() => subscriberVille(villesBonmoment[0].nom)}
                    disabled={abonnesLocal.has(villesBonmoment[0].nom) || abonnement === villesBonmoment[0].nom}
                    className="mt-4 bg-[#FF6B00] text-white font-bold text-sm px-5 py-3 rounded-2xl hover:bg-[#CC5500] transition-colors disabled:opacity-60"
                  >
                    {abonnesLocal.has(villesBonmoment[0].nom)
                      ? `✅ Abonné à ${villesBonmoment[0].nom}`
                      : `S'abonner à ${villesBonmoment[0].nom}`}
                  </button>
                )}
              </div>
            )}

            {!loadingVoisines && voisines.map(v => {
              const isAbonne = abonnesLocal.has(v.nom)
              return (
                <div
                  key={v.id}
                  className="flex items-center justify-between py-3 border-b border-[#F5F5F5] last:border-0 gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#0A0A0A]">
                      📍 {v.nom}
                      <span className="text-xs font-normal text-[#3D3D3D]/50 ml-1.5">
                        ({v.distance} km)
                      </span>
                    </p>
                    <p className="text-[11px] text-[#3D3D3D]/50">
                      {v.nbOffres > 0
                        ? `${v.nbOffres} offre${v.nbOffres > 1 ? 's' : ''} en cours`
                        : 'Aucune offre en cours'}
                    </p>
                  </div>
                  <button
                    onClick={() => subscriberVille(v.nom)}
                    disabled={isAbonne || abonnement === v.nom}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors min-h-[36px] shrink-0 ${
                      isAbonne
                        ? 'bg-[#FF6B00] text-white'
                        : 'border border-[#FF6B00] text-[#FF6B00] hover:bg-[#FFF0E0]'
                    } disabled:opacity-60`}
                  >
                    {abonnement === v.nom ? (
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                    ) : isAbonne ? '✅ Abonné' : "S'abonner"}
                  </button>
                </div>
              )
            })}

            {!loadingVoisines && nbNonAbonnes > 1 && (
              <button
                onClick={subscriberTout}
                className="w-full bg-[#FF6B00] hover:bg-[#CC5500] text-white font-bold text-sm py-3.5 rounded-2xl transition-colors"
              >
                S'abonner aux {nbNonAbonnes} villes proches
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
