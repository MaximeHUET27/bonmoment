'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { formatDebut } from '@/lib/offreStatus'

const PENDING_KEY = 'bonmoment_pending_reservation'
import AuthBottomSheet from '@/app/components/AuthBottomSheet'
import FullScreenBon from '@/app/components/FullScreenBon'
import FavoriButton from '@/app/components/FavoriButton'
import ShareButton from '@/app/components/ShareButton'
import { useReservation } from '@/app/hooks/useReservation'
import { getFullOffreTitle } from '@/lib/offreTitle'
import { useFavoris } from '@/app/context/FavorisContext'
import { useToast } from '@/app/components/Toast'
import { triggerConfetti } from '@/lib/confetti'

/* ── Mapping catégorie Google → filtre ───────────────────────────────────── */

const CATEGORIE_MAP = {
  resto: [
    'restaurant', 'cafe', 'bar', 'bakery', 'food', 'meal_delivery', 'meal_takeaway',
    'alimentation', 'food_store', 'grocery_or_supermarket', 'supermarket',
    'boulangerie', 'patisserie', 'traiteur', 'pizzeria', 'brasserie',
    'coffee_shop', 'tea_house', 'ice_cream', 'deli', 'butcher',
    'wine_store', 'liquor_store', 'confectionery', 'sandwich_shop',
    'juice_bar', 'pub', 'night_club', 'restauration', 'repas',
    'vins', 'spiritueux', 'boite de nuit',
    'fromagerie', 'chocolaterie', 'epicerie', 'caviste',
  ],
  beaute: [
    'hair_care', 'beauty_salon', 'spa', 'nail_salon',
    'coiffeur', 'coiffure', 'esthetique', 'barbier', 'barber',
    'massage', 'wellness', 'skin_care', 'tattoo', 'piercing',
    'solarium', 'tanning_salon', 'parfumerie', 'cosmetics',
    'institut beaute',
  ],
  shopping: [
    'clothing_store', 'florist', 'jewelry_store', 'shoe_store',
    'boutique', 'gift_shop', 'department_store', 'shopping_mall',
    'furniture_store', 'home_goods_store', 'hardware_store',
    'book_store', 'electronics_store', 'pet_store', 'toy_store',
    'bicycle_store', 'optician', 'opticien', 'pharmacie', 'pharmacy',
    'fleuriste', 'decoration', 'bricolage', 'jardinerie',
    'librairie', 'papeterie', 'mercerie', 'maroquinerie',
    'bijouterie', 'horlogerie', 'antiquaire', 'brocante',
    'vetements', 'chaussures', 'animalerie', 'sante',
  ],
  loisirs: [
    'gym', 'bowling_alley', 'movie_theater', 'amusement_park',
    'museum', 'art_gallery', 'zoo', 'aquarium', 'stadium',
    'tourist_attraction', 'travel_agency', 'car_rental',
    'car_repair', 'car_wash', 'electrician', 'plumber',
    'laundry', 'dry_cleaning', 'tailor', 'photographer',
    'pressing', 'laverie', 'garage', 'auto_ecole',
    'sport', 'fitness', 'yoga', 'danse', 'theatre', 'cinema',
    'escape_game', 'karting', 'laser_game', 'trampoline',
    'tourisme', 'voyage', 'veterinaire', 'veterinary', 'toiletteur',
  ],
}

function normalizeStr(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

export function getCategorieFiltre(cat) {
  if (!cat) return null
  const norm = normalizeStr(cat)
  for (const [filtre, keywords] of Object.entries(CATEGORIE_MAP)) {
    if (keywords.some(kw => norm.includes(normalizeStr(kw)))) return filtre
  }
  return null
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function getTimeLeft(dateFin) {
  const diff = new Date(dateFin) - new Date()
  if (diff <= 0) return null
  return {
    h: Math.floor(diff / 3_600_000),
    m: Math.floor((diff % 3_600_000) / 60_000),
    s: Math.floor((diff % 60_000) / 1_000),
    diff,
  }
}

function useCountdown(dateFin) {
  const [tl, setTl] = useState(() => getTimeLeft(dateFin))
  useEffect(() => {
    const t = setInterval(() => setTl(getTimeLeft(dateFin)), 1_000)
    return () => clearInterval(t)
  }, [dateFin])
  return tl
}

function formatBadge(offre) {
  if (offre.type_remise === 'pourcentage')    return `−${offre.valeur}%`
  if (offre.type_remise === 'montant_fixe')   return `−${offre.valeur}€`
  if (offre.type_remise === 'montant')        return `−${offre.valeur}€`   // rétrocompat
  if (offre.type_remise === 'cadeau')         return '🎁 Cadeau'
  if (offre.type_remise === 'produit_offert') return '📦 Offert'
  if (offre.type_remise === 'service_offert') return '✂️ Offert'
  if (offre.type_remise === 'offert')         return 'Offert'               // rétrocompat
  if (offre.type_remise === 'concours')       return '🎰 Concours'
  if (offre.type_remise === 'atelier')        return '🎉 Évènement'
  if (offre.type_remise === 'fidelite')       return '⭐ Fidélité'
  return offre.type_remise || 'Offre'
}

/* ── Composant ───────────────────────────────────────────────────────────── */

export default function OffreCard({ offre, userReservation }) {
  const timeLeft   = useCountdown(offre.date_fin)
  const commerce   = offre.commerces
  const programmee = new Date(offre.date_debut) > new Date()
  const expired    = !timeLeft

  const { user, supabase } = useAuth()
  const { isFavori, toggleFavori } = useFavoris()
  const { showToast } = useToast()
  const pathname  = usePathname()
  const [showAuth,          setShowAuth]          = useState(false)
  const [showBon,           setShowBon]           = useState(false)
  const [abonneCommLoading, setAbonneCommLoading] = useState(false)
  const [nbBonsDelta,       setNbBonsDelta]       = useState(0)

  const abonneComm = isFavori(commerce?.id)

  const { reserver, status, reservation, reset, checkExisting, setStatus, setReservation } = useReservation()

  /* ── Compteur local (annulation incrémente, ne recharge pas la page) ── */
  const nbBons = (offre.nb_bons_restants === null || offre.nb_bons_restants === 9999)
    ? offre.nb_bons_restants
    : offre.nb_bons_restants + nbBonsDelta

  const epuise = nbBons !== null &&
                 nbBons !== 9999 &&
                 nbBons <= 0
  const fini   = expired || epuise
  const urgent = !programmee && timeLeft && (
    timeLeft.diff < 3_600_000 ||
    (nbBons !== null && nbBons < 5)
  )

  /* ── Écouter les annulations pour reset le bouton ── */
  useEffect(() => {
    function handleAnnulation(e) {
      if (e.detail?.offreId !== offre.id) return
      reset()
      if (offre.nb_bons_restants !== null && offre.nb_bons_restants !== 9999) {
        setNbBonsDelta(d => d + 1)
      }
    }
    window.addEventListener('bonmoment:annulation', handleAnnulation)
    return () => window.removeEventListener('bonmoment:annulation', handleAnnulation)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offre.id])

  /* ── Statut initial : depuis données batchées ou check individuel ── */
  useEffect(() => {
    if (userReservation !== undefined) {
      // Données batchées fournies par le parent — pas de requête individuelle
      if (userReservation) {
        const s = userReservation.statut
        if (s === 'reservee')  { setReservation(userReservation); setStatus('already_reserved') }
        else if (s === 'utilisee') setStatus('already_used')
        else if (s === 'expiree')  setStatus('already_expired')
        // 'annulee' → idle (cliquable)
      }
      // null → pas de réservation, rester idle
    } else if (user && !fini) {
      // Pas de données batchées → fallback check individuel
      checkExisting(offre.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, offre.id, userReservation])

  /* ── Auto-pending : réservation déclenché après retour OAuth ── */
  useEffect(() => {
    if (!user || !supabase) return
    const pendingId = sessionStorage.getItem(PENDING_KEY)
    if (pendingId !== offre.id) return
    sessionStorage.removeItem(PENDING_KEY)

    async function autoReserver() {
      // Récupère la ville depuis les props ou via supabase (fix toast ville)
      let ville = offre.commerces?.ville
      if (!ville) {
        const { data: d } = await supabase
          .from('offres').select('commerces(ville)').eq('id', offre.id).single()
        ville = d?.commerces?.ville
      }
      if (ville) {
        const { data } = await supabase
          .from('users').select('villes_abonnees, notifications_email').eq('id', user.id).single()
        if (data) {
          const villes = data.villes_abonnees || []
          const isNew  = !villes.includes(ville)
          const updates = {}
          if (isNew) updates.villes_abonnees = [...villes, ville]
          if (!data.notifications_email) updates.notifications_email = true
          if (Object.keys(updates).length > 0) {
            await supabase.from('users').update(updates).eq('id', user.id)
            if (isNew) { triggerConfetti(); showToast(`🎉 Bienvenue à ${ville} ! Tu recevras les bons plans chaque soir à 21h.`) }
          }
        }
      }
      reserver(offre)
    }
    autoReserver()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  /* ── Après connexion OAuth : exécuter l'abonnement commerçant en attente ── */
  useEffect(() => {
    if (!user || !commerce?.id) return
    const pendingId = sessionStorage.getItem('bonmoment_pending_abonne_comm')
    if (pendingId === commerce.id) {
      sessionStorage.removeItem('bonmoment_pending_abonne_comm')
      setAbonneCommLoading(true)
      toggleFavori(commerce.id).then(() => setAbonneCommLoading(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  /* ── Toggle favori commerce (depuis bouton offre expirée) ── */
  async function handleAbonnerComm(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      sessionStorage.setItem('bonmoment_pending_abonne_comm', commerce.id)
      setShowAuth(true)
      return
    }
    setAbonneCommLoading(true)
    await toggleFavori(commerce.id)
    setAbonneCommLoading(false)
  }

  /* ── Affichage FullScreenBon après succès (1s de feedback vert) ── */
  useEffect(() => {
    if (status === 'success') {
      const t = setTimeout(() => setShowBon(true), 900)
      return () => clearTimeout(t)
    }
  }, [status])

  async function handleReserver(e) {
    e.preventDefault()  // empêche navigation si dans un Link
    e.stopPropagation()
    if (fini) return
    if (status === 'already_used' || status === 'already_expired') return
    if (status === 'already_reserved') { setShowBon(true); return }
    if (!user) {
      sessionStorage.setItem(PENDING_KEY, offre.id)
      setShowAuth(true)
      return
    }
    await reserver(offre)
  }

  /* ── Libellé et style du bouton selon l'état ── */
  const btnLabel = (() => {
    if (fini)                           return 'Trop tard !'
    if (status === 'loading')           return null                  // spinner
    if (status === 'success')           return '✓ Bon réservé !'
    if (status === 'already_reserved')  return '🎟️ Voir mon bon'
    if (status === 'already_used')      return '✅ Bon utilisé'
    if (status === 'already_expired')   return '⏰ Bon expiré'
    if (status === 'no_stock')          return 'Plus de bons…'
    if (status === 'error')             return '✗ Erreur — réessaie'
    return 'Réserver mon bon'
  })()

  const btnColor = fini                            ? 'bg-[#D0D0D0] cursor-not-allowed'
    : status === 'success'                         ? 'bg-green-500'
    : status === 'error'                           ? 'bg-red-500'
    : status === 'already_reserved'                ? 'bg-green-500'
    : (status === 'already_used' ||
       status === 'already_expired')               ? 'bg-[#9CA3AF] cursor-not-allowed'
    : status === 'no_stock'                        ? 'bg-[#FF6B00]'
    : 'bg-[#FF6B00] hover:bg-[#CC5500]'

  const isPulsing = urgent && !fini && status !== 'loading' && status !== 'success' && status !== 'already_reserved' && status !== 'already_used' && status !== 'already_expired'

  /* ── Pulse sur le compteur de bons si < 5 ── */
  const nbPulse = !fini && nbBons !== null &&
                  nbBons !== 9999 &&
                  nbBons <= 5

  /* ── Font-size adaptatif (titre + commerce) ── */
  const titreFontSize    = getFullOffreTitle(offre).length > 30 ? '11px' : '13px'
  const commerceFontSize = (commerce?.nom || '').length > 25    ? '10px' : '12px'

  return (
    <>
      <div
        className={`bg-white rounded-[12px] shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-row h-[155px] sm:h-[165px]${fini ? ' opacity-60' : ''}`}
        style={{
          border: '1px solid #F0F0F0',
          ...(urgent && !fini ? { borderLeft: '3px solid #ef4444' } : {}),
        }}
      >

        {/* ── Photo commerce (côté gauche) ── */}
        <div
          className="relative w-[100px] sm:w-[130px] shrink-0 self-stretch"
        >
          {commerce?.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={commerce.photo_url}
              alt={commerce?.nom || ''}
              className={`absolute inset-0 w-full h-full object-cover${fini ? ' grayscale' : ''}`}
            />
          ) : (
            <div className="absolute inset-0 bg-[#F5F5F5] flex items-center justify-center">
              <span className="text-3xl">🏪</span>
            </div>
          )}
        </div>

        {/* ── Infos (côté droit) ── */}
        <div className="flex-1 flex flex-col gap-[2px] px-[8px] py-[6px] sm:px-[10px] min-w-0">

          {/* Ligne 1 : timer + bons + partage — barre orange */}
          <div className="flex items-center justify-between gap-1 min-w-0 bg-[#FFF0E0] rounded-[8px] px-[6px] py-[3px]">
            <Link href={`/offre/${offre.id}`} className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
              {programmee ? (
                <>
                  <span className="text-[10px] shrink-0">📅</span>
                  <span className="text-[10px] font-semibold text-[#FF6B00] truncate">
                    Début le {formatDebut(offre.date_debut)}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[10px] shrink-0 text-[#FF6B00]">⏱</span>
                  {timeLeft ? (
                    <span className={`text-[10px] tabular-nums whitespace-nowrap font-semibold ${urgent && !fini ? 'text-red-500' : 'text-[#FF6B00]'}`}>
                      {String(timeLeft.h).padStart(2, '0')}h{' '}
                      {String(timeLeft.m).padStart(2, '0')}m{' '}
                      {String(timeLeft.s).padStart(2, '0')}s
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-[#FF6B00]/60">Trop tard !</span>
                  )}
                </>
              )}
            </Link>
            <div className="flex items-center gap-1 shrink-0">
              <Link href={`/offre/${offre.id}`}>
                <span className={`text-[10px] font-bold text-[#FF6B00] ${nbPulse ? 'animate-pulse' : ''}`}>
                  {nbBons === null || nbBons === 9999 ? '∞' : `🎟 ${nbBons}`}
                </span>
              </Link>
              <span className="text-[#FF6B00]"><ShareButton offre={offre} commerce={commerce} /></span>
            </div>
          </div>

          {/* Ligne 2 : badge + titre */}
          <Link href={`/offre/${offre.id}`} className="flex items-start gap-1.5 min-w-0">
            <span className="shrink-0 bg-[#FF6B00] text-white font-bold text-[11px] px-2 py-0.5 rounded-[8px] whitespace-nowrap">
              {formatBadge(offre)}
            </span>
            <span className="font-bold text-[#0A0A0A] leading-snug" style={{ fontSize: titreFontSize }}>
              {getFullOffreTitle(offre)}
            </span>
          </Link>

          {/* Ligne 3 : nom commerce ⭐ ❤️ */}
          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
            <span className="font-semibold text-[#1A1A1A] flex-1 min-w-0" style={{ fontSize: commerceFontSize }}>{commerce?.nom}</span>
            {commerce?.note_google && (
              <span className="text-[10px] font-bold text-yellow-500 shrink-0 ml-1">⭐ {commerce.note_google}</span>
            )}
            {commerce?.id && (
              <span className="shrink-0 ml-0.5">
                <FavoriButton commerceId={commerce.id} commerceNom={commerce.nom || ''} className="!min-h-[28px] !min-w-[28px]" />
              </span>
            )}
          </div>

          {/* Ligne 4 : ville */}
          {commerce?.ville && (
            <p className="text-[10px] text-[#3D3D3D]/50">📍 {commerce.ville}</p>
          )}

          {/* Ligne 5 : CTA */}
          <div className="mt-auto">
            {fini ? (
              <button
                onClick={handleAbonnerComm}
                disabled={abonneCommLoading}
                className={`w-full text-white font-bold text-[11px] leading-tight h-[30px] rounded-full transition-all duration-200 flex items-center justify-center text-center gap-1 ${
                  abonneComm
                    ? 'bg-green-500'
                    : 'bg-[#F08040] hover:bg-[#D06830] active:scale-[0.97]'
                }`}
              >
                {abonneCommLoading
                  ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : abonneComm
                  ? '✅ Abonné à ce commerçant'
                  : 'Trop tard ! Abonne-toi à ce commerçant ❤️'}
              </button>
            ) : (
              <>
                <style>{`
                  @keyframes bm-btn-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }
                  @keyframes bm-pop       { 0%{transform:scale(0);opacity:0} 100%{transform:scale(1);opacity:1} }
                `}</style>
                <button
                  onClick={handleReserver}
                  disabled={status === 'loading'}
                  className={`w-full text-white font-bold text-[11px] h-[30px] rounded-full flex items-center justify-center gap-1.5 transition duration-150 ease-out hover:scale-[1.02] active:scale-[0.97] ${btnColor} ${isPulsing ? 'bm-btn-pulse-cls' : ''}`}
                >
                  {status === 'loading' ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span key={status} style={(status === 'success' || status === 'error') ? { animation: 'bm-pop 0.3s cubic-bezier(0.175,0.885,0.32,1.275) forwards' } : {}}>
                      {btnLabel}
                    </span>
                  )}
                </button>
                {isPulsing && <style>{`.bm-btn-pulse-cls{animation:bm-btn-pulse 2s ease-in-out infinite}`}</style>}
              </>
            )}

            {/* Erreur */}
            {status === 'error' && (
              <p className="text-[10px] text-red-500 text-center mt-1 font-semibold">Réessaie dans quelques secondes.</p>
            )}
          </div>

        </div>
      </div>

      {/* ── Bottom sheet auth ── */}
      <AuthBottomSheet
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        redirectAfter={pathname}
      />

      {/* ── Bon plein écran ── */}
      {showBon && reservation && (
        <FullScreenBon
          reservation={reservation}
          offre={offre}
          commerce={commerce}
          onClose={() => setShowBon(false)}
        />
      )}

      {/* Toast géré globalement par ToastProvider */}
    </>
  )
}
