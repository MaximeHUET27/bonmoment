import { createClient } from '@supabase/supabase-js'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  // Vérifie que l'utilisateur est connecté
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data, error } = await admin
    .from('reservations')
    .select(`
      id,
      statut,
      code_validation,
      qr_code_data,
      created_at,
      offres (
        id,
        titre,
        type_remise,
        valeur,
        date_debut,
        date_fin,
        statut,
        commerces (
          id,
          nom,
          ville,
          adresse,
          photo_url,
          note_google,
          telephone,
          horaires
        )
      )
    `)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data || [])
}
