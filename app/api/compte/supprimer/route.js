import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * POST /api/compte/supprimer
 * Suppression complète du compte (audit M4) : identité Supabase Auth
 * comprise, pas seulement la ligne public.users. Bloque si le
 * demandeur est commerçant avec un abonnement actif (doit résilier
 * d'abord, via /commercant/resiliation ou la suppression du commerce).
 */
export async function POST() {
  const supabaseUser = await createServerClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return Response.json({ error: 'Non connecté' }, { status: 401 })

  const { data: commercesActifs } = await admin
    .from('commerces')
    .select('id')
    .eq('owner_id', user.id)
    .eq('abonnement_actif', true)
    // L'offre gratuite Basic n'est pas un abonnement : elle ne bloque pas la suppression
    .or('palier.is.null,palier.neq.basic')

  if (commercesActifs && commercesActifs.length > 0) {
    return Response.json(
      { error: 'Résilie ton abonnement commerçant avant de supprimer ton compte.', abonnement_actif: true },
      { status: 409 }
    )
  }

  // Anonymise les references a cet utilisateur dans les tables ou elles
  // ne doivent pas disparaitre pour des raisons de tracabilite/compta
  // (FK nullable en ON DELETE NO ACTION — bloqueraient sinon la
  // suppression de l'identite Auth).
  await admin.from('avis_google_clics').update({ user_id: null }).eq('user_id', user.id)
  await admin.from('codes_parrainage').update({ utilise_par: null }).eq('utilise_par', user.id)
  await admin.from('feedbacks_commerce').update({ user_id: null }).eq('user_id', user.id)
  await admin.from('offres').update({ gagnant_id: null }).eq('gagnant_id', user.id)

  // Supprime l'identite Auth : public.users (et en cascade cartes_fidelite,
  // commerces restants sans abonnement actif, participations_offres,
  // push_subscriptions, reservations) suit via la FK ON DELETE CASCADE.
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('[compte/supprimer] deleteUser error:', error.message)
    return Response.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  return Response.json({ success: true })
}
