import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code        = searchParams.get('code')?.trim().toUpperCase()
  const commerce_id = searchParams.get('commerce_id')

  if (!code || !commerce_id) {
    return Response.json({ valid: false, error: 'code_inconnu' }, { status: 400 })
  }

  // Authentification
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ valid: false, error: 'code_inconnu' }, { status: 401 })
  }

  // Vérifie que le commerce appartient bien à l'utilisateur connecté
  const { data: monCommerce } = await supabase
    .from('commerces')
    .select('id')
    .eq('id', commerce_id)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!monCommerce) {
    return Response.json({ valid: false, error: 'code_inconnu' }, { status: 403 })
  }

  // 1. Le code existe et est actif
  const { data: codeRow } = await supabaseAdmin
    .from('codes_parrainage')
    .select('id, statut, expire_at, commerce_id')
    .eq('code', code)
    .maybeSingle()

  if (!codeRow) {
    return Response.json({ valid: false, error: 'code_inconnu' })
  }

  if (codeRow.statut !== 'actif') {
    return Response.json({ valid: false, error: 'code_expire' })
  }

  // 2. Non expiré
  if (new Date(codeRow.expire_at) < new Date()) {
    return Response.json({ valid: false, error: 'code_expire' })
  }

  // 3. Anti-auto-parrainage : le parrain ne peut pas appartenir au même utilisateur
  if (codeRow.commerce_id === commerce_id) {
    return Response.json({ valid: false, error: 'auto_parrainage' })
  }
  const { data: ownedByUser } = await supabase
    .from('commerces')
    .select('id')
    .eq('id', codeRow.commerce_id)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (ownedByUser) {
    return Response.json({ valid: false, error: 'auto_parrainage' })
  }

  // 4. Limite 3 parrainages ce mois calendaire pour le parrain
  const debutMois = new Date()
  debutMois.setDate(1)
  debutMois.setHours(0, 0, 0, 0)
  const { count } = await supabaseAdmin
    .from('codes_parrainage')
    .select('id', { count: 'exact', head: true })
    .eq('commerce_id', codeRow.commerce_id)
    .eq('statut', 'utilise')
    .gte('utilise_at', debutMois.toISOString())

  if ((count ?? 0) >= 3) {
    return Response.json({ valid: false, error: 'limite_atteinte' })
  }

  // 5. Le parrain a un abonnement actif
  const { data: parrainCommerce } = await supabaseAdmin
    .from('commerces')
    .select('id, nom, abonnement_actif')
    .eq('id', codeRow.commerce_id)
    .maybeSingle()

  if (!parrainCommerce?.abonnement_actif) {
    return Response.json({ valid: false, error: 'parrain_inactif' })
  }

  return Response.json({
    valid:               true,
    parrain_nom:         parrainCommerce.nom,
    parrain_commerce_id: parrainCommerce.id,
  })
}
