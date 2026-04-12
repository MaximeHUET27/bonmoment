import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
const FIELDS = 'displayName,rating,userRatingCount,photos,currentOpeningHours,nationalPhoneNumber,location'

async function fetchPlaceDetails(placeId) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key':  GOOGLE_API_KEY,
      'X-Goog-FieldMask': FIELDS,
    },
  })
  if (!res.ok) return null
  return res.json()
}

function buildPhotoUrl(photoName) {
  if (!photoName) return null
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${GOOGLE_API_KEY}`
}

export async function GET(request) {
  /* Vérification du secret cron Vercel */
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 })
  }

  /* Récupère tous les commerces actifs avec un place_id */
  const { data: commerces, error } = await supabase
    .from('commerces')
    .select('id, place_id, nom')
    .eq('abonnement_actif', true)
    .not('place_id', 'is', null)

  if (error) {
    console.error('Erreur chargement commerces:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }

  let mis_a_jour = 0
  let erreurs    = 0

  for (const commerce of commerces || []) {
    const place = await fetchPlaceDetails(commerce.place_id)

    if (!place) {
      console.error(`Place introuvable pour ${commerce.nom} (${commerce.place_id})`)
      erreurs++
      continue
    }

    const updates = {}
    if (place.rating                !== undefined) updates.note_google = place.rating
    if (place.nationalPhoneNumber   !== undefined) updates.telephone   = place.nationalPhoneNumber
    if (place.currentOpeningHours   !== undefined) updates.horaires    = place.currentOpeningHours
    if (place.photos?.[0]?.name)                   updates.photo_url  = buildPhotoUrl(place.photos[0].name)
    if (place.location?.latitude    !== undefined) updates.latitude   = place.location.latitude
    if (place.location?.longitude   !== undefined) updates.longitude  = place.location.longitude

    const { error: updateError } = await supabase
      .from('commerces')
      .update(updates)
      .eq('id', commerce.id)

    if (updateError) {
      console.error(`Erreur mise à jour ${commerce.nom}:`, updateError.message)
      erreurs++
    } else {
      mis_a_jour++
    }
  }

  if (erreurs > 0) console.error(`maj-commerces : ${erreurs} erreurs sur ${(commerces || []).length} commerces`)

  return Response.json({
    total:      (commerces || []).length,
    mis_a_jour,
    erreurs,
  })
}
