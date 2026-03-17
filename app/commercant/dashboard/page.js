'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { QRCodeCanvas } from 'qrcode.react'
import { useAuth } from '@/app/context/AuthContext'
import { toSlug } from '@/lib/utils'

export default function DashboardPage() {
  const { user, loading, supabase, signOut } = useAuth()
  const router  = useRouter()
  const qrRef   = useRef(null)
  const [commerce,      setCommerce]      = useState(null)
  const [fetching,      setFetching]      = useState(true)
  const [qrToast,       setQrToast]       = useState(null)

  // Auth guard
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/')
    }
  }, [user, loading, router])

  // Fetch commerce du commerçant connecté
  useEffect(() => {
    if (!user) return
    supabase
      .from('commerces')
      .select('id, nom, categorie, ville, adresse, code_parrainage, code_parrainage_expire_at, note_google')
      .eq('owner_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setCommerce(data)
        setFetching(false)
      })
  }, [user, supabase])

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <span className="w-8 h-8 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const prenom = user.user_metadata?.full_name?.split(' ')[0]
    ?? user.user_metadata?.name?.split(' ')[0]
    ?? 'commerçant'

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
        <button
          onClick={() => signOut().then(() => router.push('/'))}
          className="text-xs text-[#3D3D3D]/60 hover:text-[#FF6B00] transition-colors"
        >
          Déconnexion
        </button>
      </header>

      {/* ── Corps ────────────────────────────────────────────────────────── */}
      <div className="flex-1 w-full max-w-xl mx-auto px-5 py-10 flex flex-col gap-6">

        {/* Message de bienvenue */}
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

        {/* Infos commerce */}
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

            {/* Code parrainage */}
            {commerce.code_parrainage && (
              <div className="bg-[#F5F5F5] rounded-2xl px-4 py-4 flex flex-col gap-1 mt-2">
                <p className="text-[10px] font-semibold text-[#3D3D3D]/60 uppercase tracking-widest">
                  Ton code parrainage
                </p>
                <p className="text-xl font-black text-[#FF6B00] tracking-wider">{commerce.code_parrainage}</p>
                {commerce.code_parrainage_expire_at && (
                  <p className="text-[10px] text-[#3D3D3D]/50">
                    Valable jusqu&apos;au{' '}
                    {new Date(commerce.code_parrainage_expire_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
                <p className="text-[10px] text-[#3D3D3D]/40 mt-1">
                  Partage ce code à d&apos;autres commerçants pour bénéficier d&apos;avantages.
                </p>
              </div>
            )}
          </div>
        )}

        {/* CTA — Créer ma première offre */}
        {commerce && (
          <Link
            href="/commercant/offre/nouvelle"
            className="w-full bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-base py-4 rounded-2xl transition-colors duration-200 shadow-lg shadow-orange-200 min-h-[56px] flex items-center justify-center text-center"
          >
            ✨ Créer ma première offre
          </Link>
        )}

        {/* ── QR code vitrine ── */}
        {commerce?.ville && (
          <QRVitrine commerce={commerce} qrRef={qrRef} toast={qrToast} setToast={setQrToast} />
        )}

      </div>
    </main>
  )
}

/* ── Section QR code vitrine ─────────────────────────────────────────────── */

function QRVitrine({ commerce, toast, setToast }) {
  const canvasRef = useRef(null)
  const villeSlug = toSlug(commerce.ville)
  const qrUrl     = `https://bonmoment.app/ville/${villeSlug}`

  function afficherToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function telechargerQR() {
    // On cherche le canvas rendu par QRCodeCanvas
    const canvas = document.getElementById('qr-vitrine-canvas')
    if (!canvas) return

    // Créer un canvas A5 (595×842 px ≈ A5 à 72dpi, ou 1240×1754 à 150dpi)
    const W = 1240
    const H = 1754
    const out = document.createElement('canvas')
    out.width  = W
    out.height = H
    const ctx = out.getContext('2d')

    // Fond blanc
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, W, H)

    // Header orange
    ctx.fillStyle = '#FF6B00'
    ctx.fillRect(0, 0, W, 220)

    // Texte BONMOMENT dans le header
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('BONMOMENT', W / 2, 110)
    ctx.font = '28px Arial'
    ctx.fillText('Soyez là au bon moment', W / 2, 165)

    // QR code centré
    const qrSize = 600
    const qrX    = (W - qrSize) / 2
    const qrY    = 300
    ctx.drawImage(canvas, qrX, qrY, qrSize, qrSize)

    // Texte sous le QR
    ctx.fillStyle = '#0A0A0A'
    ctx.font = 'bold 36px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Scannez pour découvrir', W / 2, qrY + qrSize + 70)
    ctx.fillText(`les bons plans de ${commerce.ville}`, W / 2, qrY + qrSize + 120)
    ctx.font = '28px Arial'
    ctx.fillStyle = '#9CA3AF'
    ctx.fillText('sur BONMOMENT', W / 2, qrY + qrSize + 170)

    // Lien en bas
    ctx.fillStyle = '#FF6B00'
    ctx.font = '24px Arial'
    ctx.fillText(qrUrl, W / 2, H - 80)

    // Téléchargement
    const link    = document.createElement('a')
    link.download = `qr-vitrine-${villeSlug}.png`
    link.href     = out.toDataURL('image/png')
    link.click()
    afficherToast('📥 QR code téléchargé !')
  }

  return (
    <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-4 shadow-sm">
      <h2 className="text-sm font-black text-[#0A0A0A] uppercase tracking-wide">Mon QR code vitrine</h2>
      <p className="text-xs text-[#3D3D3D]/60">
        Affichez ce QR code en vitrine. Vos clients scannent et découvrent les bons plans de{' '}
        <span className="font-bold text-[#0A0A0A]">{commerce.ville}</span>.
      </p>

      {/* Aperçu QR */}
      <div className="flex flex-col items-center gap-3">
        <div className="bg-white border-2 border-[#F0F0F0] rounded-2xl p-4 flex flex-col items-center gap-2">
          <QRCodeCanvas
            id="qr-vitrine-canvas"
            value={qrUrl}
            size={200}
            level="H"
            includeMargin
            fgColor="#0A0A0A"
            bgColor="#FFFFFF"
          />
          <p className="text-[10px] text-[#3D3D3D]/50 font-medium text-center max-w-[200px]">
            Bons plans de {commerce.ville} sur BONMOMENT
          </p>
        </div>

        <p className="text-[10px] text-[#9CA3AF] text-center break-all">{qrUrl}</p>

        <button
          onClick={telechargerQR}
          className="w-full bg-[#0A0A0A] hover:bg-[#1A1A1A] text-white font-bold text-sm py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2 min-h-[48px]"
        >
          📥 Télécharger mon QR code
        </button>

        <p className="text-[10px] text-[#3D3D3D]/40 text-center">
          Format A5 • Prêt pour l'impression
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-[#0A0A0A] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl max-w-[90vw] text-center">
          {toast}
        </div>
      )}
    </div>
  )
}
