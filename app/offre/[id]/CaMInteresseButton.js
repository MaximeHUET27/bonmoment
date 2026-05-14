'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import AuthBottomSheet from '@/app/components/AuthBottomSheet'

export default function CaMInteresseButton({ offreId, initialIsParticipating, initialCount }) {
  const [isParticipating, setIsParticipating] = useState(initialIsParticipating)
  const [count,           setCount]           = useState(initialCount)
  const [loading,         setLoading]         = useState(false)
  const [showAuth,        setShowAuth]        = useState(false)
  const { user } = useAuth()
  const pathname = usePathname()

  async function handleParticiper() {
    if (!user) { setShowAuth(true); return }
    if (isParticipating || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/offres/${offreId}/participants`, { method: 'POST' })
      if (res.ok) {
        setIsParticipating(true)
        setCount(c => c + 1)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDesinscription() {
    if (!isParticipating || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/offres/${offreId}/participants`, { method: 'DELETE' })
      if (res.ok) {
        setIsParticipating(false)
        setCount(c => Math.max(0, c - 1))
      }
    } finally {
      setLoading(false)
    }
  }

  const socialText = count === 0
    ? "Sois le premier à manifester ton intérêt !"
    : count === 1
    ? "1 personne intéressée"
    : `${count} personnes intéressées`

  return (
    <>
      <div className="flex items-center gap-2">
        {isParticipating ? (
          <>
            <div className="flex-1 px-5 py-3 rounded-2xl font-bold text-center text-sm border border-[#FF6B00] bg-[#FFF0E0] text-[#CC5500]">
              ✓ Ça t&apos;intéresse
            </div>
            <button
              onClick={handleDesinscription}
              disabled={loading}
              aria-label="Se désinscrire"
              className="w-10 h-10 flex items-center justify-center rounded-2xl border border-[#E0E0E0] text-[#9CA3AF] hover:text-red-400 hover:border-red-300 transition-colors shrink-0"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                : '✕'}
            </button>
          </>
        ) : (
          <button
            onClick={handleParticiper}
            disabled={loading}
            className="w-full bg-[#FF6B00] hover:bg-[#CC5500] text-white font-bold text-base py-3.5 rounded-2xl transition-colors shadow-lg shadow-orange-200/50 min-h-[48px] flex items-center justify-center"
          >
            {loading
              ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : '🤔 Ça m\'intéresse'}
          </button>
        )}
      </div>

      <p className="text-xs text-[#3D3D3D] text-center">
        👥 {socialText}
      </p>

      <AuthBottomSheet isOpen={showAuth} onClose={() => setShowAuth(false)} redirectAfter={pathname} />
    </>
  )
}
