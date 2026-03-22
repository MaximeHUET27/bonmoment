'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import FullScreenBon from '@/app/components/FullScreenBon'

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
  if (offre.type_remise === 'atelier')        return '🎨 Atelier'
  return 'Offre'
}

function useCountdown(dateFin) {
  const [tl, setTl] = useState(null)
  useEffect(() => {
    function calc() {
      const diff = new Date(dateFin) - new Date()
      if (diff <= 0) return null
      return {
        h:    Math.floor(diff / 3_600_000),
        m:    Math.floor((diff % 3_600_000) / 60_000),
        s:    Math.floor((diff % 60_000) / 1_000),
        diff,
      }
    }
    setTl(calc())
    const t = setInterval(() => setTl(calc()), 1_000)
    return () => clearInterval(t)
  }, [dateFin])
  return tl
}

/* ── Carte bon actif ──────────────────────────────────────────────────────── */

function BonActifCard({ resa, supabase, onCancelled }) {
  const timeLeft = useCountdown(resa.offres?.date_fin)
  const [showBon,       setShowBon]       = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling,    setCancelling]    = useState(false)
  const timerRed = timeLeft && timeLeft.diff < 1_800_000

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
      window.dispatchEvent(new Event('bonmoment:reservation'))
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
          <p className="text-sm font-bold text-[#0A0A0A] leading-snug">{resa.offres?.titre}</p>
          <p className="text-xs text-[#3D3D3D]/60 mt-0.5">{resa.offres?.commerces?.nom}</p>
        </div>
      </div>

      {/* Timer */}
      {timeLeft ? (
        <p className={`text-xl font-black tabular-nums tracking-tight ${timerRed ? 'text-red-500' : 'text-[#0A0A0A]'}`}>
          ⏱ {String(timeLeft.h).padStart(2, '0')}h {String(timeLeft.m).padStart(2, '0')}m {String(timeLeft.s).padStart(2, '0')}s
        </p>
      ) : (
        <p className="text-sm font-bold text-red-500">⚠ Trop tard — bon expiré</p>
      )}

      {/* Bouton Voir mon bon */}
      <button
        onClick={() => setShowBon(true)}
        className="w-full bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-base py-3.5 rounded-2xl transition-colors shadow-lg shadow-orange-200/50 min-h-[48px]"
      >
        Voir mon bon 🎟️
      </button>

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
    if (!user || !supabase) return
    async function load() {
      // Vérifie que l'on a bien le user connecté
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const userId = authUser?.id || user.id

      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          statut,
          code_validation,
          qr_code_data,
          created_at,
          offres (
            id,
            titre,
            type_remise,
            valeur,
            date_fin,
            commerces (
              nom,
              ville,
              adresse
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[Mes bons] Erreur requête Supabase:', error.message, error)
      }

      const sorted = (data || []).sort((a, b) => {
        const da = a.offres?.date_fin ? new Date(a.offres.date_fin) : new Date(0)
        const db = b.offres?.date_fin ? new Date(b.offres.date_fin) : new Date(0)
        return da - db
      })
      setReservations(sorted)
      setFetching(false)
    }
    load()
  }, [user, supabase])

  function handleCancelled(id) {
    setReservations(prev => prev.filter(r => r.id !== id))
  }

  const now      = new Date()
  const actifs   = reservations.filter(r => r.statut === 'reservee' && new Date(r.offres?.date_fin) > now)
  const utilises = reservations.filter(r => r.statut === 'utilisee')
  const expires  = reservations.filter(r =>
    r.statut === 'expiree' || r.statut === 'annulee' ||
    (r.statut === 'reservee' && new Date(r.offres?.date_fin) <= now)
  )

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
        <Link href="/profil" className="text-xs text-[#3D3D3D]/60 hover:text-[#FF6B00] transition-colors">
          ← Profil
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
            <p className="text-base font-bold text-[#0A0A0A]">Aucun bon pour l'instant</p>
            <p className="text-sm text-[#3D3D3D]/60 mt-2">Réserve un bon plan dans ta ville !</p>
            <Link
              href="/"
              className="inline-block mt-5 bg-[#FF6B00] hover:bg-[#CC5500] text-white font-bold text-sm px-5 py-3 rounded-2xl transition-colors"
            >
              Voir les bons plans
            </Link>
          </div>
        )}

        {/* ── Bons actifs ── */}
        {actifs.length > 0 && (
          <section className="flex flex-col gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00]">
              Bons actifs
            </p>
            {actifs.map(resa => (
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
                      <span className="text-[#FF6B00]">{formatBadge(resa.offres)}</span>
                      {' · '}{resa.offres?.titre}
                    </p>
                    <p className="text-xs text-[#3D3D3D]/60 mt-0.5">{resa.offres?.commerces?.nom}</p>
                    <p className="text-[11px] text-[#3D3D3D]/40 mt-1">
                      Utilisé le{' '}
                      {new Date(resa.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className="text-xs text-[#3D3D3D]/30">{expandedId === resa.id ? '▲' : '▼'}</span>
                </div>
                {expandedId === resa.id && (
                  <div className="mt-3 pt-3 border-t border-[#F5F5F5] flex flex-col gap-1 text-xs text-[#3D3D3D]/70">
                    {resa.offres?.commerces?.adresse && <p>📍 {resa.offres.commerces.adresse}{resa.offres.commerces.ville ? `, ${resa.offres.commerces.ville}` : ''}</p>}
                    {resa.offres?.date_fin && <p>🗓 Expirait le {new Date(resa.offres.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                    {resa.code_validation && <p className="font-mono font-bold text-[#0A0A0A] mt-1">Code : {resa.code_validation}</p>}
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
                      {formatBadge(resa.offres)} · {resa.offres?.titre}
                    </p>
                    <p className="text-xs text-[#3D3D3D]/60 mt-0.5">{resa.offres?.commerces?.nom}</p>
                    <p className="text-[11px] text-[#3D3D3D]/40 mt-1">
                      Expiré le{' '}
                      {resa.offres?.date_fin
                        ? new Date(resa.offres.date_fin).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          })
                        : '—'}
                    </p>
                  </div>
                  <span className="text-xs text-[#3D3D3D]/30">{expandedId === resa.id ? '▲' : '▼'}</span>
                </div>
                {expandedId === resa.id && (
                  <div className="mt-3 pt-3 border-t border-[#F5F5F5] flex flex-col gap-1 text-xs text-[#3D3D3D]/70">
                    {resa.offres?.commerces?.adresse && <p>📍 {resa.offres.commerces.adresse}{resa.offres.commerces.ville ? `, ${resa.offres.commerces.ville}` : ''}</p>}
                    {resa.code_validation && <p className="font-mono font-bold text-[#0A0A0A] mt-1">Code : {resa.code_validation}</p>}
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
