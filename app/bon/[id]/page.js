/**
 * Page publique du bon — accessible via l'URL du QR code.
 * Permet au commerçant de scanner le QR et voir le bon pour validation.
 */

import { createClient } from '@supabase/supabase-js'
import BonDisplay from './BonDisplay'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function BonPage({ params }) {
  const { id } = await params

  const { data: reservation } = await admin
    .from('reservations')
    .select(`
      id, code_validation, qr_code_data, statut, created_at,
      offres (
        id, commerce_id, titre, date_debut, date_fin, type_remise, valeur,
        commerces ( id, nom, adresse, ville, categorie, photo_url, note_google, horaires, telephone, place_id )
      )
    `)
    .eq('id', id)
    .single()

  if (!reservation) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
        <div className="text-6xl mb-4">🎟️</div>
        <p className="text-xl font-black text-[#0A0A0A]">Bon introuvable</p>
        <p className="text-sm text-[#3D3D3D]/60 mt-2">Ce bon n&apos;existe pas ou a expiré.</p>
      </main>
    )
  }

  return (
    <BonDisplay
      reservation={{
        id:              reservation.id,
        code_validation: reservation.code_validation,
        qr_code_data:    reservation.qr_code_data,
        statut:          reservation.statut,
      }}
      offre={reservation.offres}
      commerce={reservation.offres?.commerces}
      commerceId={reservation.offres?.commerce_id ?? null}
      placeId={reservation.offres?.commerces?.place_id ?? null}
    />
  )
}
