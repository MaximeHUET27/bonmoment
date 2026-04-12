import { createClient } from '@/lib/supabase/server'
import HomeClient from '@/app/components/HomeClient'

export default async function Home() {
  const supabase = await createClient()
  const [
    { data: villes },
    { data: offres },
  ] = await Promise.all([
    supabase.from('villes').select('id, nom').eq('active', true).order('nom'),
    supabase
      .from('offres')
      .select('id, titre, type_remise, valeur, statut, date_debut, date_fin, nb_bons_restants, commerces(id, nom, ville, adresse, categorie, photo_url, note_google, telephone, horaires)')
      .in('statut', ['active', 'expiree'])
      .order('date_fin', { ascending: true }),
  ])

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <HomeClient villes={villes || []} offres={offres || []} />
    </main>
  )
}
