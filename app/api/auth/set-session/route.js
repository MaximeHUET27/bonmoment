import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * POST /api/auth/set-session
 * Body : { access_token: string, refresh_token: string }
 *
 * Utilisé par le callback auth quand Supabase retourne les tokens
 * dans le fragment URL (#access_token=…) — flux implicite.
 * Établit la session côté serveur (cookie) à partir des tokens bruts.
 */
export async function POST(request) {
  try {
    const { access_token, refresh_token } = await request.json()

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: 'Tokens manquants' }, { status: 400 })
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

    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })

    if (error) {
      console.error('[set-session] setSession error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Upsert du profil public.users (même logique que le callback PKCE)
    if (data.user) {
      const u = data.user
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

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[set-session] Unexpected error:', err)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
