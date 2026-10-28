'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'

/**
 * Bouton flottant « Commerçant ? Rejoins-nous gratuitement », en haut à gauche
 * de l'accueil — pendant du bouton « Se connecter » (même gabarit, couleur pleine).
 *
 * - Masqué dès que l'utilisateur connecté possède un commerce
 *   (le lien du pied de page reste, lui, toujours visible).
 * - Masqué dans les espaces commerçant / admin et sur l'écran du bon.
 */
const PREFIXES_MASQUES = ['/commercant', '/admin', '/bon', '/auth', '/annuler']

export default function CommercantCTA() {
  const { user, loading, supabase } = useAuth()
  const pathname = usePathname() || '/'
  // { userId, aUnCommerce } : résultat de la vérification pour l'utilisateur connecté
  const [verif, setVerif] = useState(null)

  useEffect(() => {
    if (loading || !user) return
    let annule = false
    supabase
      .from('commerces')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .then(({ count, error }) => {
        // En cas d'erreur on reste prudent : bandeau masqué
        if (!annule) setVerif({ userId: user.id, aUnCommerce: error ? true : (count ?? 0) > 0 })
      })
    return () => { annule = true }
  }, [user, loading, supabase, pathname])   // re-vérifie à chaque navigation (ex. juste après l'inscription)

  if (PREFIXES_MASQUES.some(p => pathname === p || pathname.startsWith(`${p}/`))) return null
  if (loading) return null
  // Connecté : on attend la réponse (évite un flash du bouton chez un commerçant)
  if (user && (verif?.userId !== user.id || verif.aUnCommerce)) return null

  return (
    <Link
      href="/commercant/inscription"
      className="flex items-center gap-1.5 bg-[#FF6B00] hover:bg-[#CC5500] text-white border-2 border-[#FF6B00] hover:border-[#CC5500] px-3 py-1 rounded-full shadow-sm transition-colors min-h-[36px] max-w-[calc(100vw-205px)] sm:max-w-none"
    >
      <span aria-hidden="true" className="hidden sm:inline text-sm leading-none shrink-0">🏪</span>
      <span className="text-[11px] sm:text-xs font-bold leading-tight text-left">
        Commerçant ?<br className="sm:hidden" /> Rejoins-nous gratuitement
      </span>
    </Link>
  )
}
