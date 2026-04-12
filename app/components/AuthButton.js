'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/app/context/AuthContext'
import AuthBottomSheet from './AuthBottomSheet'

/**
 * Bouton d'authentification affiché en haut à droite sur toutes les pages.
 *
 * - Non connecté : bouton "Se connecter" → ouvre une modale bottom-sheet
 * - Connecté     : avatar + prénom → ouvre un menu déroulant (déconnexion)
 */
export default function AuthButton() {
  const { user, loading, signOut, supabase } = useAuth()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [commerces, setCommerces] = useState([])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!user || !supabase) { setCommerces([]); return }
    supabase.from('commerces').select('id, nom').eq('owner_id', user.id)
      .then(({ data }) => setCommerces(data || []))
  }, [user, supabase])

  // Placeholder pendant la vérification de session
  if (loading) {
    return <div className="w-9 h-9 rounded-full bg-[#F5F5F5] animate-pulse" />
  }

  /* ── Connecté ────────────────────────────────────────────────────────────── */
  if (user) {
    const displayName =
      user.user_metadata?.full_name?.split(' ')[0] ||
      user.user_metadata?.name?.split(' ')[0] ||
      user.email?.split('@')[0] ||
      'Toi'

    const avatar = user.user_metadata?.avatar_url

    return (
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          aria-label="Menu compte"
          className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-[#FFF0E0] hover:bg-[#FFE4CC] transition-colors min-h-[36px]"
        >
          {/* Avatar */}
          {avatar ? (
            <Image
              src={avatar}
              alt={displayName}
              width={28}
              height={28}
              className="w-7 h-7 rounded-full object-cover border border-[#FF6B00]/20"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#FF6B00] flex items-center justify-center text-white text-xs font-black">
              {displayName[0].toUpperCase()}
            </div>
          )}
          {/* Prénom */}
          <span className="text-xs font-bold text-[#0A0A0A] max-w-[72px] truncate">
            {displayName}
          </span>
          {/* Chevron */}
          <svg
            className={`w-3 h-3 text-[#3D3D3D]/50 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Menu déroulant */}
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-11 z-50 bg-white rounded-2xl shadow-xl border border-[#F0F0F0] p-4 min-w-[190px]">
              <p className="text-[11px] font-semibold text-[#3D3D3D]/50 mb-1 truncate">
                {user.email}
              </p>
              <div className="my-3 border-t border-[#F5F5F5]" />
              <Link
                href="/profil/bons"
                onClick={() => setOpen(false)}
                className="block text-sm font-semibold text-[#0A0A0A] hover:text-[#FF6B00] transition-colors py-1"
              >
                🎟️ Mes bons
              </Link>
              <div className="my-2 border-t border-[#F5F5F5]" />
              <Link
                href="/profil"
                onClick={() => setOpen(false)}
                className="block text-sm font-semibold text-[#0A0A0A] hover:text-[#FF6B00] transition-colors py-1"
              >
                👤 Mon profil
              </Link>
              {commerces.length === 1 && (
                <>
                  <div className="my-2 border-t border-[#F5F5F5]" />
                  <Link
                    href="/commercant/dashboard"
                    onClick={() => setOpen(false)}
                    className="block text-sm font-semibold text-[#0A0A0A] hover:text-[#FF6B00] transition-colors py-1"
                  >
                    🏪 Mon commerce
                  </Link>
                </>
              )}
              {commerces.length >= 2 && (
                <>
                  <div className="my-2 border-t border-[#F5F5F5]" />
                  <p className="text-[11px] font-semibold text-[#3D3D3D]/50 mb-1">🏪 Mes commerces</p>
                  {commerces.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setOpen(false); window.location.href = `/commercant/dashboard?commerce=${c.id}` }}
                      className="block w-full text-left text-sm font-semibold text-[#0A0A0A] hover:text-[#FF6B00] transition-colors py-1 pl-2"
                    >
                      {c.nom}
                    </button>
                  ))}
                </>
              )}
              <div className="my-2 border-t border-[#F5F5F5]" />
              <button
                onClick={async () => { await signOut(); setOpen(false) }}
                className="w-full text-left text-sm font-semibold text-red-500 hover:text-red-600 transition-colors py-1"
              >
                Déconnexion
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  /* ── Non connecté ────────────────────────────────────────────────────────── */
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs font-bold text-[#FF6B00] border-2 border-[#FF6B00] px-3 py-2 rounded-full hover:bg-[#FFF0E0] transition-colors whitespace-nowrap min-h-[36px]"
      >
        {/* Stack des 3 logos OAuth */}
        <OAuthStack />
        Se connecter
      </button>

      <AuthBottomSheet isOpen={open} onClose={() => setOpen(false)} redirectAfter={pathname} />
    </>
  )
}

/* ── Stack des 3 logos OAuth (Google · Facebook · Microsoft) ─────────────── */

function OAuthStack() {
  return (
    <div className="flex items-center shrink-0" aria-hidden>
      {/* Google — fond blanc avec bordure */}
      <div className="w-[20px] h-[20px] rounded-full bg-white border border-[#E0E0E0] flex items-center justify-center relative z-30 shadow-sm">
        <svg viewBox="0 0 24 24" width="12" height="12">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      </div>
      {/* Facebook — fond bleu FB */}
      <div className="w-[20px] h-[20px] rounded-full bg-[#1877F2] flex items-center justify-center relative z-20 shadow-sm -ml-[6px]">
        <svg viewBox="0 0 24 24" width="11" height="11">
          <path fill="white" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
        </svg>
      </div>
      {/* Microsoft — fond blanc avec bordure */}
      <div className="w-[20px] h-[20px] rounded-full bg-white border border-[#E0E0E0] flex items-center justify-center relative z-10 shadow-sm -ml-[6px]">
        <svg viewBox="0 0 21 21" width="11" height="11">
          <rect x="1"  y="1"  width="9" height="9" fill="#F25022"/>
          <rect x="11" y="1"  width="9" height="9" fill="#7FBA00"/>
          <rect x="1"  y="11" width="9" height="9" fill="#00A4EF"/>
          <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
        </svg>
      </div>
    </div>
  )
}
