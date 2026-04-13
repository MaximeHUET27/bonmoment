'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { useFavoris } from '@/app/context/FavorisContext'
import AuthBottomSheet from './AuthBottomSheet'
import { useToast } from './Toast'

const PUSH_PROMPT_KEY = 'bonmoment_push_prompt_shown'

/**
 * Bouton cœur pour mettre un commerce en favori.
 *
 * @param {string} commerceId   - UUID du commerce
 * @param {string} commerceNom  - Nom du commerce (pour le toast)
 * @param {string} className    - Classes CSS supplémentaires
 */
export default function FavoriButton({ commerceId, commerceNom, className = '', variant = 'icon' }) {
  const { user, supabase }         = useAuth()
  const { isFavori, toggleFavori } = useFavoris()
  const { showToast }              = useToast()
  const [pulse,          setPulse]          = useState(false)
  const [showAuth,       setShowAuth]       = useState(false)
  const [loading,        setLoading]        = useState(false)
  const [showPushPrompt, setShowPushPrompt] = useState(false)
  const [pushLoading,    setPushLoading]    = useState(false)

  const favori = isFavori(commerceId)

  useEffect(() => {
    if (!user || !commerceId) return
    const pendingId = sessionStorage.getItem('bonmoment_pending_favori')
    if (pendingId === commerceId) {
      sessionStorage.removeItem('bonmoment_pending_favori')
      toggleFavori(commerceId).then(isNow => {
        if (isNow) handleAfterFavori()
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function handleAfterFavori() {
    const { data } = await supabase
      .from('users')
      .select('notifications_push')
      .eq('id', user.id)
      .single()

    if (data?.notifications_push) {
      showToast(`❤️ Tu seras alerté dès que ${commerceNom} publie une offre !`, 'success')
    } else if (!sessionStorage.getItem(PUSH_PROMPT_KEY)) {
      setShowPushPrompt(true)
    } else {
      showToast(`❤️ ${commerceNom} ajouté aux favoris !`, 'success')
    }
  }

  async function handleClick(e) {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      sessionStorage.setItem('bonmoment_pending_favori', commerceId)
      setShowAuth(true)
      return
    }

    setPulse(true)
    setTimeout(() => setPulse(false), 400)
    setLoading(true)
    const isNowFavori = await toggleFavori(commerceId)
    setLoading(false)

    if (isNowFavori) await handleAfterFavori()
  }

  async function handleActiverPush() {
    setPushLoading(true)
    sessionStorage.setItem(PUSH_PROMPT_KEY, '1')
    setShowPushPrompt(false)

    try {
      if (!('Notification' in window)) throw new Error('unsupported')
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') throw new Error('denied')

      const reg    = await navigator.serviceWorker.register('/sw.js')
      const sub    = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
      const subJson = sub.toJSON()
      await fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ endpoint: subJson.endpoint, keys: subJson.keys }),
      })
      showToast('✅ Notifications activées !', 'success')
    } catch {
      showToast(`❤️ ${commerceNom} ajouté aux favoris !`, 'success')
    }

    setPushLoading(false)
  }

  function handlePlusTard() {
    sessionStorage.setItem(PUSH_PROMPT_KEY, '1')
    setShowPushPrompt(false)
    showToast(`❤️ ${commerceNom} ajouté aux favoris !`, 'success')
  }

  return (
    <>
      {variant === 'full' ? (
        <button
          onClick={handleClick}
          disabled={loading}
          aria-label={favori ? `Retirer ${commerceNom} des favoris` : `Ajouter ${commerceNom} aux favoris`}
          className={`w-full flex items-center justify-center gap-2 font-bold text-sm py-3 rounded-2xl min-h-[44px] mt-1 transition-colors ${
            favori
              ? 'bg-[#22C55E] text-white'
              : 'border-2 border-[#FF6B00] text-[#FF6B00] hover:bg-[#FFF0E0]'
          } ${className}`}
        >
          {loading
            ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            : favori ? '✅ Abonné' : '❤️ S\'abonner à ce commerce'
          }
        </button>
      ) : (
        <button
          onClick={handleClick}
          disabled={loading}
          aria-label={favori ? `Retirer ${commerceNom} des favoris` : `Ajouter ${commerceNom} aux favoris`}
          className={`flex items-center justify-center min-h-[44px] min-w-[44px] ${
            pulse ? 'scale-[1.2]' : 'scale-100'
          } ${className}`}
          style={{ transition: 'transform 0.3s ease-in-out' }}
        >
          {favori ? (
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#FF6B00]" aria-hidden>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-[#FF6B00] fill-none" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          )}
        </button>
      )}

      <AuthBottomSheet
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        redirectAfter={typeof window !== 'undefined' ? window.location.pathname : '/'}
      />

      {/* ── Prompt push (une seule fois par session) ── */}
      {showPushPrompt && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handlePlusTard} />
          <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl px-6 pt-6 pb-10 sm:pb-6 shadow-2xl">
            <div className="w-10 h-1 bg-[#E0E0E0] rounded-full mx-auto mb-5 sm:hidden" />
            <p className="text-3xl text-center mb-3">🔔</p>
            <h2 className="text-base font-black text-[#0A0A0A] text-center mb-2">
              Active les notifications push
            </h2>
            <p className="text-sm text-[#3D3D3D]/70 text-center mb-6 leading-relaxed">
              Pour être alerté dès que{' '}
              <span className="font-bold text-[#FF6B00]">{commerceNom}</span>{' '}
              publie une offre !
            </p>
            <button
              onClick={handleActiverPush}
              disabled={pushLoading}
              className="w-full bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-sm py-3.5 rounded-2xl transition-colors min-h-[48px] flex items-center justify-center mb-3"
            >
              {pushLoading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : 'Activer les notifications'
              }
            </button>
            <button
              onClick={handlePlusTard}
              className="w-full text-sm text-[#9CA3AF] py-2 hover:text-[#3D3D3D] transition-colors"
            >
              Plus tard
            </button>
          </div>
        </div>
      )}
    </>
  )
}
