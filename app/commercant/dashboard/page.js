'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { QRCodeCanvas } from 'qrcode.react'
import { useAuth } from '@/app/context/AuthContext'
import { toSlug } from '@/lib/utils'
import TirageAuSort from '@/app/commercant/components/TirageAuSort'
import ShareButton from '@/app/components/ShareButton'
import AuthButton from '@/app/components/AuthButton'
import DeleteCommerceButton from '@/app/commercant/[id]/DeleteCommerceButton'

export default function DashboardPage() {
  const { user, loading, supabase } = useAuth()
  const router  = useRouter()
  const qrRef   = useRef(null)
  const [commerce,      setCommerce]      = useState(null)
  const [allCommerces,  setAllCommerces]  = useState([])
  const [fetching,      setFetching]      = useState(true)
  const [qrToast,       setQrToast]       = useState(null)
  const [offres,        setOffres]        = useState([])
  const [nbParticipants, setNbParticipants] = useState({}) // offre_id → count

  /* ── Auth guard ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  /* ── Fetch commerce(s) ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const commerceId = params?.get('commerce')
    supabase
      .from('commerces')
      .select('id, nom, categorie, ville, adresse, note_google')
      .eq('owner_id', user.id)
      .then(({ data }) => {
        const list = data || []
        setAllCommerces(list)
        if (commerceId) {
          setCommerce(list.find(c => c.id === commerceId) || list[0] || null)
        } else {
          setCommerce(list[0] || null)
        }
        setFetching(false)
      })
  }, [user, supabase])

  /* ── Fetch offres (actives + expirées) ──────────────────────────────────── */
  useEffect(() => {
    if (!commerce) return
    supabase
      .from('offres')
      .select('id, titre, type_remise, valeur, statut, date_fin, nb_bons_restants, nb_bons_total, gagnant_id')
      .eq('commerce_id', commerce.id)
      .in('statut', ['active', 'expiree'])
      .order('date_fin', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setOffres(data || [])

        // Compter les participants validés pour chaque concours expiré
        const concours = (data || []).filter(o => o.type_remise === 'concours' && o.statut === 'expiree')
        if (!concours.length) return

        Promise.all(
          concours.map(o =>
            supabase
              .from('reservations')
              .select('id', { count: 'exact', head: true })
              .eq('offre_id', o.id)
              .eq('statut', 'utilisee')
              .then(({ count }) => [o.id, count ?? 0])
          )
        ).then(entries => {
          setNbParticipants(Object.fromEntries(entries))
        })
      })
  }, [commerce, supabase])

  if (loading || fetching) {
    return (
      <main className="min-h-screen bg-[#F5F5F5] flex flex-col">
        {/* Header */}
        <header className="w-full bg-white border-b border-[#EBEBEB] px-6 py-4 flex items-center justify-between">
          <div className="w-[120px] h-8 bg-[#E0E0E0] rounded-xl animate-pulse" />
        </header>

        <div className="flex-1 w-full max-w-xl mx-auto px-5 py-6 flex flex-col gap-5 animate-pulse">

          {/* Bouton vérifier (placeholder) */}
          <div className="w-full h-[72px] bg-[#FFD9B8] rounded-3xl" />

          {/* Bloc bienvenue */}
          <div className="bg-white rounded-3xl px-6 py-8 flex flex-col gap-3 shadow-sm">
            <div className="h-3 w-24 bg-[#E0E0E0] rounded" />
            <div className="h-8 w-48 bg-[#E0E0E0] rounded-xl" />
            <div className="h-4 w-full bg-[#E0E0E0] rounded" />
            <div className="h-4 w-3/4 bg-[#E0E0E0] rounded" />
          </div>

          {/* 3 blocs KPI en ligne */}
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl px-4 py-5 h-20 shadow-sm flex flex-col gap-2">
                <div className="h-3 w-12 bg-[#E0E0E0] rounded" />
                <div className="h-5 w-8 bg-[#E0E0E0] rounded" />
              </div>
            ))}
          </div>

          {/* Bloc offres actives */}
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

          {/* Bloc offres expirées */}
          <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-4 shadow-sm">
            <div className="h-4 w-52 bg-[#E0E0E0] rounded" />
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-1 opacity-60">
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-4 w-2/3 bg-[#E0E0E0] rounded" />
                  <div className="h-3 w-1/3 bg-[#E0E0E0] rounded" />
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

  const prenom = user.user_metadata?.full_name?.split(' ')[0]
    ?? user.user_metadata?.name?.split(' ')[0]
    ?? 'commerçant'

  const offresActives  = offres.filter(o => o.statut === 'active')
  const offresExpirees = offres.filter(o => o.statut === 'expiree')

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

        {/* ── Message de bienvenue ──────────────────────────────────────── */}
        <div className="bg-white rounded-3xl px-6 py-8 flex flex-col gap-2 shadow-sm">
          <p className="text-xs font-semibold text-[#FF6B00] uppercase tracking-widest">Mon commerce</p>
          <h1 className="text-2xl font-black text-[#0A0A0A] leading-tight">
            Bienvenue,&nbsp;{prenom}&nbsp;!&nbsp;🎉
          </h1>
          {commerce ? (
            <p className="text-sm text-[#3D3D3D]/70 mt-1">
              Ton commerce <span className="font-bold text-[#0A0A0A]">{commerce.nom}</span> est bien enregistré.
              Tu peux dès maintenant créer ta première offre.
            </p>
          ) : (
            <p className="text-sm text-[#3D3D3D]/70 mt-1">
              Ton inscription est en cours de traitement. Recharge la page dans quelques instants.
            </p>
          )}
        </div>

        {/* ── Actions principales côte à côte ──────────────────────────── */}
        {commerce && (
          <div className="flex gap-4">
            <Link
              href={`/commercant/valider?commerce=${commerce.id}`}
              className="flex-1 bg-[#FF6B00] hover:bg-[#CC5500] text-white font-semibold text-lg py-4 rounded-xl transition-colors flex items-center justify-center text-center"
            >
              ✅ Vérifier un bon
            </Link>
            <Link
              href={`/commercant/offre/nouvelle?commerce=${commerce.id}`}
              className="flex-1 border-2 border-[#FF6B00] text-[#FF6B00] bg-white hover:bg-[#FFF0E0] font-semibold text-lg py-4 rounded-xl transition-colors flex items-center justify-center text-center"
            >
              ✨ Créer une offre
            </Link>
          </div>
        )}

        {/* ── Infos commerce ───────────────────────────────────────────── */}
        {commerce && (
          <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-4 shadow-sm">
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
              {commerce.note_google && (
                <p className="text-xs text-[#3D3D3D]/60">⭐ {commerce.note_google} / 5 sur Google</p>
              )}
            </div>

          </div>
        )}

        {/* ── Parrainage ────────────────────────────────────────────────── */}
        {commerce && (
          <ParrainageSection commerce={commerce} supabase={supabase} />
        )}

        {/* ── Offres actives ────────────────────────────────────────────── */}
        {offresActives.length > 0 && (
          <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-4 shadow-sm">
            <h2 className="text-sm font-black text-[#0A0A0A] uppercase tracking-wide">
              Offres en cours · {offresActives.length}
            </h2>
            {offresActives.map(o => (
              <OffreRow key={o.id} offre={o} commerce={commerce} />
            ))}
          </div>
        )}

        {/* ── Concours expirés à tirer au sort ─────────────────────────── */}
        {offresExpirees.some(o => o.type_remise === 'concours') && (
          <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-5 shadow-sm">
            <h2 className="text-sm font-black text-[#0A0A0A] uppercase tracking-wide">
              🎰 Concours terminés
            </h2>
            {offresExpirees
              .filter(o => o.type_remise === 'concours')
              .map(o => (
                <div key={o.id} className="border border-[#F0F0F0] rounded-2xl px-4 py-4">
                  <p className="text-sm font-bold text-[#0A0A0A] mb-0.5">{o.titre}</p>
                  <p className="text-[11px] text-[#3D3D3D]/50">
                    Terminé le {new Date(o.date_fin).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long',
                    })}
                  </p>
                  <TirageAuSort
                    offre={o}
                    nbParticipants={nbParticipants[o.id] ?? null}
                  />
                </div>
              ))
            }
          </div>
        )}

        {/* ── Offres expirées récentes (non-concours) ───────────────────── */}
        {offresExpirees.filter(o => o.type_remise !== 'concours').length > 0 && (
          <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-3 shadow-sm">
            <h2 className="text-sm font-black text-[#0A0A0A] uppercase tracking-wide">
              Offres récentes terminées
            </h2>
            {offresExpirees
              .filter(o => o.type_remise !== 'concours')
              .slice(0, 5)
              .map(o => (
                <OffreRow key={o.id} offre={o} expired />
              ))}
          </div>
        )}

        {/* ── QR code vitrine ──────────────────────────────────────────── */}
        {commerce?.ville && (
          <QRVitrine commerce={commerce} toast={qrToast} setToast={setQrToast} />
        )}

        {/* ── Supprimer ce commerce ─────────────────────────────────────────── */}
        {commerce && user && (
          <DeleteCommerceButton commerceId={commerce.id} ownerUserId={user.id} />
        )}

      </div>

    </main>
  )
}

/* ── Section parrainage ──────────────────────────────────────────────────── */

const PARRAIN_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function genCode8() {
  let c = ''
  for (let i = 0; i < 8; i++) c += PARRAIN_CHARS[Math.floor(Math.random() * PARRAIN_CHARS.length)]
  return c
}

function ParrainageSection({ commerce, supabase }) {
  const [codes,      setCodes]      = useState([])
  const [loaded,     setLoaded]     = useState(false)
  const [generating, setGenerating] = useState(false)
  const [newCode,    setNewCode]    = useState(null)
  const [limitMsg,   setLimitMsg]   = useState(null)

  useEffect(() => { loadCodes() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  async function loadCodes() {
    const { data } = await supabase
      .from('codes_parrainage')
      .select('id, code, created_at, expire_at, statut, utilise_par')
      .eq('commerce_id', commerce.id)
      .order('created_at', { ascending: false })
    setCodes(data || [])
    setLoaded(true)
  }

  /* Compteur du mois en cours */
  const debutMois = new Date(); debutMois.setDate(1); debutMois.setHours(0, 0, 0, 0)
  const countMois = codes.filter(c => new Date(c.created_at) >= debutMois).length

  async function genererCode() {
    setLimitMsg(null)
    setGenerating(true)

    /* Vérification fraîche côté serveur */
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

    /* Génération d'un code unique */
    let code = genCode8()
    for (let i = 0; i < 5; i++) {
      const { data: ex } = await supabase.from('codes_parrainage').select('id').eq('code', code).maybeSingle()
      if (!ex) break
      code = genCode8()
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

      {/* Code fraîchement généré */}
      {newCode && (
        <div className="bg-[#FFF0E0] border border-[#FF6B00]/20 rounded-2xl px-4 py-4 flex flex-col gap-2">
          <p className="text-[10px] font-semibold text-[#FF6B00] uppercase tracking-widest">Code généré ✓</p>
          <p
            className="text-3xl font-black text-[#FF6B00] tracking-[0.25em] leading-none"
            style={{ fontFamily: 'Courier New, monospace' }}
          >
            {newCode.code}
          </p>
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

      {/* Historique */}
      {sortedCodes.length > 0 && (
        <div className="flex flex-col gap-0.5 mt-1">
          <p className="text-[10px] font-semibold text-[#3D3D3D]/40 uppercase tracking-widest mb-1">Historique</p>
          {sortedCodes.map(c => (
            <div key={c.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-[#F5F5F5] last:border-0">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span
                  className="font-bold text-sm text-[#0A0A0A] tracking-widest"
                  style={{ fontFamily: 'Courier New, monospace' }}
                >
                  {c.code}
                </span>
                <span className="text-[10px] text-[#3D3D3D]/40">
                  Créé le {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  {' · '}
                  Expire le {new Date(c.expire_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
                </span>
              </div>
              <span className="text-xs font-bold shrink-0">
                {c.statut === 'actif'    ? '🟢 Actif'
               : c.statut === 'utilise'  ? '🟠 Utilisé'
               :                          '🔴 Expiré'}
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
    atelier:        '🎨',
  }

  return (
    <div className={`flex items-center justify-between gap-3 py-1 ${expired ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#0A0A0A] truncate">{offre.titre}</p>
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
            shareText={`🎉 Nouvelle offre chez ${commerce.nom} ! ${offre.titre} — Réserve ton bon gratuit 👉 bonmoment.app/offre/${offre.id}`}
            shareTitle={`Nouvelle offre chez ${commerce.nom} — BONMOMENT`}
          />
        )}
      </div>
    </div>
  )
}

/* ── Section QR code vitrine ─────────────────────────────────────────────── */

function QRVitrine({ commerce, toast, setToast }) {
  const [showOverlay, setShowOverlay] = useState(false)
  const qrUrl = `https://bonmoment.app/commercant/${commerce.id}`

  function afficherToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function telechargerQR() {
    const canvas = document.getElementById('qr-vitrine-canvas')
    if (!canvas) return

    const W = 1240
    const H = 1754
    const out = document.createElement('canvas')
    out.width  = W
    out.height = H
    const ctx = out.getContext('2d')

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, W, H)

    ctx.fillStyle = '#FF6B00'
    ctx.fillRect(0, 0, W, 220)

    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('BONMOMENT', W / 2, 110)
    ctx.font = '28px Arial'
    ctx.fillText('Soyez là au bon moment', W / 2, 165)

    const qrSize = 600
    const qrX    = (W - qrSize) / 2
    const qrY    = 300
    ctx.drawImage(canvas, qrX, qrY, qrSize, qrSize)

    ctx.fillStyle = '#0A0A0A'
    ctx.font = 'bold 36px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Scannez pour découvrir', W / 2, qrY + qrSize + 70)
    ctx.fillText(commerce.nom, W / 2, qrY + qrSize + 120)
    ctx.font = '28px Arial'
    ctx.fillStyle = '#9CA3AF'
    ctx.fillText('sur BONMOMENT', W / 2, qrY + qrSize + 170)

    ctx.fillStyle = '#FF6B00'
    ctx.font = '24px Arial'
    ctx.fillText(qrUrl, W / 2, H - 80)

    const link    = document.createElement('a')
    link.download = `qr-vitrine-${commerce.nom.toLowerCase().replace(/\s+/g, '-')}.png`
    link.href     = out.toDataURL('image/png')
    link.click()
    afficherToast('📥 QR code téléchargé !')
  }

  return (
    <>
      <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-3 shadow-sm">
        <h2 className="text-sm font-black text-[#0A0A0A] uppercase tracking-wide">Mon QR code vitrine</h2>
        <p className="text-xs text-[#3D3D3D]/60">
          Tes clients scannent et découvrent directement{' '}
          <span className="font-bold text-[#0A0A0A]">{commerce.nom}</span> sur BONMOMENT.
        </p>

        {/* Bouton 1 : afficher overlay */}
        <button
          onClick={() => setShowOverlay(true)}
          className="w-full bg-[#FF6B00] hover:bg-[#CC5500] text-white font-semibold text-sm py-3 rounded-lg transition-colors min-h-[48px]"
        >
          📲 Afficher mon QR code vitrine
        </button>

        {/* Bouton 2 : télécharger */}
        <button
          onClick={telechargerQR}
          className="w-full bg-[#0A0A0A] hover:bg-[#1A1A1A] text-white font-semibold text-sm py-3 rounded-lg transition-colors min-h-[48px]"
        >
          📥 Télécharger mon QR code
        </button>

        <p className="text-[10px] text-[#3D3D3D]/40 text-center">Format A5 • Prêt pour l'impression</p>
      </div>

      {/* QR canvas caché (pour génération téléchargement) */}
      <div className="hidden">
        <QRCodeCanvas
          id="qr-vitrine-canvas"
          value={qrUrl}
          size={600}
          level="H"
          includeMargin
          fgColor="#0A0A0A"
          bgColor="#FFFFFF"
        />
      </div>

      {/* Overlay plein écran */}
      {showOverlay && (
        <div className="fixed inset-0 z-[90] bg-white flex flex-col items-center justify-center px-6">
          <button
            onClick={() => setShowOverlay(false)}
            className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-[#F5F5F5] text-[#3D3D3D] font-bold text-lg hover:bg-[#E0E0E0] transition-colors"
          >
            ✕
          </button>

          <div className="flex flex-col items-center gap-6 w-full max-w-xs">
            <div className="bg-white border-2 border-[#F0F0F0] rounded-2xl p-5">
              <QRCodeCanvas
                value={qrUrl}
                size={260}
                level="H"
                includeMargin
                fgColor="#0A0A0A"
                bgColor="#FFFFFF"
              />
            </div>

            <p className="text-base font-bold text-[#0A0A0A] text-center leading-snug">
              Scanne pour découvrir{' '}
              <span className="text-[#FF6B00]">{commerce.nom}</span>{' '}
              sur BONMOMENT
            </p>

            <button
              onClick={() => setShowOverlay(false)}
              className="text-sm text-[#3D3D3D]/50 hover:text-[#3D3D3D] transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-[#0A0A0A] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl max-w-[90vw] text-center">
          {toast}
        </div>
      )}
    </>
  )
}
