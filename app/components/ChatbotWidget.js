'use client'

import { useState, useEffect } from 'react'
import ChatbotPanel from './chatbot/ChatbotPanel'
import AuthBottomSheet from './AuthBottomSheet'

export default function ChatbotWidget() {
  const [isOpen,   setIsOpen]   = useState(false)
  const [hidden,   setHidden]   = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [deviceType, setDeviceType] = useState('desktop')

  /* ── Détection du type d'appareil ── */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDeviceType(window.matchMedia('(max-width: 768px)').matches ? 'mobile' : 'desktop')
  }, [])

  /* ── Masquage lors de l'ouverture d'un bottom sheet ── */
  useEffect(() => {
    const show = () => setHidden(true)
    const hide = () => setHidden(false)
    window.addEventListener('bonmoment:bottomsheet-open',  show)
    window.addEventListener('bonmoment:bottomsheet-close', hide)
    return () => {
      window.removeEventListener('bonmoment:bottomsheet-open',  show)
      window.removeEventListener('bonmoment:bottomsheet-close', hide)
    }
  }, [])

  /* ── Écoute de l'event open-auth depuis le chatbot ── */
  useEffect(() => {
    function onOpenAuth() { setIsOpen(false); setShowAuth(true) }
    window.addEventListener('bonmoment:open-auth', onOpenAuth)
    return () => window.removeEventListener('bonmoment:open-auth', onOpenAuth)
  }, [])

  return (
    <>
      {/* ── Bouton flottant ─────────────────────────────────────────────── */}
      {!isOpen && !hidden && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Ouvrir l'aide BONMOMENT"
          className="fixed bottom-20 right-4 z-[45] w-14 h-14 rounded-full bg-[#FF6B00] text-white shadow-xl shadow-orange-300/50 flex items-center justify-center hover:bg-[#CC5500] active:scale-95 transition-all duration-200"
        >
          <span className="text-2xl font-black leading-none">?</span>
        </button>
      )}

      {/* ── Panel ───────────────────────────────────────────────────────── */}
      {isOpen && (
        <>
          {/* Backdrop mobile */}
          <div
            className="fixed inset-0 bg-black/30 z-[46] md:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden
          />

          <div
            className="fixed z-[47] flex flex-col bg-[#F8F8F8]
              inset-0
              md:inset-auto md:bottom-4 md:right-4 md:w-[400px] md:h-[80vh] md:rounded-3xl md:shadow-2xl"
            style={{ animation: 'chatSlideIn 0.3s cubic-bezier(0.22,1,0.36,1) forwards' }}
          >
            <style>{`
              @keyframes chatSlideIn {
                from { transform: translateY(20px); opacity: 0; }
                to   { transform: translateY(0);    opacity: 1; }
              }
            `}</style>

            {/* En-tête */}
            <div className="flex items-center justify-between px-5 py-4 bg-[#FF6B00] text-white md:rounded-t-3xl shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-black select-none">
                  💬
                </div>
                <div>
                  <p className="font-black text-base leading-none">BON&apos;Aide</p>
                  <p className="text-[11px] text-white/70 mt-0.5">Réponses instantanées</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors text-lg"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            {/* Contenu */}
            <ChatbotPanel
              onClose={() => setIsOpen(false)}
              context={{ deviceType }}
            />

            {/* Pied */}
            <div className="shrink-0 px-4 py-2 border-t border-[#EBEBEB] bg-white md:rounded-b-3xl">
              <p className="text-center text-[10px] text-[#3D3D3D]/40 font-medium">
                BONMOMENT Assist — Toujours là pour toi
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Auth déclenché par le chatbot ───────────────────────────────── */}
      <AuthBottomSheet
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
      />
    </>
  )
}
