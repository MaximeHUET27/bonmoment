import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'bonmomentapp@gmail.com'

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })
  if (user.email !== ADMIN_EMAIL) return Response.json({ error: 'Accès refusé' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const { commerce_id, palier } = body

  if (!commerce_id || !palier) {
    return Response.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const dateFin = new Date()
  dateFin.setMonth(dateFin.getMonth() + 1)

  const { error } = await supabaseAdmin
    .from('commerces')
    .update({
      abonnement_actif:    true,
      palier,
      date_fin_abonnement: dateFin.toISOString(),
      resiliation_prevue:  false,
    })
    .eq('id', commerce_id)

  if (error) {
    console.error('Erreur activation admin:', error)
    return Response.json({ error: 'Erreur base de données' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
