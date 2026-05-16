import { createClient } from '@/lib/supabase/server'
import HomeClient from '@/app/components/HomeClient'

export default async function Home() {
  const supabase = await createClient()

  const [
    { data: villes },
    { data: offresRaw },
    { data: { user } },
  ] = await Promise.all([
    supabase.from('villes').select('id, nom').eq('active', true).order('nom'),
    supabase
      .from('offres')
      .select('id, titre, type_remise, valeur, statut, date_debut, date_fin, nb_bons_restants, avec_bon, commerces(id, nom, ville, adresse, categorie, photo_url, note_google, telephone, horaires)')
      .in('statut', ['active', 'expiree'])
      .order('date_fin', { ascending: true }),
    supabase.auth.getUser(),
  ])

  const liste = offresRaw || []

  let offres = liste
  if (user) {
    const sansBonIds = liste.filter(o => o.avec_bon === false).map(o => o.id)
    if (sansBonIds.length) {
      const { data: participations } = await supabase
        .from('participations_offres')
        .select('offre_id')
        .eq('user_id', user.id)
        .in('offre_id', sansBonIds)
      const participated = new Set((participations || []).map(p => p.offre_id))
      offres = liste.map(o => ({ ...o, is_current_user_participating: participated.has(o.id) }))
    }
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <HomeClient villes={villes || []} offres={offres} />
    </main>
  )
}
