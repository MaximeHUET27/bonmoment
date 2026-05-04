'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/app/context/AuthContext'
import { toSlug } from '@/lib/utils'
import TirageAuSort from '@/app/commercant/components/TirageAuSort'
import ShareButton from '@/app/components/ShareButton'
import AuthButton from '@/app/components/AuthButton'
import DeleteCommerceButton from '@/app/commercant/[id]/DeleteCommerceButton'
import DashboardFideliteSection from '@/app/components/fidelite/DashboardFideliteSection'
import { getFullOffreTitle } from '@/lib/offreTitle'
import dynamic from 'next/dynamic'
const BarChart         = dynamic(() => import('recharts').then(m => m.BarChart),         { ssr: false })
const Bar              = dynamic(() => import('recharts').then(m => m.Bar),              { ssr: false })
const XAxis            = dynamic(() => import('recharts').then(m => m.XAxis),            { ssr: false })
const YAxis            = dynamic(() => import('recharts').then(m => m.YAxis),            { ssr: false })
const Tooltip          = dynamic(() => import('recharts').then(m => m.Tooltip),          { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })
const Cell             = dynamic(() => import('recharts').then(m => m.Cell),             { ssr: false })

export default function DashboardPage() {
  const { user, loading, supabase } = useAuth()
  const router  = useRouter()
  const [commerce,       setCommerce]       = useState(null)
  const [allCommerces,   setAllCommerces]   = useState([])
  const [fetching,       setFetching]       = useState(true)
  const [offres,         setOffres]         = useState([])
  const [nbParticipants, setNbParticipants] = useState({})
  const [gagnantUsers,   setGagnantUsers]   = useState({})

  /* ── Auth guard ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  /* ── Fetch commerce(s) ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const commerceId = params?.get('commerce')

    async function fetchCommerce() {
      // Sélection complète avec les nouvelles colonnes
      let { data, error } = await supabase
        .from('commerces')
        .select('id, nom, categorie, ville, adresse, note_google, palier, photo_url, telephone, horaires, maps_url, stripe_subscription_id, stripe_customer_id, abonnement_actif, resiliation_prevue, date_fin_abonnement')
        .eq('owner_id', user.id)

      // Fallback si les colonnes maps_url/palier n'existent pas encore en BDD
      if (error) {
        const fallback = await supabase
          .from('commerces')
          .select('id, nom, categorie, ville, adresse, note_google, photo_url, telephone, horaires')
          .eq('owner_id', user.id)
        data = fallback.data
      }

      const list = data || []
      setAllCommerces(list)
      if (commerceId) {
        setCommerce(list.find(c => c.id === commerceId) || list[0] || null)
      } else {
        setCommerce(list[0] || null)
      }
      setFetching(false)
    }

    fetchCommerce()
  }, [user, supabase])

  /* ── Fetch offres (actives + expirées) ──────────────────────────────────── */
  useEffect(() => {
    if (!commerce) return
    async function loadOffres() {
      const { data } = await supabase
        .from('offres')
        .select('id, titre, type_remise, valeur, statut, date_debut, date_fin, nb_bons_restants, nb_bons_total, est_recurrente, jours_recurrence, gagnant_id')
        .eq('commerce_id', commerce.id)
        .in('statut', ['active', 'expiree'])
        .order('date_fin', { ascending: false })
        .limit(20)

      setOffres(data || [])

      const concours = (data || []).filter(o => o.type_remise === 'concours' && o.statut === 'expiree')
      if (!concours.length) return

      /* Fetch nb participants */
      const participantEntries = await Promise.all(
        concours.map(o =>
          supabase
            .from('reservations')
            .select('id', { count: 'exact', head: true })
            .eq('offre_id', o.id)
            .eq('statut', 'utilisee')
            .then(({ count }) => [o.id, count ?? 0])
        )
      )
      setNbParticipants(Object.fromEntries(participantEntries))

      /* Fetch gagnants pour les concours déjà tirés */
      const avecGagnant = concours.filter(o => o.gagnant_id)
      if (!avecGagnant.length) return

      const { data: usersData } = await supabase
        .from('users')
        .select('id, nom, email')
        .in('id', avecGagnant.map(o => o.gagnant_id))

      const map = {}
      for (const o of avecGagnant) {
        const u = usersData?.find(u => u.id === o.gagnant_id)
        if (u) map[o.id] = { ...u, prenom: u.nom?.split(' ')[0] ?? u.nom }
      }
      setGagnantUsers(map)
    }
    loadOffres()
  }, [commerce, supabase])

  if (loading || fetching) {
    return (
      <main className="min-h-screen bg-[#F5F5F5] flex flex-col">
        <header className="w-full bg-white border-b border-[#EBEBEB] px-6 py-4 flex items-center justify-between">
          <div className="w-[120px] h-8 bg-[#E0E0E0] rounded-xl animate-pulse" />
        </header>
        <div className="flex-1 w-full max-w-xl mx-auto px-5 py-6 flex flex-col gap-5 animate-pulse">
          <div className="w-full h-[72px] bg-[#FFD9B8] rounded-3xl" />
          <div className="bg-white rounded-3xl px-6 py-6 h-28 shadow-sm" />
          <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-3 shadow-sm">
            <div className="h-4 w-36 bg-[#E0E0E0] rounded" />
            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => <div key={i} className="bg-[#F5F5F5] rounded-2xl h-16" />)}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => <div key={i} className="bg-[#F5F5F5] rounded-2xl h-16" />)}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[...Array(2)].map((_, i) => <div key={i} className="bg-[#F5F5F5] rounded-2xl h-16" />)}
            </div>
          </div>
          <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-4 shadow-sm">
            <div className="h-4 w-40 bg-[#E0E0E0] rounded" />
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-1">
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-4 w-3/4 bg-[#E0E0E0] rounded" />
                  <div className="h-3 w-1/2 bg-[#E0E0E0] rounded" />
                </div>
                <div className="h-5 w-10 bg-[#E0E0E0] rounded shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </main>
    )
  }

  if (!user) return null

  const now            = new Date()
  const offresActives  = offres.filter(o => o.statut === 'active' && new Date(o.date_fin) > now)
  const offresExpirees = offres.filter(o => o.statut === 'expiree' || new Date(o.date_fin) <= now)

  function handleDeleteOffre(offreId) {
    setOffres(prev => prev.filter(o => o.id !== offreId))
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5] flex flex-col">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="w-full bg-white border-b border-[#EBEBEB] px-6 py-4 flex items-center justify-between">
        <Link href="/" aria-label="Accueil BONMOMENT">
          <Image
            src="/LOGO.png"
            alt="BONMOMENT"
            width={600}
            height={300}
            unoptimized
            priority
            className="w-[120px] h-auto"
          />
        </Link>
        <AuthButton />
      </header>

      {/* ── Corps ────────────────────────────────────────────────────────── */}
      <div className="flex-1 w-full max-w-xl mx-auto px-5 py-6 flex flex-col gap-5">

        {/* 0. BANNIÈRE ABONNEMENT — visible uniquement si pas de palier actif ── */}
        {commerce && !commerce.palier && (
          <div className="w-full bg-[#FF6B00] rounded-xl px-4 py-3 flex flex-row items-center justify-between gap-3">
            <p className="text-white font-bold text-[11px] sm:text-[13px] leading-tight">
              {commerce.stripe_customer_id
                ? '⚠️ Ton abonnement est inactif — Renouvelle pour publier de nouvelles offres'
                : <>🔒 Pour publier des offres, choisis ton abonnement — 1<sup>er</sup> mois offert !</>
              }
            </p>
            <Link
              href={`/commercant/abonnement?commerce_id=${commerce.id}`}
              className="shrink-0 bg-white text-[#FF6B00] font-black text-xs px-3 py-2 rounded-lg hover:bg-[#FFF0E0] transition-colors whitespace-nowrap"
            >
              {commerce.stripe_customer_id ? 'Renouveler →' : 'Choisir mon palier →'}
            </Link>
          </div>
        )}

        {/* 1. Boutons principaux ──────────────────────────────────────────── */}
        {commerce && (
          <div className="flex gap-4 items-start">
            <Link
              href={`/commercant/valider?commerce=${commerce.id}`}
              className="flex-1 h-[60px] bg-[#FF6B00] hover:bg-[#CC5500] text-white font-semibold text-lg rounded-xl transition duration-150 ease-out hover:scale-[1.02] active:scale-[0.97] flex items-center justify-center text-center"
            >
              ✅ Vérifier un bon
            </Link>
            {commerce.palier ? (
              <Link
                href={`/commercant/offre/nouvelle?commerce=${commerce.id}`}
                className="flex-1 h-[60px] border-2 border-[#FF6B00] text-[#FF6B00] bg-white hover:bg-[#FFF0E0] font-semibold text-lg rounded-xl transition duration-150 ease-out hover:scale-[1.02] active:scale-[0.97] flex items-center justify-center text-center"
              >
                ✨ Créer une offre
              </Link>
            ) : (
              <div className="flex-1 flex flex-col items-center">
                <div className="w-full h-[60px] opacity-50 cursor-not-allowed pointer-events-none border-2 border-[#D0D0D0] text-[#D0D0D0] bg-white font-semibold text-lg rounded-xl flex items-center justify-center text-center select-none">
                  ✨ Créer une offre
                </div>
                <p className="mt-1 text-[11px] text-[#3D3D3D]/50 text-center leading-tight">Choisis un abonnement pour créer ta première offre</p>
              </div>
            )}
          </div>
        )}

        {/* 2. TON ÉTABLISSEMENT ──────────────────────────────────────────── */}
        {commerce && (
          <div className="bg-white rounded-3xl overflow-hidden flex flex-col gap-4 shadow-sm">
            {/* Photo */}
            {commerce.photo_url ? (
              <Image
                src={commerce.photo_url}
                alt={commerce.nom}
                width={500}
                height={200}
                className="w-full h-[200px] object-cover"
              />
            ) : (
              <div className="w-full h-[200px] bg-[#F5F5F5] flex items-center justify-center">
                <span className="text-5xl">🏪</span>
              </div>
            )}
            <div className="px-6 pb-6 flex flex-col gap-4">
            <h2 className="text-sm font-black text-[#0A0A0A] uppercase tracking-wide">Ton établissement</h2>
            <div className="flex flex-col gap-2">
              {commerce.categorie && (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold text-[#FF6B00] uppercase tracking-widest bg-[#FFF0E0] px-2 py-0.5 rounded-full">
                    {commerce.categorie}
                  </span>
                </div>
              )}
              <p className="text-base font-bold text-[#0A0A0A]">{commerce.nom}</p>
              {commerce.adresse && (
                <p className="text-xs text-[#3D3D3D]/60">📍 {commerce.adresse}</p>
              )}
              {commerce.ville && (
                <p className="text-xs text-[#3D3D3D]/60">{commerce.ville}</p>
              )}
              {commerce.telephone && (
                <a href={`tel:${commerce.telephone}`} className="text-sm text-blue-600 underline">📞 {commerce.telephone}</a>
              )}
              {commerce.note_google && (
                <p className="text-xs text-[#3D3D3D]/60">⭐ {commerce.note_google} / 5 sur Google</p>
              )}
              <a
                href={commerce.maps_url || `https://maps.google.com/?q=${encodeURIComponent(commerce.nom + ' ' + commerce.ville)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="self-start text-xs font-semibold text-[#FF6B00] border border-[#FF6B00] px-3 py-1 rounded-full hover:bg-[#FFF0E0] transition-colors"
              >
                📍 Voir sur Google Maps
              </a>
              {commerce.horaires && (() => {
                const joursCles = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
                const jourActuel = joursCles[new Date().getDay()]
                const horairesObj = typeof commerce.horaires === 'string' ? (() => { try { return JSON.parse(commerce.horaires) } catch { return null } })() : commerce.horaires
                const valJour = horairesObj?.[jourActuel]
                if (!valJour) return null
                return <p className="text-xs text-[#3D3D3D]/60">📅 Ouvert aujourd&apos;hui : {valJour}</p>
              })()}
            </div>
            </div>
          </div>
        )}

        {/* 3. ABONNEMENT ──────────────────────────────────────────────────── */}
        {commerce && (
          <AbonnementSection commerce={commerce} offres={offres} />
        )}

        {/* 4. TES STATISTIQUES ────────────────────────────────────────────── */}
        {commerce && (
          <StatsSection commerce={commerce} supabase={supabase} />
        )}

        {/* 6. OFFRES — onglets actives / expirées ─────────────────────────── */}
        {commerce && (
          <OffresSection
            offresActives={offresActives}
            offresExpirees={offresExpirees}
            commerce={commerce}
            supabase={supabase}
            nbParticipants={nbParticipants}
            gagnantUsers={gagnantUsers}
            onDeleteOffre={handleDeleteOffre}
          />
        )}

        {/* 6. PARRAINAGE ──────────────────────────────────────────────────── */}
        {commerce && (
          <ParrainageSection commerce={commerce} supabase={supabase} />
        )}

        {/* 7. FIDÉLITÉ ────────────────────────────────────────────────────── */}
        {commerce && (
          <DashboardFideliteSection commerceId={commerce.id} commerce={commerce} />
        )}

        {/* 8. QR CODE ─────────────────────────────────────────────────────── */}
        {commerce && (
          <QRVitrine commerce={commerce} />
        )}

        {/* 8. Supprimer ce commerce ───────────────────────────────────────── */}
        {commerce && user && (
          <DeleteCommerceButton commerceId={commerce.id} commerceNom={commerce.nom} ownerUserId={user.id} />
        )}

      </div>

    </main>
  )
}

/* ── Carte KPI ───────────────────────────────────────────────────────────── */

function KpiCard({ emoji, label, value, sub, valueColor }) {
  return (
    <div className="bg-white rounded-2xl px-3 py-4 shadow-sm border border-[#F0F0F0] flex flex-col gap-0.5">
      <p className={`text-2xl font-black leading-none ${valueColor || 'text-[#0A0A0A]'}`}>
        {value}
      </p>
      <p className="text-[11px] text-gray-400 leading-tight mt-1">
        {emoji} {label}
      </p>
      {sub && <p className="text-[10px] text-gray-400 leading-none">{sub}</p>}
    </div>
  )
}

/* ── Section abonnement ──────────────────────────────────────────────────── */

function AbonnementSection({ commerce, offres }) {
  const [subInfo, setSubInfo] = useState(null)   // { current_period_end, cancel_at_period_end, status }

  useEffect(() => {
    if (!commerce.stripe_subscription_id) return
    fetch(`/api/stripe/subscription-info?subscription_id=${commerce.stripe_subscription_id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setSubInfo(d) })
      .catch(() => {})
  }, [commerce.stripe_subscription_id])

  const PALIERS = {
    essentiel: { nom: 'Essentiel', quota: 8,    prix: '29€/mois' },
    pro:       { nom: 'Pro',       quota: null,  prix: '49€/mois' },
  }

  const palier = PALIERS[commerce.palier] || PALIERS['essentiel']
  const now    = new Date()

  const debutMois    = new Date(now.getFullYear(), now.getMonth(), 1)
  const publieesMois = offres.filter(o => new Date(o.created_at || o.date_debut) >= debutMois).length
  const restantes    = palier.quota === null ? null : Math.max(0, palier.quota - publieesMois)
  const progPct      = palier.quota === null ? 0 : Math.min(100, Math.round((publieesMois / palier.quota) * 100))

  // Pas encore de palier → section masquée
  if (!commerce.palier) return null

  /* ── Date de renouvellement ────────────────────────────────────────────── */
  let renewalDate = null

  if (subInfo?.current_period_end) {
    // Source de vérité : Stripe (timestamp UNIX → Date)
    renewalDate = new Date(subInfo.current_period_end * 1000)
  } else if (commerce.date_fin_abonnement) {
    // Activation admin ou valeur BDD
    renewalDate = new Date(commerce.date_fin_abonnement)
  }

  const renewalStr = renewalDate
    ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(renewalDate)
    : null

  /* ── Résiliation prévue : Stripe OU flag BDD ───────────────────────────── */
  const isResiliation = commerce.resiliation_prevue || subInfo?.cancel_at_period_end === true

  return (
    <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-4 shadow-sm">
      <h2 className="text-sm font-black text-[#0A0A0A] uppercase tracking-wide">Ton abonnement</h2>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xl font-black text-[#FF6B00]">📦 {palier.nom}</p>
          <p className="text-xs text-[#3D3D3D]/60 mt-0.5">{palier.quota === null ? 'Offres illimitées' : `${palier.quota} offres/mois`} · {palier.prix}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/commercant/abonnement?commerce_id=${commerce.id}`}
            className="text-xs font-bold text-[#FF6B00] border border-[#FF6B00] px-3 py-1.5 rounded-full hover:bg-[#FFF0E0] transition-colors min-h-[36px] flex items-center"
          >
            Changer
          </Link>
          <Link
            href={`/commercant/resiliation?commerce_id=${commerce.id}`}
            className="text-xs font-bold text-[#3D3D3D]/60 border border-[#E0E0E0] px-3 py-1.5 rounded-full hover:border-[#FF6B00] hover:text-[#FF6B00] transition-colors min-h-[36px] flex items-center"
          >
            Gérer
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#0A0A0A]">
            {palier.quota === null
              ? `${publieesMois} offres publiées ce mois`
              : `${publieesMois}/${palier.quota} offres publiées ce mois`}
          </p>
          {restantes !== null && (
            <p className={`text-xs font-bold ${restantes <= 1 ? 'text-orange-500' : 'text-[#3D3D3D]/60'}`}>
              {restantes} restante{restantes > 1 ? 's' : ''}
            </p>
          )}
        </div>
        {palier.quota !== null && (
          <div className="w-full h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${restantes !== null && restantes <= 1 ? 'bg-orange-400' : 'bg-[#FF6B00]'}`}
              style={{ width: `${progPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Date de renouvellement OU message résiliation — même emplacement */}
      {renewalStr && (
        isResiliation ? (
          <div style={{ background: '#FFF8E0', borderRadius: '8px', padding: '12px' }}>
            <p className="text-xs font-black" style={{ color: '#8B6E00' }}>
              ⚠️ Ton abonnement prend fin le {renewalStr}
            </p>
            <p className="text-[11px] mt-1" style={{ color: '#8B6E00', opacity: 0.85 }}>
              Tu peux toujours publier des offres et vérifier des bons jusque-là.
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-[#3D3D3D]/40">🔄 Renouvellement le {renewalStr}</p>
        )
      )}
    </div>
  )
}

/* ── Section statistiques ────────────────────────────────────────────────── */

function StatsSection({ commerce, supabase }) {
  const [stats, setStats] = useState(null)
  const [avisCount,     setAvisCount]     = useState(null)
  const [feedbackCount, setFeedbackCount] = useState(null)
  const [feedbacks,     setFeedbacks]     = useState([])
  const [showFeedbacks, setShowFeedbacks] = useState(false)
  const [markingLu,     setMarkingLu]     = useState(null)

  async function loadStats() {
    const now              = new Date()
    const debutMois        = new Date(now.getFullYear(), now.getMonth(), 1)
    const debutMoisDernier = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const finMoisDernier   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

    // Récupère tous les IDs d'offres du commerce
    const { data: offresData } = await supabase
      .from('offres')
      .select('id')
      .eq('commerce_id', commerce.id)
    const offreIds = (offresData || []).map(o => o.id)

    if (offreIds.length === 0) {
      setStats({
        bonReservesMois: 0, bonUtilisesMois: 0,
        offresPubileesMois: 0, nbAbonnes: 0,
        heurePlusActive: null, bonReservesMoisDernier: 0,
        nouveauxClients: 0, nbClientsFideles: null, joursData: null, heuresData: null,
      })
      return
    }

    const [
      { count: bonReservesMois },
      { count: bonUtilisesMois },
      { count: offresPubileesMois },
      { count: nbAbonnes },
      { count: bonReservesMoisDernier },
      { data: toutesReservations },
      { data: data_nouveaux },
      { data: data_charts },
    ] = await Promise.all([
      // Bons réservés ce mois
      supabase.from('reservations')
        .select('id', { count: 'exact', head: true })
        .in('offre_id', offreIds)
        .gte('created_at', debutMois.toISOString()),
      // Bons utilisés ce mois
      supabase.from('reservations')
        .select('id', { count: 'exact', head: true })
        .in('offre_id', offreIds)
        .eq('statut', 'utilisee')
        .gte('created_at', debutMois.toISOString()),
      // Offres publiées ce mois
      supabase.from('offres')
        .select('id', { count: 'exact', head: true })
        .eq('commerce_id', commerce.id)
        .gte('created_at', debutMois.toISOString()),
      // Abonnés (users avec ce commerce dans commerces_abonnes)
      supabase.from('users')
        .select('id', { count: 'exact', head: true })
        .contains('commerces_abonnes', [commerce.id]),
      // Bons réservés mois dernier
      supabase.from('reservations')
        .select('id', { count: 'exact', head: true })
        .in('offre_id', offreIds)
        .gte('created_at', debutMoisDernier.toISOString())
        .lte('created_at', finMoisDernier.toISOString()),
      // Toutes les réservations (pour heure la plus active)
      supabase.from('reservations')
        .select('created_at')
        .in('offre_id', offreIds),
      // Nouveaux clients ce mois
      supabase.from('reservations')
        .select('user_id')
        .in('offre_id', offreIds)
        .gte('created_at', debutMois.toISOString()),
      // Réservations 30j pour charts
      supabase.from('reservations')
        .select('created_at, utilise_at, statut')
        .in('offre_id', offreIds)
        .gte('created_at', new Date(Date.now() - 30*24*60*60*1000).toISOString()),
    ])

    // Heure la plus active
    let heurePlusActive = null
    if (toutesReservations && toutesReservations.length > 0) {
      const hMap = {}
      for (const r of toutesReservations) {
        const h = new Date(r.created_at).getHours()
        hMap[h] = (hMap[h] || 0) + 1
      }
      const best = Object.entries(hMap).sort((a, b) => b[1] - a[1])[0]
      if (best) heurePlusActive = parseInt(best[0])
    }

    // Nouveaux clients
    const nouveauxClients = new Set((data_nouveaux || []).map(r => r.user_id)).size

    // Clients fidèles (Pro + programme actif uniquement)
    let nbClientsFideles = null
    if (commerce.palier === 'pro') {
      try {
        const { data: prog } = await supabase
          .from('programmes_fidelite').select('actif').eq('commerce_id', commerce.id).maybeSingle()
        if (prog?.actif === true) {
          const { data: passagesData } = await supabase
            .from('passages_fidelite').select('carte_fidelite_id')
            .eq('annule', false).neq('mode_identification', 'recompense_remise')
          nbClientsFideles = new Set((passagesData || []).map(p => p.carte_fidelite_id)).size
        }
      } catch (_) { /* ne bloque pas les autres KPIs */ }
    }

    // Charts data: jours (utilise_at) et heures (created_at)
    const joursMap = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    const heuresMap = {}
    for (const r of (data_charts || [])) {
      if (r.statut === 'utilisee' && r.utilise_at) {
        const d = new Date(r.utilise_at).getDay()
        joursMap[d] = (joursMap[d] || 0) + 1
      }
      const h = new Date(r.created_at).getHours()
      const tranche = Math.floor(h / 2) * 2
      if (tranche >= 8 && tranche <= 20) heuresMap[tranche] = (heuresMap[tranche] || 0) + 1
    }
    const joursData = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map((name, i) => ({
      name, value: joursMap[(i+1) % 7]
    }))
    const heuresData = [8,10,12,14,16,18,20].map(h => ({
      name: `${h}h`, value: heuresMap[h] || 0
    }))

    setStats({
      bonReservesMois:        bonReservesMois ?? 0,
      bonUtilisesMois:        bonUtilisesMois ?? 0,
      offresPubileesMois:     offresPubileesMois ?? 0,
      nbAbonnes:              nbAbonnes ?? 0,
      heurePlusActive,
      bonReservesMoisDernier: bonReservesMoisDernier ?? 0,
      nouveauxClients,
      nbClientsFideles,
      joursData,
      heuresData,
    })
  }

  useEffect(() => {
    if (!commerce || !supabase) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStats()
    function onVisible() {
      if (document.visibilityState === 'visible') loadStats()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [commerce.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!commerce) return
    const now = new Date()
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1)
    async function loadAvis() {
      const [{ count: google }, { count: nonLus }] = await Promise.all([
        supabase.from('avis_google_clics').select('id', { count: 'exact', head: true }).eq('commerce_id', commerce.id).gte('created_at', debutMois.toISOString()),
        supabase.from('feedbacks_commerce').select('id', { count: 'exact', head: true }).eq('commerce_id', commerce.id).eq('lu', false),
      ])
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvisCount(google ?? 0)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFeedbackCount(nonLus ?? 0)
    }
    loadAvis()
  }, [commerce, supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadFeedbacks() {
    const { data } = await supabase
      .from('feedbacks_commerce')
      .select('id, note, commentaire, lu, created_at')
      .eq('commerce_id', commerce.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setFeedbacks(data || [])
    setShowFeedbacks(true)
  }

  async function marquerLu(feedbackId) {
    setMarkingLu(feedbackId)
    await supabase.from('feedbacks_commerce').update({ lu: true }).eq('id', feedbackId)
    setFeedbacks(prev => prev.map(f => f.id === feedbackId ? { ...f, lu: true } : f))
    setFeedbackCount(prev => Math.max(0, (prev ?? 1) - 1))
    setMarkingLu(null)
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const taux = stats && stats.bonReservesMois > 0
    ? Math.round((stats.bonUtilisesMois / stats.bonReservesMois) * 100)
    : null

  const tauxColor = taux === null ? 'text-[#0A0A0A]'
    : taux > 50 ? 'text-green-600'
    : taux >= 20 ? 'text-orange-500'
    : 'text-red-500'

  const tendance = stats ? (() => {
    const curr = stats.bonReservesMois
    const prev = stats.bonReservesMoisDernier
    if (prev === 0 && curr === 0) return null
    if (prev === 0) return { pct: null, up: true }
    const pct = Math.round(((curr - prev) / prev) * 100)
    return { pct, up: pct >= 0 }
  })() : null

  return (
    <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-4 shadow-sm">
      <h2 className="text-sm font-black text-[#0A0A0A] uppercase tracking-wide">Tes statistiques</h2>

      {!stats ? (
        <div className="flex flex-col gap-3 animate-pulse">
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => <div key={i} className="bg-[#F5F5F5] rounded-2xl h-16" />)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[...Array(2)].map((_, i) => <div key={i} className="bg-[#F5F5F5] rounded-2xl h-16" />)}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">

          {/* Ligne 1 : bons réservés, utilisés, taux */}
          <div className="grid grid-cols-3 gap-3">
            <KpiCard
              emoji="🎟️"
              label="Bons réservés"
              value={stats.bonReservesMois}
              sub="ce mois"
            />
            <KpiCard
              emoji="✅"
              label="Bons utilisés"
              value={stats.bonUtilisesMois}
              sub="ce mois"
            />
            <KpiCard
              emoji="📊"
              label="Taux d'utilisation"
              value={taux !== null ? `${taux}%` : '—'}
              valueColor={tauxColor}
            />
          </div>

          {/* Nouveaux clients + tendance badge */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl px-3 py-4 shadow-sm border border-[#F0F0F0] flex flex-col gap-0.5">
              <p className="text-2xl font-black leading-none text-[#0A0A0A]">{stats.nouveauxClients}</p>
              <p className="text-[11px] text-gray-400 leading-tight mt-1">👥 Nouveaux clients</p>
              <p className="text-[10px] text-gray-400">habitants ce mois</p>
            </div>
            <div className="bg-white rounded-2xl px-3 py-4 shadow-sm border border-[#F0F0F0] flex flex-col gap-0.5 justify-center">
              {tendance ? (
                <span className={`text-sm font-bold ${tendance.up ? 'text-green-600' : 'text-red-500'}`}>
                  {tendance.up ? '↗' : '↘'}{' '}
                  {tendance.pct !== null
                    ? `${tendance.pct >= 0 ? '+' : ''}${tendance.pct}%`
                    : 'Nouveau !'}
                </span>
              ) : (
                <span className="text-sm font-bold text-[#0A0A0A]">—</span>
              )}
              <p className="text-[11px] text-gray-400 leading-tight mt-1">📈 Ce mois vs mois dernier</p>
              {tendance && tendance.pct !== null && (
                <p className="text-[10px] text-gray-400">{stats.bonReservesMois} vs {stats.bonReservesMoisDernier} bons</p>
              )}
            </div>
          </div>

          {/* Clients fidèles (Pro + programme actif uniquement) */}
          {stats.nbClientsFideles !== null && (
            <div className="grid grid-cols-1 gap-3">
              <KpiCard
                emoji="🎯"
                label="clients fidèles"
                value={stats.nbClientsFideles}
                sub="total"
              />
            </div>
          )}

          {/* Avis Google + Retours clients */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl px-3 py-4 shadow-sm border border-[#F0F0F0] flex flex-col gap-0.5">
              <p className="text-2xl font-black leading-none text-[#0A0A0A]">
                {avisCount === null ? '…' : avisCount}
              </p>
              <p className="text-[11px] text-gray-400 leading-tight mt-1">⭐ Avis Google générés</p>
              <p className="text-[10px] text-gray-400">ce mois</p>
            </div>
            <button
              onClick={loadFeedbacks}
              className="bg-white rounded-2xl px-3 py-4 shadow-sm border border-[#F0F0F0] flex flex-col gap-0.5 text-left hover:border-[#FF6B00] transition-colors relative"
            >
              {feedbackCount !== null && feedbackCount > 0 && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {feedbackCount > 9 ? '9+' : feedbackCount}
                </span>
              )}
              <p className="text-2xl font-black leading-none text-[#0A0A0A]">
                {feedbackCount === null ? '…' : feedbackCount}
              </p>
              <p className="text-[11px] text-gray-400 leading-tight mt-1">💬 Retours non lus</p>
              <p className="text-[10px] text-[#FF6B00] font-semibold">Voir tout →</p>
            </button>
          </div>

          {/* Tendances: jours et heures */}
          {stats.joursData && stats.heuresData && (
            <div className="flex flex-col gap-4 mt-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#3D3D3D]/50 mb-2">📅 Jours les plus actifs</p>
                <ResponsiveContainer width="100%" height={80}>
                  <BarChart data={stats.joursData} layout="vertical" margin={{top:0,right:8,bottom:0,left:24}}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={24} tick={{fontSize:10}} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => [`${v} utilisations`, '']} />
                    <Bar dataKey="value" radius={[0,4,4,0]}>
                      {stats.joursData.map((_, i) => (
                        <Cell key={i} fill={(i+1) % 7 === new Date().getDay() ? '#FF6B00' : '#FFD4B2'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#3D3D3D]/50 mb-2">⏰ Heures de pointe</p>
                <ResponsiveContainer width="100%" height={80}>
                  <BarChart data={stats.heuresData} layout="vertical" margin={{top:0,right:8,bottom:0,left:24}}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={24} tick={{fontSize:10}} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => [`${v} réservations`, '']} />
                    <Bar dataKey="value" fill="#FF6B00" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Liste des feedbacks */}
      {showFeedbacks && (
        <div className="flex flex-col gap-3 mt-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wide">Tous les retours</p>
            <button
              onClick={() => setShowFeedbacks(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Fermer ✕
            </button>
          </div>
          {feedbacks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Aucun retour pour l&apos;instant</p>
          ) : feedbacks.map(f => (
            <div
              key={f.id}
              className={`rounded-2xl px-4 py-3 border flex flex-col gap-1 ${f.lu ? 'border-[#F0F0F0] bg-white' : 'border-[#FFD4B2] bg-[#FFF7ED]'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-base">
                  {'⭐'.repeat(f.note)}{'☆'.repeat(5 - f.note)}
                </span>
                <span className="text-[10px] text-gray-400">{formatDate(f.created_at)}</span>
              </div>
              {f.commentaire && (
                <p className="text-sm text-[#3D3D3D] leading-snug">{f.commentaire}</p>
              )}
              {!f.lu && (
                <button
                  onClick={() => marquerLu(f.id)}
                  disabled={markingLu === f.id}
                  className="self-start text-[11px] font-semibold text-[#FF6B00] border border-[#FF6B00] px-2.5 py-1 rounded-full hover:bg-[#FFF0E0] transition-colors disabled:opacity-50 mt-1"
                >
                  {markingLu === f.id ? '…' : 'Marquer comme lu'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Section parrainage ──────────────────────────────────────────────────── */

const PARRAIN_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

// Format BMxxxxxx : préfixe BM + 6 caractères sans ambiguïté
function genCodeBM() {
  let c = 'BM'
  for (let i = 0; i < 6; i++) c += PARRAIN_CHARS[Math.floor(Math.random() * PARRAIN_CHARS.length)]
  return c
}

function ParrainageSection({ commerce, supabase }) {
  const [codes,      setCodes]      = useState([])
  const [loaded,     setLoaded]     = useState(false)
  const [generating, setGenerating] = useState(false)
  const [newCode,    setNewCode]    = useState(null)
  const [limitMsg,   setLimitMsg]   = useState(null)
  const [copiedCode, setCopiedCode] = useState(null)

  async function handleCopy(code) {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch {}
  }

  async function loadCodes() {
    const { data: rawCodes } = await supabase
      .from('codes_parrainage')
      .select('id, code, created_at, expire_at, statut, utilise_par')
      .eq('commerce_id', commerce.id)
      .order('created_at', { ascending: false })

    const codes = rawCodes || []

    // Récupère les noms des filleuls pour les codes utilisés
    const usedIds = codes.filter(c => c.statut === 'utilise' && c.utilise_par).map(c => c.utilise_par)
    let filleulMap = {}
    if (usedIds.length > 0) {
      const { data: filleuls } = await supabase
        .from('commerces')
        .select('id, nom')
        .in('id', usedIds)
      if (filleuls) filleulMap = Object.fromEntries(filleuls.map(f => [f.id, f.nom]))
    }

    setCodes(codes.map(c => ({ ...c, filleul_nom: filleulMap[c.utilise_par] || null })))
    setLoaded(true)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { loadCodes() }, [])

  const debutMois = new Date(); debutMois.setDate(1); debutMois.setHours(0, 0, 0, 0)
  const countMois = codes.filter(c => new Date(c.created_at) >= debutMois).length

  async function genererCode() {
    setLimitMsg(null)
    setGenerating(true)

    const { count } = await supabase
      .from('codes_parrainage')
      .select('id', { count: 'exact', head: true })
      .eq('commerce_id', commerce.id)
      .gte('created_at', debutMois.toISOString())

    if ((count ?? 0) >= 3) {
      setLimitMsg('Tu as atteint la limite de 3 parrainages ce mois.')
      setGenerating(false)
      return
    }

    let code = genCodeBM()
    for (let i = 0; i < 5; i++) {
      const { data: ex } = await supabase.from('codes_parrainage').select('id').eq('code', code).maybeSingle()
      if (!ex) break
      code = genCodeBM()
    }

    const expireAt = new Date(); expireAt.setMonth(expireAt.getMonth() + 3)
    const { data, error } = await supabase
      .from('codes_parrainage')
      .insert({ commerce_id: commerce.id, code, expire_at: expireAt.toISOString(), statut: 'actif' })
      .select().single()

    if (!error && data) {
      setNewCode(data)
      await loadCodes()
    }
    setGenerating(false)
  }

  async function partagerCode(code) {
    try {
      await navigator.share({
        text: `Rejoins BONMOMENT avec mon code ${code} et profite d'une remise ! 👉 bonmoment.app`,
      })
    } catch {}
  }

  const sortedCodes = [...codes].sort((a, b) => {
    const order = { actif: 0, utilise: 1, expire: 2 }
    return (order[a.statut] ?? 3) - (order[b.statut] ?? 3)
  })

  return (
    <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-[#0A0A0A] uppercase tracking-wide">Parrainage</h2>
        <span className="text-xs font-semibold text-[#3D3D3D]/60">
          Ce mois : {loaded ? countMois : '…'}/3
        </span>
      </div>

      <p className="text-xs text-[#3D3D3D]/60 -mt-2">
        Génère un code à partager à un autre commerçant. Limite : 3 codes par mois, valables 3 mois.
      </p>

      {limitMsg && (
        <p className="text-xs text-red-500 font-semibold bg-red-50 px-3 py-2 rounded-xl">{limitMsg}</p>
      )}

      {newCode && (
        <div className="bg-[#FFF0E0] border border-[#FF6B00]/20 rounded-2xl px-4 py-4 flex flex-col gap-2">
          <p className="text-[10px] font-semibold text-[#FF6B00] uppercase tracking-widest">Code généré ✓</p>
          <div className="flex items-center gap-3">
            <p
              className="text-3xl font-black text-[#FF6B00] tracking-[0.25em] leading-none"
              style={{ fontFamily: 'Courier New, monospace' }}
            >
              {newCode.code}
            </p>
            <button
              onClick={() => handleCopy(newCode.code)}
              className="text-[#999] hover:text-[#FF6B00] transition-colors duration-200 cursor-pointer shrink-0 p-0.5"
              aria-label="Copier le code"
            >
              {copiedCode === newCode.code ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-[11px] text-[#3D3D3D]/50">
            Valable jusqu&apos;au{' '}
            {new Date(newCode.expire_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <button
            onClick={() => partagerCode(newCode.code)}
            className="mt-1 w-full flex items-center justify-center gap-1.5 bg-[#FF6B00] hover:bg-[#CC5500] text-white font-bold text-sm py-2.5 rounded-xl transition-colors"
          >
            📤 Partager ce code
          </button>
        </div>
      )}

      <button
        onClick={genererCode}
        disabled={generating || countMois >= 3}
        className="w-full flex items-center justify-center gap-2 bg-[#FF6B00] hover:bg-[#CC5500] disabled:bg-[#D0D0D0] disabled:cursor-not-allowed text-white font-bold text-sm py-3 rounded-xl transition-colors min-h-[44px]"
      >
        {generating
          ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : '🎁 Générer un code de parrainage'}
      </button>

      {sortedCodes.length > 0 && (
        <div className="flex flex-col gap-0.5 mt-1">
          <p className="text-[10px] font-semibold text-[#3D3D3D]/40 uppercase tracking-widest mb-1">Historique</p>
          {sortedCodes.map(c => (
            <div key={c.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-[#F5F5F5] last:border-0">
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="font-bold text-sm text-[#0A0A0A] tracking-widest"
                    style={{ fontFamily: 'Courier New, monospace' }}
                  >
                    {c.code}
                  </span>
                  <button
                    onClick={() => handleCopy(c.code)}
                    className="text-[#999] hover:text-[#FF6B00] transition-colors duration-200 cursor-pointer shrink-0 p-0.5"
                    aria-label="Copier le code"
                  >
                    {copiedCode === c.code ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
                <span className="text-[10px] text-[#3D3D3D]/40">
                  Créé le {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  {' · '}
                  Expire le {new Date(c.expire_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
                </span>
              </div>
              <span className="text-xs font-bold shrink-0 text-right">
                {c.statut === 'actif'   ? '🟢 Actif'
               : c.statut === 'utilise' ? `🟠 ${c.filleul_nom ? `Utilisé par ${c.filleul_nom}` : 'Utilisé'}`
               :                         '🔴 Expiré'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Ligne d'offre ───────────────────────────────────────────────────────── */

function OffreRow({ offre, commerce, expired = false }) {
  const labels = {
    pourcentage:    `${offre.valeur}%`,
    montant_fixe:   `${offre.valeur}€`,
    cadeau:         '🎁',
    produit_offert: '📦',
    service_offert: '✂️',
    concours:       '🎰',
    atelier:        '🎉',
  }

  return (
    <div className={`flex items-center justify-between gap-3 py-1 ${expired ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#0A0A0A] truncate">{getFullOffreTitle(offre)}</p>
        <p className="text-[11px] text-[#3D3D3D]/50">
          {expired ? 'Terminée' : (
            new Date(offre.date_fin) > new Date()
              ? `Jusqu'à ${new Date(offre.date_fin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
              : 'Expirée'
          )}
          {offre.nb_bons_restants != null && offre.nb_bons_restants !== 9999 && (
            ` · ${offre.nb_bons_restants} bons restants`
          )}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-sm font-black text-[#FF6B00]">
          {labels[offre.type_remise] ?? offre.type_remise}
        </span>
        {!expired && commerce && (
          <ShareButton
            offre={{ ...offre, commerces: commerce }}
            commerce={commerce}
            shareText={`🎉 Nouvelle offre chez ${commerce.nom} ! ${getFullOffreTitle(offre)} — Réserve ton bon gratuit 👉 bonmoment.app/offre/${offre.id}`}
            shareTitle={`Nouvelle offre chez ${commerce.nom} — BONMOMENT`}
          />
        )}
      </div>
    </div>
  )
}

/* ── Onglets offres ──────────────────────────────────────────────────────── */

const TYPE_LABEL = {
  pourcentage:    o => `−${o.valeur}%`,
  montant_fixe:   o => `−${o.valeur}€`,
  cadeau:         () => '🎁 Cadeau',
  produit_offert: () => '📦 Offert',
  service_offert: () => '✂️ Service',
  concours:       () => '🎰 Concours',
  atelier:        () => '🎉 Évènement',
  fidelite:       () => '⭐ Fidélité',
}
function typeLabel(offre) {
  return TYPE_LABEL[offre.type_remise]?.(offre) ?? offre.type_remise ?? 'Offre'
}

function OffresSection({ offresActives, offresExpirees, commerce, supabase, nbParticipants, gagnantUsers, onDeleteOffre }) {
  const router = useRouter()
  const [tab,           setTab]           = useState('actives')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting,      setDeleting]      = useState(null)
  const [deleteError,   setDeleteError]   = useState(null)
  const [reservStats,   setReservStats]   = useState(null)
  const [loadingStats,  setLoadingStats]  = useState(false)

  /* Charge les stats de réservations pour les offres expirées au 1er affichage */
  useEffect(() => {
    if (tab !== 'expirees' || reservStats !== null || !offresExpirees.length) return
    ;(async () => {
      setLoadingStats(true)
      const ids = offresExpirees.map(o => o.id)
      const { data } = await supabase
        .from('reservations')
        .select('offre_id, statut')
        .in('offre_id', ids)
      const acc = Object.fromEntries(ids.map(id => [id, { reserves: 0, utilises: 0, perimes: 0 }]))
      for (const r of (data || [])) {
        if (!acc[r.offre_id]) continue
        acc[r.offre_id].reserves++
        if (r.statut === 'utilisee')                              acc[r.offre_id].utilises++
        else if (r.statut === 'expiree' || r.statut === 'active') acc[r.offre_id].perimes++
      }
      setReservStats(acc)
      setLoadingStats(false)
    })()
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(offreId) {
    setDeleteError(null)
    setDeleting(offreId)
    const { count, error: cErr } = await supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('offre_id', offreId)
      .eq('statut', 'utilisee')
    if (cErr) { setDeleteError('Erreur lors de la vérification.'); setDeleting(null); return }
    if (count > 0) {
      setDeleteError('Impossible de supprimer : des bons ont déjà été validés sur cette offre.')
      setDeleting(null)
      setDeleteConfirm(null)
      return
    }
    const { error } = await supabase.from('offres').delete().eq('id', offreId)
    if (error) {
      setDeleteError('Erreur lors de la suppression.')
    } else {
      onDeleteOffre(offreId)
      setDeleteConfirm(null)
    }
    setDeleting(null)
  }

  function handleReactualiser(offre) {
    const p = new URLSearchParams({ commerce: commerce.id })
    p.set('prefill_type',  offre.type_remise)
    p.set('prefill_titre', offre.titre)
    if (offre.valeur != null)                                   p.set('prefill_valeur', String(offre.valeur))
    if (offre.nb_bons_total != null)                            p.set('prefill_nb_bons', String(offre.nb_bons_total))
    else                                                        p.set('prefill_illimite', 'true')
    if (offre.est_recurrente && offre.jours_recurrence?.length) {
      p.set('prefill_recurrente', 'true')
      p.set('prefill_jours', offre.jours_recurrence.join(','))
    }
    router.push(`/commercant/offre/nouvelle?${p.toString()}`)
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden">

      {/* ── Onglets ── */}
      <div className="flex border-b border-[#F0F0F0]">
        {[
          { id: 'actives',  label: `Offres actives · ${offresActives.length}` },
          { id: 'expirees', label: `Expirées · ${offresExpirees.length}` },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setDeleteError(null) }}
            className={`flex-1 py-3.5 text-[11px] font-black uppercase tracking-wide transition-colors ${
              tab === t.id
                ? 'text-[#FF6B00] border-b-2 border-[#FF6B00]'
                : 'text-[#3D3D3D]/40 hover:text-[#3D3D3D]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-5 py-5 flex flex-col gap-4">

        {deleteError && (
          <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-100 px-3 py-2.5 rounded-xl">
            ⚠ {deleteError}
          </p>
        )}

        {/* ── Onglet 1 : actives ── */}
        {tab === 'actives' && (
          <div>
            {offresActives.length === 0
              ? <p className="text-sm text-[#3D3D3D]/50 text-center py-10">Aucune offre active en ce moment.</p>
              : offresActives.map(o => (
                  <OffreActiveCard
                    key={o.id}
                    offre={o}
                    commerce={commerce}
                    confirmId={deleteConfirm}
                    deletingId={deleting}
                    onConfirm={() => { setDeleteConfirm(o.id); setDeleteError(null) }}
                    onCancel={() => setDeleteConfirm(null)}
                    onDelete={() => handleDelete(o.id)}
                  />
                ))
            }
          </div>
        )}

        {/* ── Onglet 2 : expirées ── */}
        {tab === 'expirees' && (
          <div>
            {offresExpirees.length === 0
              ? <p className="text-sm text-[#3D3D3D]/50 text-center py-10">Aucune offre expirée.</p>
              : loadingStats
              ? <div className="flex justify-center py-10">
                  <span className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
                </div>
              : offresExpirees.map(o => (
                  <OffreExpireCard
                    key={o.id}
                    offre={o}
                    commerce={commerce}
                    stats={reservStats?.[o.id]}
                    nbParticipants={nbParticipants[o.id] ?? null}
                    gagnantUser={gagnantUsers[o.id] ?? null}
                    onReactualiser={() => handleReactualiser(o)}
                  />
                ))
            }
          </div>
        )}

      </div>
    </div>
  )
}

/* ── Carte offre active ──────────────────────────────────────────────────── */

function OffreActiveCard({ offre, commerce, confirmId, deletingId, onConfirm, onCancel, onDelete }) {
  const isConfirming = confirmId === offre.id
  const isDeleting   = deletingId === offre.id
  const dateFin      = new Date(offre.date_fin)
  const nbUtilises   = offre.nb_bons_total != null && offre.nb_bons_restants != null
    ? offre.nb_bons_total - offre.nb_bons_restants
    : null

  return (
    <div className="relative border border-[#F0F0F0] rounded-2xl px-4 py-4 flex flex-col gap-3 overflow-hidden">
      {commerce?.photo_url && (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${commerce.photo_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.12,
            }}
          />
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(255,255,255,0.88)' }} />
        </>
      )}

      <div className="relative z-10 flex flex-col gap-3">

      {/* Badge + titre */}
      <div className="flex items-start gap-3">
        <span className="shrink-0 bg-[#FFF0E0] text-[#FF6B00] font-black text-xs px-2.5 py-1 rounded-xl whitespace-nowrap">
          {typeLabel(offre)}
        </span>
        <p className="text-sm font-bold text-[#0A0A0A] leading-tight">{getFullOffreTitle(offre)}</p>
      </div>

      {/* Détails */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <p className="text-[11px] text-[#3D3D3D]/60">
          ⏱ Jusqu&apos;au {dateFin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à {dateFin.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </p>
        {offre.nb_bons_total != null ? (
          <p className="text-[11px] text-[#3D3D3D]/60">
            🎫 {offre.nb_bons_restants} restants · {nbUtilises} utilisés / {offre.nb_bons_total} total
          </p>
        ) : (
          <p className="text-[11px] text-[#3D3D3D]/60">🎫 ♾️ Illimité</p>
        )}
      </div>

      {/* Supprimer */}
      {!isConfirming ? (
        <button
         
          onClick={onConfirm}
          className="text-[11px] font-semibold text-red-400 hover:text-red-600 transition-colors self-start"
        >
          Supprimer cette offre
        </button>
      ) : (
        <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-3 flex flex-col gap-2">
          <p className="text-xs font-bold text-red-600">Es-tu sûr ? Cette action est irréversible.</p>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 border border-[#E0E0E0] text-xs font-semibold py-2 rounded-xl"
            >
              Annuler
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="flex-1 bg-red-500 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center min-h-[36px]"
            >
              {isDeleting
                ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : 'Oui, supprimer'}
            </button>
          </div>
        </div>
      )}

      </div>{/* fin relative z-10 */}
    </div>
  )
}

/* ── Carte offre expirée ─────────────────────────────────────────────────── */

function OffreExpireCard({ offre, commerce, stats, nbParticipants, gagnantUser, onReactualiser }) {
  return (
    <div className="relative border border-[#F0F0F0] rounded-2xl px-4 py-4 flex flex-col gap-3 overflow-hidden">
      {commerce?.photo_url && (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${commerce.photo_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'grayscale(100%)',
              opacity: 0.10,
            }}
          />
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(255,255,255,0.80)' }} />
        </>
      )}
      <div className="relative z-10 flex flex-col gap-3">

      {/* Badge + titre */}
      <div className="flex items-start gap-3">
        <span className="shrink-0 bg-[#F5F5F5] text-[#3D3D3D]/70 font-black text-xs px-2.5 py-1 rounded-xl whitespace-nowrap">
          {typeLabel(offre)}
        </span>
        <p className="text-sm font-bold text-[#0A0A0A] leading-tight">{getFullOffreTitle(offre)}</p>
      </div>

      {/* Date de fin */}
      <p className="text-[11px] text-[#3D3D3D]/50">
        Terminée le {new Date(offre.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      {/* Bilan réservations */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#F5F5F5] rounded-xl px-2 py-2.5 text-center">
            <p className="text-base font-black text-[#0A0A0A]">{stats.reserves}</p>
            <p className="text-[10px] text-[#3D3D3D]/50 mt-0.5">Réservés</p>
          </div>
          <div className="bg-green-50 rounded-xl px-2 py-2.5 text-center">
            <p className="text-base font-black text-green-600">{stats.utilises}</p>
            <p className="text-[10px] text-green-600/60 mt-0.5">Validés</p>
          </div>
          <div className="bg-[#F5F5F5] rounded-xl px-2 py-2.5 text-center">
            <p className="text-base font-black text-[#3D3D3D]/50">{stats.perimes}</p>
            <p className="text-[10px] text-[#3D3D3D]/40 mt-0.5">Périmés</p>
          </div>
        </div>
      )}

      {/* Tirage au sort si concours */}
      {offre.type_remise === 'concours' && (
        <TirageAuSort
          offre={offre}
          nbParticipants={nbParticipants ?? stats?.utilises ?? null}
          gagnantUser={gagnantUser}
        />
      )}

      {/* Bouton Réactualiser */}
      <button
       
        onClick={onReactualiser}
        className="w-full flex items-center justify-center gap-2 border-2 border-[#FF6B00] text-[#FF6B00] hover:bg-[#FFF0E0] font-bold text-xs py-2.5 rounded-xl transition-colors min-h-[40px]"
      >
        🔄 Réactualiser cette offre
      </button>
      </div>{/* fin relative z-10 */}
    </div>
  )
}

/* ── Section QR code vitrine ─────────────────────────────────────────────── */

function QRVitrine({ commerce }) {
  return (
    <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-3 shadow-sm">
      <h2 className="text-sm font-black text-[#0A0A0A] uppercase tracking-wide">Mon QR code</h2>
      <button
        onClick={() => window.open('/commercant/affiche?id=' + commerce.id, '_blank')}
        className="w-full bg-[#FF6B00] hover:bg-[#CC5500] text-white font-semibold text-sm py-3 rounded-lg transition-colors min-h-[48px]"
      >
        🖨️ Afficher &amp; imprimer mon QR code
      </button>
    </div>
  )
}
