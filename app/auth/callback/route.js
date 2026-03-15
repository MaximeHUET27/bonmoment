import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // Paramètre de redirection post-connexion (chemin local uniquement)
  const rawNext = searchParams.get('next') ?? '/'
  const next = rawNext.startsWith('/') ? rawNext : '/'

  // Erreur renvoyée par le provider OAuth (ex : accès refusé par l'utilisateur)
  if (error) {
    console.error('[auth/callback] OAuth error:', error, searchParams.get('error_description'))
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(error)}`)
  }

  if (!code) {
    // Pas de code → retour silencieux à l'accueil
    return NextResponse.redirect(`${origin}/`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll()                { return cookieStore.getAll() },
        setAll(cookiesToSet)    {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('[auth/callback] exchangeCodeForSession error:', exchangeError.message)
    return NextResponse.redirect(`${origin}/?auth_error=session_failed`)
  }

  // ── Insertion / mise à jour du profil public.users ──────────────────────
  // Exécutée côté serveur au moment de la première connexion (et idempotente
  // via ignoreDuplicates pour les connexions suivantes).
  if (data.user) {
    const u = data.user
    const { error: upsertError } = await supabase.from('users').upsert(
      {
        id:         u.id,
        email:      u.email,
        nom:        u.user_metadata?.full_name ?? u.user_metadata?.name ?? null,
        avatar_url: u.user_metadata?.avatar_url ?? null,
        // badge_niveau et role restent à leur valeur par défaut ('habitant')
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )

    if (upsertError) {
      // Non bloquant : l'utilisateur est quand même connecté
      console.error('[auth/callback] upsert users error:', upsertError.message)
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
