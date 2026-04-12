import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
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
    // Pas de ?code= dans l'URL.
    // Cas possible : flux implicite Supabase — les tokens arrivent dans le fragment
    // (#access_token=…&refresh_token=…). Le serveur ne peut pas lire le fragment,
    // on renvoie une micro-page HTML qui le lit côté client et appelle
    // /api/auth/set-session pour établir la session via cookie.
    const nextEncoded = JSON.stringify(next) // safe inline JS string
    return new Response(
      `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Connexion en cours…</title></head>
<body>
<script>
(function () {
  var hash = window.location.hash.slice(1)
  var p    = new URLSearchParams(hash)
  var at   = p.get('access_token')
  var rt   = p.get('refresh_token')
  var dest = ${nextEncoded}

  if (at) {
    fetch('/api/auth/set-session', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ access_token: at, refresh_token: rt })
    }).finally(function () { window.location.replace(dest) })
  } else {
    // Aucun token trouvé — rediriger avec une erreur visible pour diagnostic
    window.location.replace('/?auth_error=no_code')
  }
})()
</script>
</body>
</html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll()             { return cookieStore.getAll() },
        setAll(cookiesToSet) {
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
  if (data.user) {
    const u = data.user
    const { error: upsertError } = await supabase.from('users').upsert(
      {
        id:         u.id,
        email:      u.email,
        nom:        u.user_metadata?.full_name ?? u.user_metadata?.name ?? null,
        avatar_url: u.user_metadata?.avatar_url ?? null,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    if (upsertError) {
      console.error('[auth/callback] upsert users error:', upsertError.message)
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
