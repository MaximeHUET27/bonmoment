import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(request) {
  // 1. Vérifier que le user est connecté
  const supabaseUser = await createServerClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return Response.json({ error: 'Non connecté' }, { status: 401 })

  // 2. Récupérer le commerce_id depuis le body
  const { commerceId } = await request.json()
  if (!commerceId) return Response.json({ error: 'Commerce manquant' }, { status: 400 })

  // 3. Vérifier que le user est bien le propriétaire
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const { data: commerce } = await supabaseAdmin
    .from('commerces').select('id, owner_id, nom').eq('id', commerceId).single()
  if (!commerce || commerce.owner_id !== user.id) {
    return Response.json({ error: 'Non autorisé' }, { status: 403 })
  }

  // 4. Annuler les offres actives
  const { error: errOffres } = await supabaseAdmin
    .from('offres')
    .update({ statut: 'annulee' })
    .eq('commerce_id', commerceId)
    .eq('statut', 'active')
  if (errOffres) console.error('Erreur annulation offres:', errOffres.message)

  // 5. Supprimer le commerce (CASCADE → offres → reservations)
  const { error: errCommerce } = await supabaseAdmin
    .from('commerces')
    .delete()
    .eq('id', commerceId)
  if (errCommerce) {
    console.error('Erreur suppression commerce:', errCommerce.message)
    return Response.json({ error: errCommerce.message }, { status: 500 })
  }

  return Response.json({ success: true, nom: commerce.nom })
}
