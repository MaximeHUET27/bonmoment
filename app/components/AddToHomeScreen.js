'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/app/components/Toast'

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isMobile() {
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
}

/* ── Modale instructions iOS ─────────────────────────────── */
function IOSModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-6 sm:pb-0">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-2 flex items-center justify-between border-b border-[#F0F0F0]">
          <p className="font-black text-[#0A0A0A]">Ajouter à l&apos;écran d&apos;accueil</p>
          <button onClick={onClose} aria-label="Fermer" className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center text-base hover:bg-[#E0E0E0]">×</button>
        </div>
        <div className="flex flex-col gap-4 px-5 py-5">
          {/* Étape 1 */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#FFF0E0] flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-[#0A0A0A]">Étape 1</p>
              <p className="text-xs text-[#3D3D3D]/60 mt-0.5">Appuie sur l&apos;icône partage <strong>↗</strong> en bas de Safari</p>
            </div>
          </div>
          {/* Étape 2 */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#FFF0E0] flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
                <line x1="17.5" y1="14" x2="17.5" y2="21"/>
                <line x1="14" y1="17.5" x2="21" y2="17.5"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-[#0A0A0A]">Étape 2</p>
              <p className="text-xs text-[#3D3D3D]/60 mt-0.5">Fais défiler et appuie sur <strong>« Sur l&apos;écran d&apos;accueil »</strong></p>
            </div>
          </div>
          {/* Étape 3 */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#FFF0E0] flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-[#0A0A0A]">Étape 3</p>
              <p className="text-xs text-[#3D3D3D]/60 mt-0.5">Appuie sur <strong>« Ajouter »</strong> en haut à droite</p>
            </div>
          </div>
        </div>
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-[#FF6B00] text-white font-bold text-sm"
          >
            J&apos;ai compris
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Composant principal ─────────────────────────────────── */
export default function AddToHomeScreen() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show,           setShow]           = useState(false)
  const [showIOSModal,   setShowIOSModal]   = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isMobile()) return
    if (isStandalone()) return

    if (isIOS()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShow(true)
      return
    }

    // Android / Chrome
    function handlePrompt(e) {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handlePrompt)
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt)
  }, [])

  if (!show) return null

  async function handleClick() {
    if (isIOS()) {
      setShowIOSModal(true)
      return
    }
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      showToast('✅ BONMOMENT a été ajouté à ton écran d\'accueil !')
      setShow(false)
    }
    setDeferredPrompt(null)
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="w-full py-3.5 rounded-2xl bg-[#FF6B00] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform"
      >
        📱 Ajouter BONMOMENT à mon écran d&apos;accueil
      </button>
      {showIOSModal && <IOSModal onClose={() => setShowIOSModal(false)} />}
    </>
  )
}
