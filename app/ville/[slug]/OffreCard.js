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
import { useFavoris } from '@/app/context/FavorisContext'

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
  const [tl, setTl] = useState(null)
  useEffect(() => {
    setTl(getTimeLeft(dateFin))
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
  if (offre.type_remise === 'atelier')        return '🎨 Atelier'
  return offre.type_remise || 'Offre'
}

/* ── Composant ───────────────────────────────────────────────────────────── */

export default function OffreCard({ offre }) {
  const timeLeft   = useCountdown(offre.date_fin)
  const commerce   = offre.commerces
  const programmee = new Date(offre.date_debut) > new Date()
  const expired    = !timeLeft

  const { user, supabase } = useAuth()
  const { isFavori, toggleFavori } = useFavoris()
  const pathname  = usePathname()
  const [showAuth,          setShowAuth]          = useState(false)
  const [showBon,           setShowBon]           = useState(false)
  const [toast,             setToast]             = useState(null)
  const [abonneCommLoading, setAbonneCommLoading] = useState(false)
  const [nbBonsDelta,       setNbBonsDelta]       = useState(0)

  const abonneComm = isFavori(commerce?.id)

  const { reserver, status, reservation, reset, checkExisting } = useReservation()

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

  /* ── Vérifier réservation existante au montage (bouton vert persistant) ── */
  useEffect(() => {
    if (user && !fini) checkExisting(offre.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, offre.id])

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
            if (isNew) setToast(`🎉 Bienvenue à ${ville} ! Tu recevras les bons plans chaque soir à 21h.`)
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

  /* ── Toast auto-dismiss ── */
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4_000)
    return () => clearTimeout(t)
  }, [toast])

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
    if (fini)                          return 'Trop tard !'
    if (status === 'loading')          return null                  // spinner
    if (status === 'success')          return '✓ Bon réservé !'
    if (status === 'already_reserved') return '✅ Bon réservé — Voir mon bon'
    if (status === 'no_stock')         return 'Plus de bons…'
    if (status === 'error')            return '✗ Erreur — réessaie'
    return 'Réserver mon bon'
  })()

  const btnColor = fini                           ? 'bg-[#D0D0D0] cursor-not-allowed'
    : status === 'success'                        ? 'bg-green-500'
    : status === 'error'                          ? 'bg-red-500'
    : status === 'already_reserved'               ? 'bg-green-500'
    : status === 'no_stock'                       ? 'bg-[#FF6B00]'
    : 'bg-[#FF6B00] hover:bg-[#CC5500] active:scale-[0.97]'

  /* ── Pulse sur le compteur de bons si < 5 ── */
  const nbPulse = !fini && nbBons !== null &&
                  nbBons !== 9999 &&
                  nbBons <= 5

  return (
    <>
      <div className="bg-white rounded-2xl border border-[#F0F0F0] shadow-sm overflow-hidden flex flex-col">

        {/* Zone 1 : header + corps grisés pour les cartes expirées */}
        <div className={fini ? 'opacity-50 grayscale cursor-pointer' : ''}>

        {/* ── Header : countdown + bons restants + partage ── */}
        <div className={`flex items-center gap-1 px-2 py-1.5 ${
          programmee ? 'bg-[#FFF0E0]' :
          urgent && !fini ? 'bg-red-50' : 'bg-[#F5F5F5]'
        }`}>
          <Link href={`/offre/${offre.id}`} className="flex-1 flex items-center justify-between gap-1.5 px-1 py-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {programmee ? (
                <>
                  <span className="text-sm">📅</span>
                  <span className="text-xs font-bold text-[#FF6B00] truncate">
                    Début le {formatDebut(offre.date_debut)}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm">⏱</span>
                  {timeLeft ? (
                    <span className={`text-xs font-black tabular-nums ${
                      urgent && !fini ? 'text-red-500' : 'text-[#0A0A0A]'
                    }`}>
                      {urgent && !fini && <span className="font-semibold mr-1 text-[10px]">Urgent —</span>}
                      {String(timeLeft.h).padStart(2, '0')}h{' '}
                      {String(timeLeft.m).padStart(2, '0')}m{' '}
                      {String(timeLeft.s).padStart(2, '0')}s
                    </span>
                  ) : (
                    <span className="text-xs font-black text-[#3D3D3D]/60">Trop tard !</span>
                  )}
                </>
              )}
            </div>
            <span className={`text-[11px] font-bold ${nbPulse ? 'text-red-500 animate-pulse' : 'text-[#3D3D3D]'}`}>
              {nbBons === null || nbBons === 9999
                ? '∞ bons'
                : `🎫 ${nbBons}`}
            </span>
          </Link>
          <ShareButton offre={offre} commerce={commerce} />
        </div>

        {/* ── Corps : cliquable → détail ── */}
        <Link href={`/offre/${offre.id}`} className="block flex-1 px-3 py-4 flex flex-col gap-2.5">

          {/* Badge remise */}
          <div className="flex items-center justify-center bg-[#FFF0E0] rounded-xl py-4">
            <span className="text-2xl font-black text-[#FF6B00] tracking-tight leading-none">
              {formatBadge(offre)}
            </span>
          </div>

          {/* Titre */}
          <p className="text-xs font-bold text-[#0A0A0A] text-center leading-snug line-clamp-2">
            {offre.titre}
          </p>

          {/* Commerce + catégorie + favori */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {commerce?.categorie && (
              <span className="text-[9px] font-semibold text-[#FF6B00] uppercase tracking-wider bg-[#FFF0E0] px-1.5 py-0.5 rounded-full">
                {getCategorieFiltre(commerce.categorie) || commerce.categorie}
              </span>
            )}
            <span className="text-xs font-semibold text-[#1A1A1A] truncate max-w-[90px]">{commerce?.nom}</span>
            {commerce?.note_google && (
              <span className="text-[10px] font-bold text-yellow-400">⭐ {commerce.note_google}</span>
            )}
            {commerce?.id && (
              <FavoriButton commerceId={commerce.id} commerceNom={commerce.nom || ''} className="!min-h-[28px] !min-w-[28px]" />
            )}
          </div>

          {/* Ville */}
          {commerce?.ville && (
            <p className="text-[10px] text-[#3D3D3D]/50 text-center">📍 {commerce.ville}</p>
          )}

        </Link>

        </div>{/* fin Zone 1 */}

        {/* Zone 2 : CTA toujours actif — non affecté par grayscale/opacity */}
        <div className="px-3 pb-3 pointer-events-auto">
          {fini ? (
            <button
              onClick={handleAbonnerComm}
              disabled={abonneCommLoading}
              className={`w-full text-white font-bold text-[10px] leading-tight py-2.5 rounded-full transition-all duration-200 min-h-[40px] flex items-center justify-center text-center gap-1 ${
                abonneComm
                  ? 'bg-green-500'
                  : 'bg-[#F08040] hover:bg-[#D06830] active:scale-[0.97]'
              }`}
            >
              {abonneCommLoading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : abonneComm
                ? '✅ Abonné à ce commerçant'
                : 'Trop tard ! Abonne-toi à ce commerçant ❤️'}
            </button>
          ) : (
            <button
              onClick={handleReserver}
              disabled={status === 'loading'}
              className={`w-full text-white font-bold text-xs py-2.5 rounded-full transition-all duration-200 min-h-[40px] flex items-center justify-center gap-1.5 ${btnColor}`}
            >
              {status === 'loading' ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : btnLabel}
            </button>
          )}

          {/* Erreur */}
          {status === 'error' && (
            <p className="text-[10px] text-red-500 text-center mt-1 font-semibold">Réessaie dans quelques secondes.</p>
          )}
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

      {/* ── Toast onboarding ── */}
      {toast && (
        <div
          className="fixed bottom-24 left-4 right-4 z-50 bg-[#0A0A0A] text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl text-center"
          style={{ animation: 'fadeSlideUp 0.3s ease' }}
        >
          {toast}
          <style>{`@keyframes fadeSlideUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }`}</style>
        </div>
      )}
    </>
  )
}
