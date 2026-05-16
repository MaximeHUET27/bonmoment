'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import AuthBottomSheet from '@/app/components/AuthBottomSheet'

/**
 * Bouton interactif "Ça m'intéresse" pour les offres sans bon.
 * Crée / supprime la participation directement, sans redirection.
 * Affiche "Intéressé(e)" en vert une fois participatif.
 */
export default function BoutonCaMInteresseInteractif({
  offreId,
  initialInterested = false,
  disabled = false,
  onChange,
  className,
}) {
  const [interested, setInterested] = useState(initialInterested)
  const [loading,    setLoading]    = useState(false)
  const [showAuth,   setShowAuth]   = useState(false)
  const { user } = useAuth()
  const pathname = usePathname()

  async function toggle(e) {
    e.preventDefault()
    e.stopPropagation()
    if (disabled || loading) return
    if (!user) { setShowAuth(true); return }
    setLoading(true)
    try {
      if (!interested) {
        const res = await fetch(`/api/offres/${offreId}/participants`, { method: 'POST' })
        if (res.ok) {
          setInterested(true)
          onChange?.(true)
        }
      } else {
        const res = await fetch(`/api/offres/${offreId}/participants`, { method: 'DELETE' })
        if (res.ok) {
          setInterested(false)
          onChange?.(false)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const baseClass = className ?? 'w-full min-h-[44px] px-4 py-3 rounded-xl font-bold text-white transition disabled:opacity-60 flex items-center justify-center'

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={disabled || loading}
        className={`${baseClass} ${
          disabled
            ? 'bg-[#D0D0D0] cursor-not-allowed'
            : interested
            ? 'bg-green-500 hover:bg-green-600'
            : 'bg-[#FF6B00] hover:bg-[#CC5500]'
        }`}
      >
        {loading
          ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : interested ? 'Intéressé(e)' : 'Ça m\'intéresse'}
      </button>
      <AuthBottomSheet isOpen={showAuth} onClose={() => setShowAuth(false)} redirectAfter={pathname} />
    </>
  )
}
