'use client'

import { useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { useFavoris } from '@/app/context/FavorisContext'
import AuthBottomSheet from './AuthBottomSheet'

/**
 * Bouton cœur pour mettre un commerce en favori.
 *
 * @param {string} commerceId   - UUID du commerce
 * @param {string} commerceNom  - Nom du commerce (pour le toast)
 * @param {string} className    - Classes CSS supplémentaires
 */
export default function FavoriButton({ commerceId, commerceNom, className = '' }) {
  const { user }                  = useAuth()
  const { isFavori, toggleFavori } = useFavoris()
  const [pulse,    setPulse]    = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [toast,    setToast]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  const favori = isFavori(commerceId)

  useEffect(() => {
    if (!user || !commerceId) return
    const pendingId = sessionStorage.getItem('bonmoment_pending_favori')
    if (pendingId === commerceId) {
      sessionStorage.removeItem('bonmoment_pending_favori')
      toggleFavori(commerceId).then(isNow => {
        if (isNow) {
          setToast(`❤️ Tu seras alerté dès que ${commerceNom} publie une offre !`)
          setTimeout(() => setToast(null), 4_000)
        }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

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

    if (isNowFavori) {
      setToast(`❤️ Tu seras alerté dès que ${commerceNom} publie une offre !`)
      setTimeout(() => setToast(null), 4_000)
    }
  }

  return (
    <>
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

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-[#0A0A0A] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl max-w-[90vw] text-center">
          {toast}
        </div>
      )}

      <AuthBottomSheet
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        redirectAfter={typeof window !== 'undefined' ? window.location.pathname : '/'}
      />
    </>
  )
}
