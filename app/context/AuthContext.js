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
   * Lance le flux OAuth Google (extensible aux autres providers plus tard).
   * @param {string} provider   - 'google' | 'facebook' | 'apple' | 'azure'
   * @param {string} redirectAfter - chemin vers lequel revenir après connexion
   */
  function signIn(provider = 'google', redirectAfter = '/') {
    // Sanitise le paramètre next (chemin local uniquement)
    const next = redirectAfter.startsWith('/') ? redirectAfter : '/'
    return supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
  }

  function signOut() {
    return supabase.auth.signOut()
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
