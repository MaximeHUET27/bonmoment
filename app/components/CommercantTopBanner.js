'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'

/**
 * Bandeau d'appel aux commerçants, en haut des pages publiques
 * (inspiré des bandeaux « Pros » des médias locaux).
 *
 * - Masqué dès que l'utilisateur connecté possède un commerce
 *   (le lien du pied de page reste, lui, toujours visible).
 * - Masqué dans les espaces commerçant / admin et sur l'écran du bon
 *   (présenté en caisse : aucune distraction).
 */
const PREFIXES_MASQUES = ['/commercant', '/admin', '/bon', '/auth', '/annuler']

export default function CommercantTopBanner() {
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
  // Connecté : on attend la réponse (évite un flash du bandeau chez un commerçant)
  if (user && (verif?.userId !== user.id || verif.aUnCommerce)) return null

  return (
    <Link
      href="/commercant/inscription"
      className="group block w-full bg-[#0A0A0A] text-white hover:bg-[#1A1A1A] transition-colors"
    >
      <div className="max-w-5xl mx-auto px-4 py-2.5 min-h-[44px] flex items-center justify-center gap-2 sm:gap-3 text-center">
        <span className="text-[12px] sm:text-[13px] font-semibold leading-tight">
          🏪 <span className="hidden sm:inline">Tu es commerçant ? </span>
          Attire de nouveaux clients <strong className="text-[#FF6B00]">gratuitement</strong>
        </span>
        <span className="shrink-0 bg-[#FF6B00] group-hover:bg-[#CC5500] text-white text-[11px] sm:text-xs font-black px-3 py-1.5 rounded-full transition-colors whitespace-nowrap">
          Rejoindre BONMOMENT →
        </span>
      </div>
    </Link>
  )
}
