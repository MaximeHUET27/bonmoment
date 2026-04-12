'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useJsApiLoader } from '@react-google-maps/api'
import { useAuth } from '@/app/context/AuthContext'
import AuthBottomSheet from '@/app/components/AuthBottomSheet'
import { getCategorieFiltre } from '@/app/ville/[slug]/OffreCard'

const LIBRARIES = ['places']

/* ── Constantes ─────────────────────────────────────────────────────────── */

const MAPS_FIELDS = [
  'place_id', 'name', 'formatted_address', 'address_components',
  'types', 'photos', 'opening_hours', 'rating', 'formatted_phone_number',
  'geometry',
]

const TYPE_MAP = {
  bakery:            'Boulangerie / Pâtisserie',
  bar:               'Bar',
  beauty_salon:      'Institut beauté',
  book_store:        'Librairie',
  cafe:              'Café / Salon de thé',
  clothing_store:    'Vêtements / Mode',
  convenience_store: 'Épicerie',
  florist:           'Fleuriste',
  food:              'Alimentation',
  gym:               'Sport & Fitness',
  hair_care:         'Coiffure',
  hardware_store:    'Bricolage',
  health:            'Santé',
  jewelry_store:     'Bijouterie',
  laundry:           'Pressing / Laverie',
  liquor_store:      'Cave à vins / Spiritueux',
  meal_delivery:     'Livraison de repas',
  meal_takeaway:     'Restauration rapide',
  night_club:        'Boîte de nuit',
  pet_store:         'Animalerie',
  pharmacy:          'Pharmacie',
  restaurant:        'Restaurant',
  shoe_store:        'Chaussures',
  spa:               'Spa & Bien-être',
  supermarket:       'Supermarché',
  tourist_attraction:'Tourisme & Loisirs',
  travel_agency:     'Agence de voyage',
  veterinary_care:   'Vétérinaire',
}

function mapPlaceType(types = []) {
  for (const t of types) {
    if (TYPE_MAP[t]) return TYPE_MAP[t]
  }
  return 'Commerce'
}

function generateCodeParrainage() {
  // Format : BM + 6 caractères sans ambiguïté (sans 0, O, I, 1)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'BM'
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/* ── Composant ──────────────────────────────────────────────────────────── */

export default function InscriptionCommercant() {
  const { user, loading, supabase } = useAuth()
  const router = useRouter()

  // Google Maps
  const { isLoaded: mapsReady } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY,
    libraries: LIBRARIES,
  })
  const autocompleteRef             = useRef(null)
  const placesServiceRef            = useRef(null)
  const mapDivRef                   = useRef(null)
  const debounceRef                 = useRef(null)

  // Formulaire
  const [query, setQuery]               = useState('')
  const [predictions, setPredictions]   = useState([])
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [codeParrainage, setCodeParrainage] = useState('')
  const [showPredictions, setShowPredictions] = useState(false)

  // États d'envoi
  const [showAllHoraires, setShowAllHoraires] = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [duplicate, setDuplicate]       = useState(false)
  const [parrainInvalid, setParrainInvalid] = useState(false)
  const [parrainExpire,  setParrainExpire]  = useState(false)
  const [parrainUtilise, setParrainUtilise] = useState(false)
  const [submitError, setSubmitError]   = useState(null)

  // Multi-commerce
  const [existingCommerces, setExistingCommerces] = useState([])
  const [showExistingWarning, setShowExistingWarning] = useState(false)

  // Auth bottom sheet si non connecté
  const [showAuth, setShowAuth] = useState(false)
  useEffect(() => {
    if (!loading && !user) {
      setShowAuth(true)
    }
  }, [user, loading])

  const [categorieBonmoment, setCategorieBonmoment] = useState(null)

  // Reset accordion horaires + catégorie quand on change de commerce
  useEffect(() => {
    setShowAllHoraires(false)
    if (!selectedPlace) setCategorieBonmoment(null)
  }, [selectedPlace])

  // Vérification commerce existant
  useEffect(() => {
    if (!user || !supabase) return
    supabase.from('commerces').select('id, nom').eq('owner_id', user.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setExistingCommerces(data)
          setShowExistingWarning(true)
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Initialise les services Google Maps quand le loader est prêt
  useEffect(() => {
    if (!mapsReady || !mapDivRef.current) return
    if (!window.google?.maps?.places) return
    autocompleteRef.current = new window.google.maps.places.AutocompleteService()
    placesServiceRef.current = new window.google.maps.places.PlacesService(mapDivRef.current)
  }, [mapsReady])

  // Recherche avec debounce
  const fetchPredictions = useCallback((value) => {
    if (!autocompleteRef.current || value.length < 2) {
      setPredictions([])
      return
    }
    autocompleteRef.current.getPlacePredictions(
      {
        input: value,
        types: ['establishment'],
        componentRestrictions: { country: 'fr' },
      },
      (results, status) => {
        const ok = window.google.maps.places.PlacesServiceStatus.OK
        setPredictions(status === ok ? (results || []) : [])
      }
    )
  }, [])

  function handleQueryChange(value) {
    setQuery(value)
    setSelectedPlace(null)
    setDuplicate(false)
    setSubmitError(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchPredictions(value), 300)
    setShowPredictions(true)
  }

  // Sélection d'une suggestion
  function selectPrediction(prediction) {
    setQuery(prediction.structured_formatting.main_text)
    setPredictions([])
    setShowPredictions(false)
    setDuplicate(false)

    placesServiceRef.current.getDetails(
      { placeId: prediction.place_id, fields: MAPS_FIELDS },
      (place, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place) return

        const locality =
          place.address_components?.find(c => c.types.includes('locality'))?.long_name ||
          place.address_components?.find(c => c.types.includes('administrative_area_level_2'))?.long_name ||
          ''

        const photoUrl = place.photos?.[0]?.getUrl({ maxWidth: 900, maxHeight: 600 }) ?? null

        const categGoogle = mapPlaceType(place.types || [])
        setSelectedPlace({
          place_id:    place.place_id,
          nom:         place.name,
          adresse:     place.formatted_address,
          ville:       locality,
          categorie:   categGoogle,
          photo_url:   photoUrl,
          telephone:   place.formatted_phone_number ?? null,
          note_google: place.rating ?? null,
          horaires:    place.opening_hours?.weekday_text ?? null,
          latitude:    place.geometry?.location?.lat() ?? null,
          longitude:   place.geometry?.location?.lng() ?? null,
        })
        // Auto-détection catégorie BONMOMENT depuis les types Google
        const detected = (place.types || []).reduce((acc, t) => acc || getCategorieFiltre(t), null)
        setCategorieBonmoment(detected || 'autres')
      }
    )
  }

  // Soumission du formulaire
  async function handleSubmit() {
    if (!selectedPlace || !user) return
    setSubmitting(true)
    setDuplicate(false)
    setParrainInvalid(false)
    setParrainExpire(false)
    setParrainUtilise(false)
    setSubmitError(null)

    // 1. Vérification du doublon
    const { data: existing } = await supabase
      .from('commerces')
      .select('id')
      .eq('place_id', selectedPlace.place_id)
      .maybeSingle()

    if (existing) {
      setDuplicate(true)
      setSubmitting(false)
      return
    }

    // 2. Validation du code de parrainage (si renseigné)
    let parrainCodeId = null
    const cleanCode = codeParrainage.trim().toUpperCase()
    if (cleanCode) {
      const { data: codeRow } = await supabase
        .from('codes_parrainage')
        .select('id, statut, expire_at')
        .eq('code', cleanCode)
        .maybeSingle()

      if (!codeRow) {
        setParrainInvalid(true)
        setSubmitting(false)
        return
      }
      if (codeRow.statut === 'utilise') {
        setParrainUtilise(true)
        setSubmitting(false)
        return
      }
      if (codeRow.statut === 'expire' || new Date(codeRow.expire_at) < new Date()) {
        setParrainExpire(true)
        setSubmitting(false)
        return
      }
      parrainCodeId = codeRow.id
    }

    // 3. Insertion du commerce
    const { error: insertError } = await supabase.from('commerces').insert({
      owner_id:            user.id,
      place_id:            selectedPlace.place_id,
      nom:                 selectedPlace.nom,
      adresse:             selectedPlace.adresse,
      ville:               selectedPlace.ville,
      categorie:           selectedPlace.categorie,
      categorie_bonmoment: categorieBonmoment,
      photo_url:           selectedPlace.photo_url,
      telephone:           selectedPlace.telephone,
      note_google:         selectedPlace.note_google,
      horaires:            selectedPlace.horaires,
      latitude:            selectedPlace.latitude,
      longitude:           selectedPlace.longitude,
      abonnement_actif:    true,
    })

    if (insertError) {
      setSubmitError(insertError.message)
      setSubmitting(false)
      return
    }

    // 3.5 Upsert de la ville dans la table villes (non-bloquant)
    if (selectedPlace.ville) {
      fetch('/api/upsert-ville', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nom: selectedPlace.ville }),
      }).catch(err => console.error('upsert-ville:', err))
    }

    // 4. Marquer le code de parrainage comme utilisé
    if (parrainCodeId) {
      const { error: parrainErr } = await supabase
        .from('codes_parrainage')
        .update({ utilise_par: user.id, statut: 'utilise' })
        .eq('id', parrainCodeId)
      if (parrainErr) console.error('Parrainage update:', parrainErr.message)
    }

    // 5. Passage du user en rôle commerçant
    const { error: roleErr } = await supabase.from('users').update({ role: 'commercant' }).eq('id', user.id)
    if (roleErr) console.error('Role update:', roleErr.message)

    router.push('/commercant/dashboard')
  }

  // ── Rendu ────────────────────────────────────────────────────────────────
  if (loading || !user) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <span className="w-8 h-8 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
        </div>
        <AuthBottomSheet
          isOpen={showAuth}
          onClose={() => setShowAuth(false)}
          redirectAfter="/commercant/inscription"
        />
      </>
    )
  }

  return (
    <>
      {/* Div cachée requise par PlacesService */}
      <div ref={mapDivRef} style={{ display: 'none' }} />

      <main className="min-h-screen bg-white flex flex-col">

        {/* ── Avertissement multi-commerce ────────────────────────────────── */}
        {showExistingWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-white rounded-3xl px-6 py-7 max-w-sm w-full flex flex-col gap-4 shadow-2xl">
              <p className="text-lg font-black text-[#0A0A0A]">
                Tu as déjà un commerce inscrit
              </p>
              {existingCommerces.map(c => (
                <p key={c.id} className="text-sm font-bold text-[#FF6B00]">🏪 {c.nom}</p>
              ))}
              <p className="text-sm text-[#3D3D3D]/70">Souhaites-tu en ajouter un autre ?</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowExistingWarning(false)}
                  className="w-full bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-sm py-3.5 rounded-2xl transition-colors"
                >
                  Oui, ajouter un commerce
                </button>
                <button
                  onClick={() => router.push('/commercant/dashboard')}
                  className="w-full border border-[#E0E0E0] text-sm font-semibold text-[#3D3D3D] py-3 rounded-2xl hover:border-[#FF6B00] hover:text-[#FF6B00] transition-colors"
                >
                  Non, voir mon commerce
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="px-6 pt-8 pb-6 border-b border-[#F5F5F5]">
          <Link href="/" className="inline-block mb-5">
            <Image src="/LOGO.png" alt="BONMOMENT" width={600} height={300}
              unoptimized priority className="w-[110px] h-auto" />
          </Link>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00] mb-1">
              Espace commerçant
            </p>
            <h1 className="text-2xl font-black text-[#0A0A0A] leading-tight">
              Rejoins BONMOMENT
            </h1>
            <p className="text-sm text-[#3D3D3D]/60 mt-1">
              Premier mois offert · Sans engagement · 3 minutes
            </p>
          </div>
        </header>

        {/* ── Formulaire ─────────────────────────────────────────────────── */}
        <section className="flex-1 px-4 py-8 max-w-lg mx-auto w-full flex flex-col gap-8">

          {/* ÉTAPE 1 — Recherche du commerce */}
          <div>
            <StepLabel num={1}>Trouve ton commerce</StepLabel>
            <p className="text-xs text-[#3D3D3D]/60 mb-3">
              Tape le nom ou l&apos;adresse de ton commerce pour le retrouver.
            </p>

            {/* Champ de recherche */}
            <div className="relative">
              <div className="flex items-center gap-2 px-4 py-3.5 bg-[#F5F5F5] rounded-2xl border-2 border-transparent focus-within:border-[#FF6B00] focus-within:bg-white transition-all">
                <svg className="w-4 h-4 text-[#3D3D3D]/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 6.5 6.5a7.5 7.5 0 0 0 10.15 10.15z" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                  onFocus={() => predictions.length > 0 && setShowPredictions(true)}
                  placeholder={mapsReady ? 'Boulangerie Dupont, 27000 Évreux...' : 'Chargement...'}
                  disabled={!mapsReady}
                  className="flex-1 bg-transparent text-sm text-[#0A0A0A] placeholder:text-[#3D3D3D]/40 outline-none font-semibold min-h-[24px]"
                />
                {query && (
                  <button onClick={() => { setQuery(''); setSelectedPlace(null); setPredictions([]); setDuplicate(false) }}
                    className="text-[#3D3D3D]/40 hover:text-[#0A0A0A] transition-colors text-lg leading-none">
                    ×
                  </button>
                )}
              </div>

              {/* Dropdown autocomplétion */}
              {showPredictions && predictions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-[#F0F0F0] z-50 overflow-hidden">
                  {predictions.map((p, i) => (
                    <button
                      key={p.place_id}
                      onClick={() => selectPrediction(p)}
                      className={`w-full text-left px-4 py-3 hover:bg-[#FFF0E0] transition-colors ${i < predictions.length - 1 ? 'border-b border-[#F5F5F5]' : ''}`}
                    >
                      <p className="text-sm font-bold text-[#0A0A0A] leading-tight">
                        {p.structured_formatting.main_text}
                      </p>
                      <p className="text-xs text-[#3D3D3D]/60 mt-0.5">
                        {p.structured_formatting.secondary_text}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Pas sur Google */}
            {query.length >= 3 && predictions.length === 0 && mapsReady && !selectedPlace && (
              <div className="mt-3 p-4 bg-[#F5F5F5] rounded-2xl">
                <p className="text-xs text-[#3D3D3D] leading-relaxed">
                  🔍 Ton commerce n&apos;apparaît pas ?{' '}
                  <a
                    href="https://business.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#FF6B00] hover:text-[#CC5500] underline underline-offset-2"
                  >
                    Crée d&apos;abord ta fiche sur Google Business
                  </a>{' '}
                  puis reviens ici.
                </p>
              </div>
            )}
          </div>

          {/* ÉTAPE 2 — Aperçu du commerce sélectionné */}
          {selectedPlace && (
            <div className="animate-in fade-in duration-300">
              <StepLabel num={2}>Vérifie tes informations</StepLabel>
              <p className="text-xs text-[#3D3D3D]/60 mb-4">
                Ces données sont importées automatiquement depuis Google.
              </p>

              {/* Carte aperçu */}
              <div className="bg-white rounded-2xl border-2 border-[#FF6B00]/20 overflow-hidden shadow-sm">

                {/* Photo */}
                {selectedPlace.photo_url ? (
                  <div className="w-full h-40 bg-[#FFF0E0] overflow-hidden">
                    <Image
                      src={selectedPlace.photo_url}
                      alt={selectedPlace.nom}
                      width={500}
                      height={160}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-28 bg-[#FFF0E0] flex items-center justify-center">
                    <span className="text-5xl">🏪</span>
                  </div>
                )}

                <div className="px-4 py-4 flex flex-col gap-3">
                  {/* Catégorie + note */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00] bg-[#FFF0E0] px-2.5 py-1 rounded-full">
                      {selectedPlace.categorie}
                    </span>
                    {selectedPlace.note_google && (
                      <span className="flex items-center gap-1 text-xs font-bold text-[#0A0A0A]">
                        ⭐ {selectedPlace.note_google.toFixed(1)}
                      </span>
                    )}
                  </div>

                  {/* Nom */}
                  <h2 className="text-lg font-black text-[#0A0A0A] leading-tight">
                    {selectedPlace.nom}
                  </h2>

                  {/* Adresse */}
                  <InfoRow icon="📍" text={selectedPlace.adresse} />

                  {/* Téléphone */}
                  {selectedPlace.telephone && (
                    <InfoRow icon="📞" text={selectedPlace.telephone} />
                  )}

                  {/* Horaires */}
                  {selectedPlace.horaires && selectedPlace.horaires.length > 0 && (
                    <div className="flex gap-2">
                      <span className="text-sm mt-0.5 shrink-0">🕐</span>
                      <div className="flex flex-col gap-0.5">
                        {(showAllHoraires ? selectedPlace.horaires : selectedPlace.horaires.slice(0, 3)).map((h, i) => (
                          <p key={i} className="text-xs text-[#3D3D3D]">{h}</p>
                        ))}
                        {selectedPlace.horaires.length > 3 && (
                          <button
                            onClick={() => setShowAllHoraires(v => !v)}
                            className="text-[10px] text-[#FF6B00] font-semibold text-left mt-0.5"
                          >
                            {showAllHoraires ? '▲ Réduire' : `📅 Voir tous les horaires (${selectedPlace.horaires.length - 3} de plus)`}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bouton "Pas mon commerce" */}
                  <button
                    onClick={() => { setSelectedPlace(null); setQuery(''); setDuplicate(false) }}
                    className="text-xs text-[#3D3D3D]/50 hover:text-[#FF6B00] transition-colors text-left underline underline-offset-2 mt-1"
                  >
                    Ce n&apos;est pas mon commerce
                  </button>
                </div>
              </div>

              {/* Sélecteur catégorie BONMOMENT */}
              <div className="mt-4 bg-[#F5F5F5] rounded-2xl px-4 py-4 flex flex-col gap-3">
                <div>
                  <p className="text-xs font-bold text-[#0A0A0A]">Catégorie BONMOMENT</p>
                  <p className="text-[11px] text-[#3D3D3D]/60 mt-0.5">
                    Détectée : <span className="font-semibold text-[#3D3D3D]">{selectedPlace.categorie}</span> — corrige si besoin.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'resto',    label: '🍽️ Alimentaire' },
                    { id: 'beaute',   label: '💇 Beauté' },
                    { id: 'shopping', label: '🛍️ Shopping' },
                    { id: 'loisirs',  label: '🎮 Loisirs' },
                    { id: 'autres',   label: '🏪 Autre' },
                  ].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategorieBonmoment(c.id)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors min-h-[32px] ${
                        categorieBonmoment === c.id
                          ? 'bg-[#FF6B00] text-white'
                          : 'bg-white text-[#3D3D3D] hover:bg-[#FFF0E0] hover:text-[#FF6B00]'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alerte doublon */}
              {duplicate && (
                <div className="mt-3 flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <span className="text-base shrink-0">⚠️</span>
                  <p className="text-xs text-red-700 font-semibold leading-relaxed">
                    Ce commerce est déjà inscrit sur BONMOMENT. Si tu en es le propriétaire,
                    contacte-nous à{' '}
                    <a href="mailto:bonmomentapp@gmail.com" className="underline">
                      bonmomentapp@gmail.com
                    </a>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ÉTAPE 3 — Code de parrainage */}
          {selectedPlace && !duplicate && (
            <div className="animate-in fade-in duration-300">
              <StepLabel num={3} optional>Code de parrainage</StepLabel>
              <p className="text-xs text-[#3D3D3D]/60 mb-3">
                Si un autre commerçant t&apos;a recommandé BONMOMENT, entre son code pour que
                vous bénéficiez tous les deux d&apos;une remise sur le premier mois.
              </p>
              <input
                type="text"
                value={codeParrainage}
                onChange={e => { setCodeParrainage(e.target.value.toUpperCase()); setParrainInvalid(false); setParrainExpire(false); setParrainUtilise(false) }}
                placeholder="Ex : BMABC123"
                maxLength={8}
                className="w-full px-4 py-3.5 bg-[#F5F5F5] rounded-2xl border-2 border-transparent focus:border-[#FF6B00] focus:bg-white outline-none text-sm font-mono font-bold text-[#0A0A0A] tracking-widest placeholder:font-sans placeholder:tracking-normal placeholder:text-[#3D3D3D]/40 transition-all"
              />
              {parrainInvalid && (
                <p className="mt-2 text-xs text-red-500 font-semibold">
                  ❌ Code de parrainage introuvable. Vérifie le code.
                </p>
              )}
              {parrainExpire && (
                <p className="mt-2 text-xs text-red-500 font-semibold">
                  ❌ Ce code est expiré.
                </p>
              )}
              {parrainUtilise && (
                <p className="mt-2 text-xs text-red-500 font-semibold">
                  ❌ Ce code a déjà été utilisé.
                </p>
              )}
            </div>
          )}

          {/* ── CTA principal ─────────────────────────────────────────────── */}
          {selectedPlace && !duplicate && (
            <div className="animate-in fade-in duration-300">

              {submitError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  Erreur : {submitError}
                </div>
              )}

              <button
               
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-[#FF6B00] hover:bg-[#CC5500] disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-base py-4 rounded-2xl transition-colors shadow-lg shadow-orange-200 min-h-[56px] flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Inscription en cours...
                  </>
                ) : (
                  'Rejoindre BONMOMENT 🎉'
                )}
              </button>

              <p className="text-center text-[10px] text-[#3D3D3D]/40 mt-3 leading-relaxed">
                Premier mois offert, sans frais. En cliquant, tu acceptes nos{' '}
                <Link href="/cgv" target="_blank" className="underline hover:text-[#FF6B00]">CGV</Link>.
              </p>
            </div>
          )}

        </section>
      </main>
    </>
  )
}

/* ── Composants utilitaires ─────────────────────────────────────────────── */

function StepLabel({ num, children, optional }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-6 h-6 rounded-full bg-[#FF6B00] text-white text-xs font-black flex items-center justify-center shrink-0">
        {num}
      </span>
      <h2 className="text-sm font-black text-[#0A0A0A] uppercase tracking-widest">
        {children}
      </h2>
      {optional && (
        <span className="text-[10px] text-[#3D3D3D]/40 font-semibold">(facultatif)</span>
      )}
    </div>
  )
}

function InfoRow({ icon, text }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-sm shrink-0 mt-0.5">{icon}</span>
      <p className="text-xs text-[#3D3D3D] leading-relaxed">{text}</p>
    </div>
  )
}
