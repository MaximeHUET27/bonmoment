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
  onSelectAll     = null,
  onSubscribed    = null,
}) {
  const router              = useRouter()
  const { user, supabase }  = useAuth()

  const [query,             setQuery]             = useState('')
  const [results,           setResults]           = useState([])
  const [searching,         setSearching]         = useState(false)
  const [phase,             setPhase]             = useState('search') // 'search' | 'proches'
  const [communeChoisie,    setCommuneChoisie]    = useState(null)
  const [voisines,          setVoisines]          = useState([])
  const [loadingVoisines,   setLoadingVoisines]   = useState(false)
  const [abonnesLocal,      setAbonnesLocal]      = useState(new Set())
  const [abonnement,        setAbonnement]        = useState(null)
  const [nbOffresMap,       setNbOffresMap]       = useState(new Map())
  const [villesAbonneesList, setVillesAbonneesList] = useState([])

  const [coordsBonmoment, setCoordsBonmoment] = useState(new Map())

  const inputRef       = useRef(null)
  const debounce       = useRef(null)
  const coordsLoaded   = useRef(false)
  const abortCtrl      = useRef(null)

  const villesActivesSet = new Set(villesBonmoment.map(v => v.nom.toLowerCase()))

  /* Reset + chargement des villes abonnées à l'ouverture */
  useEffect(() => {
    if (!isOpen) return
    setQuery('')
    setResults([])
    setPhase('search')
    setCommuneChoisie(null)
    setVoisines([])
    setAbonnesLocal(new Set())
    // Charger les villes abonnées du user connecté
    if (user && supabase) {
      supabase.from('users').select('villes_abonnees').eq('id', user.id).single()
        .then(({ data }) => setVillesAbonneesList(data?.villes_abonnees || []))
    } else {
      setVillesAbonneesList([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  /* Cache coordonnées GPS des villes BONMOMENT au premier montage */
  useEffect(() => {
    if (!isOpen || villesBonmoment.length === 0 || coordsLoaded.current) return
    coordsLoaded.current = true
    Promise.all(
      villesBonmoment.map(async v => {
        try {
          const r = await fetch(
            `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(v.nom)}&fields=nom,centre&limit=1`
          )
          const d = await r.json()
          const c = d[0]?.centre?.coordinates
          if (c) return [v.nom, { lat: c[1], lon: c[0] }]
        } catch {}
        return null
      })
    ).then(entries => {
      const map = new Map()
      entries.filter(Boolean).forEach(([nom, coords]) => map.set(nom, coords))
      setCoordsBonmoment(map)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  /* Compte les offres actives par ville — un seul appel au montage */
  useEffect(() => {
    if (!isOpen || !supabase) return
    supabase
      .from('offres')
      .select('commerces!inner(ville)')
      .eq('statut', 'active')
      .gt('date_fin', new Date().toISOString())
      .then(({ data }) => {
        const map = new Map()
        for (const o of (data || [])) {
          const ville = o.commerces?.ville
          if (ville) map.set(ville, (map.get(ville) || 0) + 1)
        }
        setNbOffresMap(map)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  /* Debounce search geo.api.gouv.fr avec AbortController */
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    if (abortCtrl.current) { abortCtrl.current.abort(); abortCtrl.current = null }

    if (!query.trim() || query.length < 2) { setResults([]); setSearching(false); return }

    setSearching(true)  // visible immédiatement dès la frappe

    debounce.current = setTimeout(async () => {
      const ctrl = new AbortController()
      abortCtrl.current = ctrl
      try {
        const isNumeric = /^\d/.test(query.trim())
        const calls = [
          fetch(
            `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(query)}&fields=nom,code,codeDepartement,codesPostaux,population&boost=population&limit=15`,
            { signal: ctrl.signal }
          ),
        ]
        if (isNumeric) {
          calls.push(fetch(
            `https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(query)}&fields=nom,code,codeDepartement,codesPostaux,population&boost=population&limit=15`,
            { signal: ctrl.signal }
          ))
        }
        const responses = await Promise.all(calls)
        const datasets  = await Promise.all(responses.map(r => r.json()))

        // Merge + dédup par code
        const seen = new Set()
        const merged = []
        for (const data of datasets) {
          for (const c of data) {
            if (!seen.has(c.code)) { seen.add(c.code); merged.push(c) }
          }
        }

        // Tri : villes actives d'abord, puis population décroissante
        merged.sort((a, b) => {
          const aA = villesActivesSet.has(a.nom.toLowerCase()) ? 0 : 1
          const bA = villesActivesSet.has(b.nom.toLowerCase()) ? 0 : 1
          if (aA !== bA) return aA - bA
          return (b.population || 0) - (a.population || 0)
        })
        setResults(merged)
        setSearching(false)
      } catch (e) {
        if (e.name !== 'AbortError') setSearching(false)
        // AbortError = nouvelle frappe a annulé la requête → ne pas modifier l'état
      }
    }, 600)
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
      // Récupère les coordonnées de la commune choisie
      let lat = null, lon = null
      try {
        const centreRes  = await fetch(
          `https://geo.api.gouv.fr/communes?code=${commune.code}&fields=nom,centre`
        )
        const centreData = await centreRes.json()
        const coords     = centreData[0]?.centre?.coordinates // [lon, lat]
        if (coords) { lon = coords[0]; lat = coords[1] }
      } catch {}

      // Filtre strictement < 20km (utilise le cache coordsBonmoment)
      const proches = []
      if (lat !== null && lon !== null) {
        for (const villeBm of villesBonmoment) {
          let bmLat = null, bmLon = null

          const cached = coordsBonmoment.get(villeBm.nom)
          if (cached) {
            bmLat = cached.lat; bmLon = cached.lon
          } else {
            try {
              const r = await fetch(
                `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(villeBm.nom)}&fields=nom,centre&limit=1`
              )
              const d = await r.json()
              const c = d[0]?.centre?.coordinates
              if (c) { bmLon = c[0]; bmLat = c[1] }
            } catch {}
          }

          if (bmLat === null) continue  // coords inconnues → skip
          const distance = haversine(lat, lon, bmLat, bmLon)
          if (distance >= 20) continue  // > 20km → skip

          const nbOffres = nbOffresMap.get(villeBm.nom) || 0
          proches.push({ ...villeBm, distance, nbOffres })
        }
      }
      // Si lat/lon non trouvées → proches vide → message "Aucune ville active..."

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
    setVillesAbonneesList(prev => prev.includes(nomVille) ? prev : [...prev, nomVille])
    setAbonnement(null)
    onSubscribed?.(nomVille)
  }

  async function subscriberTout() {
    for (const v of voisines) {
      if (!abonnesLocal.has(v.nom)) await subscriberVille(v.nom)
    }
  }

  /* Helper normalisation accents */
  function normalize(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  }

  /* Déduplique villesBonmoment par nom */
  const villesBonmomentUniq = villesBonmoment.filter(
    (v, i, arr) => arr.findIndex(x => x.nom.toLowerCase() === v.nom.toLowerCase()) === i
  )

  /* Villes BONMOMENT correspondant à la recherche (insensible aux accents) */
  const normQuery    = normalize(query)
  const localMatches = query.length >= 2
    ? villesBonmomentUniq.filter(v => normalize(v.nom).includes(normQuery))
    : []

  /* Résultats géo dédupliqués par code (point 3) */
  const resultsDedupliques = results.filter(
    (c, i, arr) => arr.findIndex(x => x.code === c.code) === i
  )

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
            {/* Contenu défilable */}
            <div className="overflow-y-auto flex-1">

              {/* ── Résultats de recherche (quand query >= 2) ── */}
              {query.length >= 2 && (
                <>
                  {searching && (
                    <p className="text-center text-sm text-[#3D3D3D]/50 py-8 flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin inline-block" />
                      Recherche...
                    </p>
                  )}
                  {!searching && results.length === 0 && localMatches.length === 0 && (
                    <p className="text-center text-sm text-[#3D3D3D]/50 py-8">
                      Aucune commune trouvée.
                    </p>
                  )}
                  {/* Villes BONMOMENT correspondant à la recherche */}
                  {!searching && localMatches.map(v => (
                    <button
                      key={`bm-${v.id}`}
                      onClick={() => handleSelectCommune({ nom: v.nom, code: '' })}
                      className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#FFF0E0] transition-colors border-b border-[#F5F5F5] last:border-0 min-h-[52px]"
                    >
                      <div className="text-left min-w-0">
                        <p className="text-sm font-bold text-[#0A0A0A]">{v.nom}</p>
                      </div>
                      {(() => {
                        const n = nbOffresMap.get(v.nom) ?? 0
                        return n > 0
                          ? <span className="text-[10px] font-bold text-white bg-[#FF6B00] px-2 py-0.5 rounded-full shrink-0 ml-2">{n} offre{n > 1 ? 's' : ''}</span>
                          : <span className="text-[10px] text-[#3D3D3D]/40 shrink-0 ml-2">0 offre</span>
                      })()}
                    </button>
                  ))}
                  {/* Autres communes via geo API */}
                  {!searching && resultsDedupliques
                    .filter(c => !villesActivesSet.has(c.nom.toLowerCase()))
                    .map(c => (
                      <button
                        key={c.code}
                        onClick={() => handleSelectCommune(c)}
                        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#FFF0E0] transition-colors border-b border-[#F5F5F5] last:border-0 min-h-[52px]"
                      >
                        <div className="text-left">
                          <p className="text-sm font-bold text-[#3D3D3D]">{c.nom}</p>
                          {c.codesPostaux?.[0] && (
                            <p className="text-xs text-[#3D3D3D]/40">{c.codesPostaux[0]}</p>
                          )}
                        </div>
                        <span className="text-[11px] text-[#3D3D3D]/40 shrink-0 ml-2">Voir les villes proches →</span>
                      </button>
                    ))}
                </>
              )}

              {/* ── Liste structurée (avant toute recherche) ── */}
              {query.length < 2 && (
                <div className="px-4 py-3 flex flex-col gap-1">
                  {villesAbonneesList.length > 0 ? (
                    <>
                      {/* Section Mes villes */}
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D3D3D]/40 mt-1 mb-1 px-2">
                        📌 Mes villes
                      </p>

                      {/* Option : Toutes mes villes */}
                      <button
                        onClick={() => { try { localStorage.removeItem('bonmoment_ville') } catch {} onSelectAll?.(); router.push('/?view=all'); onClose() }}
                        className="w-full flex items-center gap-3 py-3.5 border-b border-[#F5F5F5] hover:bg-[#FFF0E0] rounded-xl px-2 transition-colors min-h-[48px]"
                      >
                        <span className="text-lg">🏠</span>
                        <div className="text-left">
                          <p className="text-sm font-bold text-[#0A0A0A]">Toutes mes villes</p>
                          <p className="text-[11px] text-[#3D3D3D]/50">Offres de toutes mes villes</p>
                        </div>
                      </button>

                      {villesAbonneesList.map(nom => {
                        const count = nbOffresMap.get(nom) ?? null
                        return (
                          <button
                            key={`ab-${nom}`}
                            onClick={() => { router.push(`/ville/${toSlug(nom)}`); onClose() }}
                            className="w-full flex items-center justify-between py-3.5 border-b border-[#F5F5F5] last:border-0 hover:bg-[#FFF0E0] rounded-xl px-2 transition-colors min-h-[48px]"
                          >
                            <span className="text-sm font-bold text-[#0A0A0A]">📍 {nom}</span>
                            <span className="text-xs text-[#3D3D3D]/60 shrink-0 ml-2">
                              {count !== null
                                ? `${count} offre${count !== 1 ? 's' : ''} active${count !== 1 ? 's' : ''}`
                                : '—'}
                            </span>
                          </button>
                        )
                      })}
                    </>
                  ) : (
                    <>
                      {/* Pas de villes abonnées → Villes actives BONMOMENT */}
                      {villesBonmomentUniq.length > 0 && (
                        <>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D3D3D]/40 mb-1 px-2">
                            Villes actives sur BONMOMENT
                          </p>
                          {villesBonmomentUniq.map(v => {
                            const count = nbOffresMap.get(v.nom) ?? 0
                            return (
                              <button
                                key={v.id}
                                onClick={() => handleSelectCommune({ nom: v.nom, code: '' })}
                                className="w-full flex items-center justify-between py-3.5 border-b border-[#F5F5F5] last:border-0 hover:bg-[#FFF0E0] rounded-xl px-2 transition-colors min-h-[48px]"
                              >
                                <span className="text-sm font-bold text-[#0A0A0A]">📍 {v.nom}</span>
                                {count > 0
                                  ? <span className="text-[10px] font-bold text-white bg-[#FF6B00] px-2 py-0.5 rounded-full shrink-0 ml-2">{count} offre{count > 1 ? 's' : ''}</span>
                                  : <span className="text-[10px] text-[#3D3D3D]/40 shrink-0 ml-2">0 offre</span>
                                }
                              </button>
                            )
                          })}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

            </div>

            {/* ── Champ de recherche — toujours en bas ── */}
            <div className="border-t border-[#F0F0F0] px-4 pt-3 pb-4 shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D3D3D]/40 mb-2 px-1">
                Rechercher une ville
              </p>
              <div className="flex items-center gap-2 bg-[#F5F5F5] rounded-xl px-3 py-2.5">
                <span>🔍</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Tape le nom d'une commune..."
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
          </>
        )}

        {/* ── Phase : communes proches ── */}
        {phase === 'proches' && (
          <div className="overflow-y-auto flex-1 px-5 py-5 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-black text-[#0A0A0A]">
                Pas encore de commerçant à{' '}
                <button
                  onClick={() => { router.push(`/ville/${toSlug(communeChoisie?.nom || '')}`); onClose() }}
                  className="text-[#FF6B00] underline underline-offset-2"
                >
                  {communeChoisie?.nom}
                </button>
                .
              </p>
              <p className="text-xs text-[#3D3D3D]/60">
                Abonne-toi pour être prévenu dès l'ouverture, ou choisis une ville proche :
              </p>
              {(() => {
                const nomC       = communeChoisie?.nom
                const dejaAbonne = villesAbonneesList.includes(nomC) || abonnesLocal.has(nomC)
                return (
                  <button
                    onClick={() => subscriberVille(nomC)}
                    disabled={dejaAbonne || abonnement === nomC}
                    className={`w-full font-bold text-sm py-3 rounded-2xl transition-colors min-h-[48px] ${
                      dejaAbonne
                        ? 'bg-green-500 text-white'
                        : 'bg-[#FF6B00] hover:bg-[#CC5500] text-white'
                    } disabled:opacity-60`}
                  >
                    {abonnement === nomC
                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                      : dejaAbonne
                      ? `✅ Déjà abonné`
                      : `📌 S'abonner pour être averti`}
                  </button>
                )
              })()}
            </div>

            {loadingVoisines && (
              <div className="flex justify-center py-8">
                <span className="w-6 h-6 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loadingVoisines && voisines.length === 0 && (
              <p className="text-center text-sm text-[#3D3D3D]/50 py-4">
                Aucune ville active près de chez toi pour le moment.
              </p>
            )}

            {!loadingVoisines && voisines.map(v => {
              const isAbonne = villesAbonneesList.includes(v.nom) || abonnesLocal.has(v.nom)
              return (
                <div
                  key={v.id}
                  className="flex items-center justify-between py-3 border-b border-[#F5F5F5] last:border-0 gap-3"
                >
                  <button
                    onClick={() => { router.push(`/ville/${toSlug(v.nom)}`); onClose() }}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="text-sm font-bold text-[#0A0A0A]">
                      📍 {v.nom}{' '}
                      <span className="text-xs font-normal text-[#3D3D3D]/50">({v.distance} km)</span>
                    </p>
                    <p className="text-[11px] text-[#3D3D3D]/50">
                      {v.nbOffres > 0
                        ? `${v.nbOffres} offre${v.nbOffres > 1 ? 's' : ''} actives`
                        : 'Aucune offre en cours'}
                    </p>
                  </button>
                  <button
                    onClick={() => subscriberVille(v.nom)}
                    disabled={isAbonne || abonnement === v.nom}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors min-h-[36px] shrink-0 ${
                      isAbonne
                        ? 'bg-green-500 text-white'
                        : 'border border-[#FF6B00] text-[#FF6B00] hover:bg-[#FFF0E0]'
                    } disabled:opacity-60`}
                  >
                    {abonnement === v.nom ? (
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                    ) : isAbonne ? '✅ Déjà abonné' : "S'abonner"}
                  </button>
                </div>
              )
            })}

          </div>
        )}

      </div>
    </div>
  )
}
