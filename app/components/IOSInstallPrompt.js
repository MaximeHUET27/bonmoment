'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/context/AuthContext'

/* ── Détection ────────────────────────────────────────────────────────────── */
export function isIOS() {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

export function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

export function isIOSNonStandalone() {
  return isIOS() && !isStandalone()
}

/* ── LocalStorage ─────────────────────────────────────────────────────────── */
const LS_KEY = 'bonmoment_ios_prompt'

function shouldAutoShow() {
  if (!isIOSNonStandalone()) return false
  try {
    const stored = localStorage.getItem(LS_KEY)
    if (!stored) return true
    const { until } = JSON.parse(stored)
    return Date.now() > until
  } catch {
    return true
  }
}

function storeDelay(ms) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ until: Date.now() + ms }))
  } catch {}
}

const DELAY_7D  = 7 * 24 * 60 * 60 * 1000
const DELAY_24H = 24 * 60 * 60 * 1000

/* ── Icône partage iOS (SVG) ──────────────────────────────────────────────── */
function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-middle" aria-hidden>
      <path d="M8.59 5.41 12 2l3.41 3.41" />
      <line x1="12" y1="2" x2="12" y2="15" />
      <path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8" />
    </svg>
  )
}

/* ── Composant principal ──────────────────────────────────────────────────── */
/**
 * IOSInstallPrompt
 *
 * Modes :
 *   - Auto (layout) : aucun prop → se déclenche 30s après chargement si iOS + pas standalone + connecté + pas montré récemment
 *   - Contrôlé      : forceOpen={true/false} + onForceClose={fn} → utilisé depuis FavoriButton / profil
 */
export default function IOSInstallPrompt({ forceOpen, onForceClose }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  /* Mode auto (layout) */
  useEffect(() => {
    if (forceOpen !== undefined) return
    if (!user) return
    if (!shouldAutoShow()) return
    const t = setTimeout(() => setOpen(true), 30_000)
    return () => clearTimeout(t)
  }, [user, forceOpen])

  /* Mode contrôlé */
  useEffect(() => {
    if (forceOpen === undefined) return
    setOpen(!!forceOpen)
  }, [forceOpen])

  function dismiss(delay) {
    storeDelay(delay)
    setOpen(false)
    onForceClose?.()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9998] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => dismiss(DELAY_24H)}
      />

      {/* Bottom sheet */}
      <div className="relative w-full max-w-sm bg-white rounded-t-[20px] shadow-2xl px-6 pt-6 pb-10 flex flex-col gap-5">
        {/* Poignée */}
        <div className="w-10 h-1 bg-[#E0E0E0] rounded-full mx-auto mb-1" />

        {/* En-tête */}
        <div className="text-center">
          <p className="text-3xl mb-2">📱</p>
          <h2 className="text-lg font-black text-[#0A0A0A] leading-tight">
            Active les notifications !
          </h2>
          <p className="text-sm text-[#3D3D3D]/70 mt-2 leading-relaxed">
            Pour recevoir les bons plans en temps réel, ajoute BONMOMENT à ton écran d&apos;accueil :
          </p>
        </div>

        {/* Étapes */}
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3 bg-[#F9F9F9] rounded-2xl px-4 py-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-[#FF6B00] text-white text-xs font-black flex items-center justify-center mt-0.5">1</span>
            <p className="text-sm text-[#0A0A0A] leading-snug">
              Appuie sur <span className="inline-flex items-center gap-1 font-bold text-[#FF6B00]"><ShareIcon /> Partager</span> en bas de Safari
            </p>
          </div>

          <div className="flex items-start gap-3 bg-[#F9F9F9] rounded-2xl px-4 py-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-[#FF6B00] text-white text-xs font-black flex items-center justify-center mt-0.5">2</span>
            <p className="text-sm text-[#0A0A0A] leading-snug">
              Choisis <span className="font-bold">&ldquo;Sur l&apos;écran d&apos;accueil&rdquo;</span>
              <span className="ml-1 text-base">＋</span>
            </p>
          </div>

          <div className="flex items-start gap-3 bg-[#F9F9F9] rounded-2xl px-4 py-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-[#FF6B00] text-white text-xs font-black flex items-center justify-center mt-0.5">3</span>
            <p className="text-sm text-[#0A0A0A] leading-snug">
              Appuie <span className="font-bold">&ldquo;Ajouter&rdquo;</span> en haut à droite ✅
            </p>
          </div>
        </div>

        {/* Boutons */}
        <button
          onClick={() => dismiss(DELAY_7D)}
          className="w-full bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-sm py-4 rounded-2xl transition-colors min-h-[48px]"
        >
          J&apos;ai compris
        </button>
        <button
          onClick={() => dismiss(DELAY_24H)}
          className="w-full text-sm text-[#9CA3AF] hover:text-[#3D3D3D] transition-colors py-1"
        >
          Plus tard
        </button>
      </div>
    </div>
  )
}
