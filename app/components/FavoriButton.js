'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import AuthBottomSheet from './AuthBottomSheet'

/**
 * Bouton cœur pour mettre un commerce en favori.
 *
 * @param {string} commerceId   - UUID du commerce
 * @param {string} commerceNom  - Nom du commerce (pour le toast)
 * @param {string} className    - Classes CSS supplémentaires
 */
export default function FavoriButton({ commerceId, commerceNom, className = '' }) {
  const { user, supabase } = useAuth()
  const [favori,    setFavori]    = useState(false)
  const [pulse,     setPulse]     = useState(false)
  const [showAuth,  setShowAuth]  = useState(false)
  const [toast,     setToast]     = useState(null)
  const [loading,   setLoading]   = useState(false)

  /* Lire le statut favori depuis Supabase */
  useEffect(() => {
    if (!user || !commerceId) return
    supabase
      .from('users')
      .select('commerces_abonnes')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.commerces_abonnes) {
          setFavori(data.commerces_abonnes.includes(commerceId))
        }
      })
  }, [user, commerceId, supabase])

  function afficherToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function animePulse() {
    setPulse(true)
    setTimeout(() => setPulse(false), 400)
  }

  async function handleClick(e) {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      setShowAuth(true)
      return
    }

    animePulse()
    setLoading(true)

    const { data: current } = await supabase
      .from('users')
      .select('commerces_abonnes')
      .eq('id', user.id)
      .single()

    const existant    = current?.commerces_abonnes || []
    const dejaFavori  = existant.includes(commerceId)
    const next        = dejaFavori
      ? existant.filter(id => id !== commerceId)
      : [...existant, commerceId]

    await supabase
      .from('users')
      .update({ commerces_abonnes: next })
      .eq('id', user.id)

    const nouveauStatut = !dejaFavori
    setFavori(nouveauStatut)
    setLoading(false)

    if (nouveauStatut && existant.length === 0) {
      afficherToast(`❤️ Tu seras alerté dès que ${commerceNom} publie une offre !`)
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        aria-label={favori ? `Retirer ${commerceNom} des favoris` : `Ajouter ${commerceNom} aux favoris`}
        className={`flex items-center justify-center transition-transform duration-200 min-h-[44px] min-w-[44px] ${
          pulse ? 'scale-[1.3]' : 'scale-100'
        } ${className}`}
        style={{ transition: pulse ? 'transform 0.15s ease-out' : 'transform 0.25s ease-in' }}
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-[#0A0A0A] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl max-w-[90vw] text-center">
          {toast}
        </div>
      )}

      {/* Auth bottom sheet */}
      <AuthBottomSheet
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        redirectAfter={typeof window !== 'undefined' ? window.location.pathname : '/'}
      />
    </>
  )
}
