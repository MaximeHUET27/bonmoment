'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import FullScreenBon from '@/app/components/FullScreenBon'
import CommerceInfoCard from '@/app/components/CommerceInfoCard'
import { formatDebut } from '@/lib/offreStatus'
import { getFullOffreTitle } from '@/lib/offreTitle'

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function formatBadge(offre) {
  if (!offre) return 'Offre'
  if (offre.type_remise === 'pourcentage')    return `−${offre.valeur}%`
  if (offre.type_remise === 'montant_fixe')   return `−${offre.valeur}€`
  if (offre.type_remise === 'montant')        return `−${offre.valeur}€`
  if (offre.type_remise === 'cadeau')         return '🎁 Cadeau'
  if (offre.type_remise === 'produit_offert') return '📦 Offert'
  if (offre.type_remise === 'service_offert') return '✂️ Offert'
  if (offre.type_remise === 'concours')       return '🎰 Concours'
  if (offre.type_remise === 'atelier')        return '🎉 Évènement'
  if (offre.type_remise === 'fidelite')       return '⭐ Fidélité'
  return 'Offre'
}

function calcTimeLeft(dateFin) {
  const diff = new Date(dateFin) - new Date()
  if (diff <= 0) return null
  return {
    h:    Math.floor(diff / 3_600_000),
    m:    Math.floor((diff % 3_600_000) / 60_000),
    s:    Math.floor((diff % 60_000) / 1_000),
    diff,
  }
}

function useCountdown(dateFin) {
  const [tl, setTl] = useState(() => calcTimeLeft(dateFin))
  useEffect(() => {
    const t = setInterval(() => setTl(calcTimeLeft(dateFin)), 1_000)
    return () => clearInterval(t)
  }, [dateFin])
  return tl
}

/* ── Carte bon actif ──────────────────────────────────────────────────────── */

function BonActifCard({ resa, supabase, onCancelled }) {
  const timeLeft   = useCountdown(resa.offres?.date_fin)
  const programmee = resa.offres?.date_debut && new Date(resa.offres.date_debut) > new Date()
  const [showBon,       setShowBon]       = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling,    setCancelling]    = useState(false)
  const [walletUrl,     setWalletUrl]     = useState(null)
  const timerRed   = !programmee && timeLeft && timeLeft.diff < 1_800_000

  useEffect(() => {
    if (!/Android/i.test(navigator.userAgent)) return
    fetch(`/api/wallet/google?reservation_id=${resa.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.url) setWalletUrl(d.url) })
      .catch(() => {})
  }, [resa.id])

  async function handleCancel() {
    setCancelling(true)
    try {
      await supabase.from('reservations').update({ statut: 'annulee' }).eq('id', resa.id)
      const { data: o } = await supabase
        .from('offres').select('nb_bons_restants').eq('id', resa.offres?.id).single()
      if (o?.nb_bons_restants != null && o.nb_bons_restants !== 9999) {
        await supabase.from('offres')
          .update({ nb_bons_restants: o.nb_bons_restants + 1 }).eq('id', resa.offres?.id)
      }
      window.dispatchEvent(new CustomEvent('bonmoment:annulation', { detail: { offreId: resa.offres?.id } }))
      onCancelled(resa.id)
    } catch {
      setCancelling(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl px-5 py-5 shadow-sm flex flex-col gap-4 border border-[#F0F0F0]">

      {/* Badge + titre + commerce */}
      <div className="flex items-start gap-3">
        <span className="inline-block shrink-0 px-3 py-1 rounded-full bg-[#FF6B00] text-white text-sm font-black">
          {formatBadge(resa.offres)}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#0A0A0A] leading-snug">{getFullOffreTitle(resa.offres)}</p>
          <p className="text-xs text-[#3D3D3D]/60 mt-0.5">{resa.offres?.commerces?.nom}</p>
        </div>
      </div>

      {/* Timer / statut temporel */}
      {programmee ? (
        <div className="inline-flex items-center gap-1.5 bg-[#FFF0E0] text-[#FF6B00] text-sm font-bold px-3 py-1.5 rounded-full self-start">
          📅 Actif le {formatDebut(resa.offres.date_debut)}
        </div>
      ) : timeLeft ? (
        <p className={`text-xl font-black tabular-nums tracking-tight ${timerRed ? 'text-red-500' : 'text-[#0A0A0A]'}`}>
          ⏱ {String(timeLeft.h).padStart(2, '0')}h {String(timeLeft.m).padStart(2, '0')}m {String(timeLeft.s).padStart(2, '0')}s
        </p>
      ) : (
        <p className="text-sm font-bold text-red-500">⚠ Trop tard — bon expiré</p>
      )}

      {/* Infos commerce */}
      <CommerceInfoCard commerce={resa.offres?.commerces} commerceId={resa.offres?.commerces?.id} />

      {/* Bouton Voir mon bon */}
      <button
        onClick={() => setShowBon(true)}
        className="w-full bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-base py-3.5 rounded-2xl transition-colors shadow-lg shadow-orange-200/50 min-h-[48px]"
      >
        Voir mon bon 🎟️
      </button>

      {/* Bouton Google Wallet (Android uniquement) */}
      {walletUrl && (
        <a
          href={walletUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white font-bold text-sm py-3 rounded-2xl transition-colors min-h-[44px]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
          </svg>
          Ajouter à Google Wallet
        </a>
      )}

      {/* Annulation */}
      {!confirmCancel ? (
        <button
          onClick={() => setConfirmCancel(true)}
          className="text-[11px] text-center text-[#3D3D3D]/40 hover:text-red-400 transition-colors"
        >
          Annuler ma réservation
        </button>
      ) : (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 flex flex-col gap-3">
          <p className="text-sm font-bold text-red-600 text-center">Annuler ce bon ?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmCancel(false)}
              className="flex-1 border border-[#E0E0E0] text-sm font-semibold py-2.5 rounded-xl"
            >
              Non
            </button>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 bg-red-500 text-white text-sm font-bold py-2.5 rounded-xl flex items-center justify-center"
            >
              {cancelling
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : 'Oui, annuler'}
            </button>
          </div>
        </div>
      )}

      {/* Bon plein écran */}
      {showBon && (
        <FullScreenBon
          reservation={{ id: resa.id, code_validation: resa.code_validation, qr_code_data: resa.qr_code_data }}
          offre={resa.offres}
          commerce={resa.offres?.commerces}
          onClose={() => setShowBon(false)}
        />
      )}
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function MesBonsPage() {
  const { user, loading, supabase } = useAuth()
  const router = useRouter()
  const [reservations, setReservations] = useState([])
  const [fetching,     setFetching]     = useState(true)
  const [expandedId,   setExpandedId]   = useState(null)

  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    async function load() {
      const res = await fetch('/api/mes-bons')
      const data = res.ok ? await res.json() : []
      const sorted = (data || []).sort((a, b) => {
        const da = a.offres?.date_fin ? new Date(a.offres.date_fin) : new Date(0)
        const db = b.offres?.date_fin ? new Date(b.offres.date_fin) : new Date(0)
        return da - db
      })
      setReservations(sorted)
      setFetching(false)
    }
    load()
  }, [user])

  function handleCancelled(id) {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, statut: 'annulee' } : r))
  }

  const now         = new Date()
  // Tous les bons actifs (reservee + date_fin future) — inclut les programmés
  const enCours     = reservations.filter(r =>
    r.statut === 'reservee' &&
    new Date(r.offres?.date_fin) > now
  )
  // Sous-ensemble : offre déjà commencée (ou sans date_debut)
  const vraiEnCours = enCours.filter(r =>
    !r.offres?.date_debut || new Date(r.offres.date_debut) <= now
  )
  // Sous-ensemble : offre pas encore commencée
  const programmes  = enCours.filter(r =>
    r.offres?.date_debut && new Date(r.offres.date_debut) > now
  )
  const utilises    = reservations.filter(r => r.statut === 'utilisee')
  const expires    = reservations
    .filter(r =>
      r.statut === 'expiree' || r.statut === 'annulee' ||
      (r.statut === 'reservee' && new Date(r.offres?.date_fin) <= now)
    )
    .sort((a, b) => new Date(b.offres?.date_fin || 0) - new Date(a.offres?.date_fin || 0))

  if (loading || fetching) {
    return (
      <main className="min-h-screen bg-[#F5F5F5] flex flex-col">
        <header className="w-full bg-white border-b border-[#EBEBEB] px-5 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="w-[110px] h-8 bg-[#E0E0E0] rounded-xl animate-pulse" />
          <div className="h-4 w-20 bg-[#E0E0E0] rounded animate-pulse" />
        </header>
        <div className="flex-1 w-full max-w-xl mx-auto px-4 py-6 flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl h-44 animate-pulse" />
          ))}
        </div>
      </main>
    )
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-[#F5F5F5] flex flex-col">

      {/* Header */}
      <header className="w-full bg-white border-b border-[#EBEBEB] px-5 py-3 flex items-center justify-between sticky top-0 z-30">
        <Link href="/">
          <Image src="/LOGO.png" alt="BONMOMENT" width={600} height={300} unoptimized priority className="w-[110px] h-auto" />
        </Link>
        <Link href="/profil" className="bg-[#FF6B00] hover:bg-[#CC5500] text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors min-h-[44px] flex items-center whitespace-nowrap">
          Mon profil
        </Link>
      </header>

      {/* Titre */}
      <div className="w-full max-w-xl mx-auto px-4 pt-6 pb-2">
        <h1 className="text-xl font-black text-[#0A0A0A]">🎟️ Mes bons</h1>
      </div>

      <div className="flex-1 w-full max-w-xl mx-auto px-4 pb-24 flex flex-col gap-6">

        {/* Empty state */}
        {reservations.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🎟️</p>
            <p className="text-base font-bold text-[#0A0A0A]">Aucun bon pour l&apos;instant</p>
            <p className="text-sm text-[#3D3D3D]/60 mt-2">Réserve un bon plan dans ta ville !</p>
            <Link
              href="/"
              className="inline-block mt-5 bg-[#FF6B00] hover:bg-[#CC5500] text-white font-bold text-sm px-5 py-3 rounded-2xl transition-colors"
            >
              Voir les bons plans
            </Link>
          </div>
        )}

        {/* ── Bons en cours ── */}
        {vraiEnCours.length > 0 && (
          <section className="flex flex-col gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00]">
              Bons actifs
            </p>
            {vraiEnCours.map(resa => (
              <BonActifCard key={resa.id} resa={resa} supabase={supabase} onCancelled={handleCancelled} />
            ))}
          </section>
        )}

        {/* ── Bons programmés ── */}
        {programmes.length > 0 && (
          <section className="flex flex-col gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00]">
              Bons programmés
            </p>
            {programmes.map(resa => (
              <BonActifCard key={resa.id} resa={resa} supabase={supabase} onCancelled={handleCancelled} />
            ))}
          </section>
        )}

        {/* ── Bons utilisés ── */}
        {utilises.length > 0 && (
          <section className="flex flex-col gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D3D3D]/50">
              Bons utilisés
            </p>
            {utilises.map(resa => (
              <div
                key={resa.id}
                className="bg-white rounded-3xl px-5 py-4 shadow-sm border border-[#F0F0F0] cursor-pointer"
                onClick={() => setExpandedId(expandedId === resa.id ? null : resa.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                      ✅ Utilisé
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#0A0A0A]">
                      {getFullOffreTitle(resa.offres)}
                    </p>
                    <p className="text-xs text-[#3D3D3D]/60 mt-0.5">{resa.offres?.commerces?.nom}</p>
                  </div>
                  <span className="text-xs text-[#3D3D3D]/30">{expandedId === resa.id ? '▲' : '▼'}</span>
                </div>
                {expandedId === resa.id && (
                  <div className="mt-3 pt-3 border-t border-[#F5F5F5] flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-3 py-1 rounded-full bg-[#FF6B00] text-white text-sm font-black">
                        {formatBadge(resa.offres)}
                      </span>
                      <span className="text-sm font-bold text-[#0A0A0A]">{getFullOffreTitle(resa.offres)}</span>
                    </div>
                    <CommerceInfoCard commerce={resa.offres?.commerces} commerceId={resa.offres?.commerces?.id} />
                    {resa.created_at && (
                      <p className="text-[11px] text-[#3D3D3D]/50">
                        Réservé le {new Date(resa.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                    {resa.offres?.date_fin && (
                      <p className="text-[11px] text-[#3D3D3D]/50">
                        Expirait le {new Date(resa.offres.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                    {resa.code_validation && (
                      <p
                        className="font-mono font-bold text-base text-green-700 mt-1 tracking-widest"
                        style={{ fontFamily: 'Courier New, monospace' }}
                      >
                        {String(resa.code_validation).padStart(6, '0')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {/* ── Bons expirés / annulés ── */}
        {expires.length > 0 && (
          <section className="flex flex-col gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D3D3D]/30">
              Bons expirés
            </p>
            {expires.map(resa => (
              <div
                key={resa.id}
                className="bg-white rounded-3xl px-5 py-4 shadow-sm border border-[#F0F0F0] opacity-60 cursor-pointer"
                onClick={() => setExpandedId(expandedId === resa.id ? null : resa.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#E0E0E0] text-[#9CA3AF] text-xs font-bold">
                      {resa.statut === 'annulee' ? 'Annulé' : 'Expiré'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#3D3D3D]">
                      {getFullOffreTitle(resa.offres)}
                    </p>
                    <p className="text-xs text-[#3D3D3D]/60 mt-0.5">{resa.offres?.commerces?.nom}</p>
                  </div>
                  <span className="text-xs text-[#3D3D3D]/30">{expandedId === resa.id ? '▲' : '▼'}</span>
                </div>
                {expandedId === resa.id && (
                  <div className="mt-3 pt-3 border-t border-[#F5F5F5] flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-3 py-1 rounded-full bg-[#E0E0E0] text-[#9CA3AF] text-sm font-black">
                        {formatBadge(resa.offres)}
                      </span>
                      <span className="text-sm font-bold text-[#3D3D3D]">{getFullOffreTitle(resa.offres)}</span>
                    </div>
                    <CommerceInfoCard commerce={resa.offres?.commerces} commerceId={resa.offres?.commerces?.id} />
                    {resa.created_at && (
                      <p className="text-[11px] text-[#3D3D3D]/40">
                        Réservé le {new Date(resa.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                    {resa.offres?.date_fin && (
                      <p className="text-[11px] text-[#3D3D3D]/40">
                        {resa.statut === 'annulee' ? 'Annulé —' : 'Expiré le'}{' '}
                        {new Date(resa.offres.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                    {resa.code_validation && (
                      <p
                        className="font-mono font-bold text-base text-[#B0B0B0] line-through mt-1 tracking-widest"
                        style={{ fontFamily: 'Courier New, monospace' }}
                      >
                        {String(resa.code_validation).padStart(6, '0')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

      </div>
    </main>
  )
}
