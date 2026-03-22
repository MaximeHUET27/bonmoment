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

  const inputRef = useRef(null)
  const debounce = useRef(null)

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

  /* Compte les offres actives par ville BONMOMENT à l'ouverture */
  useEffect(() => {
    if (!isOpen || !supabase || villesBonmoment.length === 0) return
    Promise.all(
      villesBonmoment.map(v =>
        supabase
          .from('offres')
          .select('id, commerces!inner(ville)', { count: 'exact', head: true })
          .eq('statut', 'active')
          .gt('date_fin', new Date().toISOString())
          .eq('commerces.ville', v.nom)
          .then(({ count }) => [v.nom, count || 0])
      )
    ).then(entries => setNbOffresMap(new Map(entries)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /* Déduplique villesBonmoment par nom (point 3) */
  const villesBonmomentUniq = villesBonmoment.filter(
    (v, i, arr) => arr.findIndex(x => x.nom.toLowerCase() === v.nom.toLowerCase()) === i
  )

  /* Villes BONMOMENT correspondant à la recherche (Bug 3 : toujours trouvées) */
  const localMatches = query.length >= 2
    ? villesBonmomentUniq.filter(v => v.nom.toLowerCase().includes(query.toLowerCase()))
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
                    <div className="flex justify-center py-8">
                      <span className="w-6 h-6 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
                    </div>
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
                      <span className="text-[10px] font-bold text-white bg-[#FF6B00] px-2 py-0.5 rounded-full shrink-0 ml-2">
                        {nbOffresMap.has(v.nom) && nbOffresMap.get(v.nom) > 0
                          ? `${nbOffresMap.get(v.nom)} offre${nbOffresMap.get(v.nom) > 1 ? 's' : ''} dispo`
                          : 'Offres dispo'}
                      </span>
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
                        <p className="text-sm font-bold text-[#3D3D3D] text-left">{c.nom}</p>
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
                      {/* Option : Toutes les villes */}
                      <button
                        onClick={() => { router.push('/'); onClose() }}
                        className="w-full flex items-center gap-3 py-3.5 border-b border-[#F5F5F5] hover:bg-[#FFF0E0] rounded-xl px-2 transition-colors min-h-[48px]"
                      >
                        <span className="text-lg">🏠</span>
                        <div className="text-left">
                          <p className="text-sm font-bold text-[#0A0A0A]">Toutes les villes</p>
                          <p className="text-[11px] text-[#3D3D3D]/50">Offres de toutes mes villes</p>
                        </div>
                      </button>

                      {/* Section Mes villes */}
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D3D3D]/40 mt-3 mb-1 px-2">
                        Mes villes
                      </p>
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
                                <span className="text-[10px] font-bold text-white bg-[#FF6B00] px-2 py-0.5 rounded-full shrink-0 ml-2">
                                  {count > 0
                                    ? `${count} offre${count > 1 ? 's' : ''} dispo`
                                    : 'Offres dispo'}
                                </span>
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
              <button
                onClick={() => subscriberVille(communeChoisie?.nom)}
                disabled={abonnesLocal.has(communeChoisie?.nom) || abonnement === communeChoisie?.nom}
                className={`w-full font-bold text-sm py-3 rounded-2xl transition-colors min-h-[48px] ${
                  abonnesLocal.has(communeChoisie?.nom)
                    ? 'bg-green-500 text-white'
                    : 'bg-[#FF6B00] hover:bg-[#CC5500] text-white'
                } disabled:opacity-60`}
              >
                {abonnement === communeChoisie?.nom
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                  : abonnesLocal.has(communeChoisie?.nom)
                  ? `✅ Abonné à ${communeChoisie?.nom}`
                  : `📌 S'abonner pour être averti`}
              </button>
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
