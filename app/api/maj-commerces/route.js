import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
const FIELDS = 'displayName,rating,userRatingCount,photos,currentOpeningHours,nationalPhoneNumber,location'

// Préfixes d'URLs Google temporaires (expirantes)
const GOOGLE_URL_PREFIXES = [
  'https://maps.googleapis.com',
  'https://lh3.googleusercontent.com',
  'https://places.googleapis.com',
]
function isGooglePhotoUrl(url) {
  return !!url && GOOGLE_URL_PREFIXES.some(p => url.startsWith(p))
}

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

function buildGooglePhotoUrl(photoName) {
  if (!photoName) return null
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${GOOGLE_API_KEY}`
}

/**
 * Fetch l'image Google et l'upload dans Supabase Storage.
 * Retourne l'URL publique permanente, ou null en cas d'échec.
 */
async function uploadPhotoToStorage(commerceId, googlePhotoUrl) {
  try {
    const res = await fetch(googlePhotoUrl)
    if (!res.ok) return null
    const buffer      = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const { error }   = await supabase.storage
      .from('commerces-photos')
      .upload(`${commerceId}.jpg`, buffer, { contentType, upsert: true })
    if (error) {
      console.error(`Storage upload ${commerceId}:`, error.message)
      return null
    }
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/commerces-photos/${commerceId}.jpg`
  } catch (err) {
    console.error(`uploadPhotoToStorage ${commerceId}:`, err.message)
    return null
  }
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
    .select('id, place_id, nom, photo_url')
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
    if (place.location?.latitude    !== undefined) updates.latitude   = place.location.latitude
    if (place.location?.longitude   !== undefined) updates.longitude  = place.location.longitude

    // Photo → toujours stocker dans Supabase Storage (jamais d'URL Google directe)
    if (place.photos?.[0]?.name) {
      const googleUrl   = buildGooglePhotoUrl(place.photos[0].name)
      const storageUrl  = await uploadPhotoToStorage(commerce.id, googleUrl)
      if (storageUrl) updates.photo_url = storageUrl
    } else if (isGooglePhotoUrl(commerce.photo_url)) {
      // Places API sans photo + URL Google expirante en BDD → on efface pour éviter les images cassées
      updates.photo_url = null
    }

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
