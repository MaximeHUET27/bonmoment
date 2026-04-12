'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const AuthContext = createContext(null)

// Instance unique côté client
const supabase = createClient()

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // Upsert du profil dans public.users (safety-net client — la vraie insertion
  // est faite côté serveur dans /auth/callback, mais on sécurise ici aussi)
  async function upsertProfile(u) {
    if (!u) return
    await supabase.from('users').upsert(
      {
        id:         u.id,
        email:      u.email,
        nom:        u.user_metadata?.full_name ?? u.user_metadata?.name ?? null,
        avatar_url: u.user_metadata?.avatar_url ?? null,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )
  }

  useEffect(() => {
    // Lecture de la session existante au montage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Écoute des changements d'état d'auth (connexion, déconnexion, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null
        setUser(u)
        if (u) upsertProfile(u)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  /**
   * Lance le flux OAuth.
   * @param {string} provider      - 'google' | 'facebook' | 'azure'
   * @param {string} redirectAfter - chemin vers lequel revenir après connexion
   */
  async function signIn(provider = 'google', redirectAfter = '/') {
    // Sanitise le paramètre next (chemin local uniquement)
    const next = redirectAfter.startsWith('/') ? redirectAfter : '/'

    // Azure (Microsoft) nécessite des scopes explicites pour le tenant /consumers
    const extraOptions = provider === 'azure'
      ? { scopes: 'openid profile email' }
      : {}

    return supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        ...extraOptions,
      },
    })
  }

  async function signOut() {
    // Nettoyer les clés localStorage liées à l'utilisateur
    try {
      localStorage.removeItem('bonmoment_tutoriel')
    } catch {}

    // Nettoyer toutes les clés sessionStorage utilisateur
    try {
      sessionStorage.removeItem('bonmoment_pending_reservation')
      sessionStorage.removeItem('bonmoment_pending_abonne_comm')
      sessionStorage.removeItem('bonmoment_pending_ville_overlay')
      sessionStorage.removeItem('bonmoment_pending_favori')
      sessionStorage.removeItem('pendingAbonnementVille')
    } catch {}

    await supabase.auth.signOut()

    // Hard redirect — force un rechargement complet pour vider tous les states React
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider value={{ user, loading, supabase, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}
