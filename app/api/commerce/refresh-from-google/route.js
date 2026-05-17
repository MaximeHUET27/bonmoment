import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Rate limit en mémoire : commerce_id → timestamp du dernier refresh
// Se réinitialise au redémarrage serveur — acceptable sans colonne updated_at
const refreshCooldown = new Map()
const COOLDOWN_MS = 24 * 60 * 60 * 1000

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const { commerce_id } = body

  if (!commerce_id) {
    return Response.json({ error: 'commerce_id manquant' }, { status: 400 })
  }

  // Vérifier l'utilisateur connecté via cookies de session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Non authentifié' }, { status: 401 })
  }

  // Vérifier ownership
  const { data: commerce } = await supabaseAdmin
    .from('commerces')
    .select('id, place_id, photo_url, nom, adresse, ville, note_google, horaires, telephone, latitude, longitude')
    .eq('id', commerce_id)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!commerce) {
    return Response.json({ error: 'Commerce introuvable ou accès refusé' }, { status: 403 })
  }

  // Rate limit 24h en mémoire
  const lastRefresh = refreshCooldown.get(commerce_id)
  if (lastRefresh && Date.now() - lastRefresh < COOLDOWN_MS) {
    return Response.json(
      { error: 'Tu as déjà actualisé ton commerce récemment. Réessaie dans quelques heures.' },
      { status: 429 }
    )
  }

  // Appel Google Places New API (REST)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  const fields = [
    'displayName', 'formattedAddress', 'addressComponents',
    'location', 'photos', 'rating', 'regularOpeningHours', 'nationalPhoneNumber',
  ].join(',')

  let placeData
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${commerce.place_id}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fields,
        'Referer': 'https://bonmoment.app',
      },
    })
    if (!res.ok) {
      const txt = await res.text()
      console.error('[refresh-from-google] Google Places API error:', res.status, txt)
      return Response.json({ error: `Google Places inaccessible (${res.status})` }, { status: 502 })
    }
    placeData = await res.json()
  } catch (err) {
    console.error('[refresh-from-google] fetch Places error:', err)
    return Response.json({ error: `Erreur réseau Google: ${err.message}` }, { status: 502 })
  }

  // Extraire la localité depuis addressComponents
  const locality =
    placeData.addressComponents?.find(c => c.types?.includes('locality'))?.longText ||
    placeData.addressComponents?.find(c => c.types?.includes('administrative_area_level_2'))?.longText ||
    commerce.ville

  // Photo : télécharger + uploader dans Supabase Storage
  let newPhotoUrl = commerce.photo_url
  if (placeData.photos?.length > 0) {
    const photoName = placeData.photos[0].name
    const photoApiUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=900&key=${apiKey}`
    try {
      const imgRes = await fetch(photoApiUrl, {
        headers: { 'Referer': 'https://bonmoment.app' },
      })
      if (imgRes.ok) {
        const buffer = await imgRes.arrayBuffer()
        const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
        const { error: uploadError } = await supabaseAdmin.storage
          .from('commerces-photos')
          .upload(`${commerce_id}.jpg`, buffer, { contentType, upsert: true })
        if (!uploadError) {
          newPhotoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/commerces-photos/${commerce_id}.jpg`
        } else {
          console.error('[refresh-from-google] upload photo error:', uploadError.message)
        }
      } else {
        console.error('[refresh-from-google] photo fetch error:', imgRes.status)
      }
    } catch (err) {
      console.error('[refresh-from-google] photo error:', err)
      // Non-bloquant : on garde l'ancienne photo
    }
  }

  // Mise à jour — uniquement les 9 champs autorisés, rien d'autre
  const updates = {
    nom:         placeData.displayName?.text        ?? commerce.nom,
    adresse:     placeData.formattedAddress          ?? commerce.adresse,
    ville:       locality,
    latitude:    placeData.location?.latitude        ?? commerce.latitude,
    longitude:   placeData.location?.longitude       ?? commerce.longitude,
    photo_url:   newPhotoUrl,
    note_google: placeData.rating                    ?? commerce.note_google,
    horaires:    placeData.regularOpeningHours?.weekdayDescriptions ?? commerce.horaires,
    telephone:   placeData.nationalPhoneNumber       ?? commerce.telephone,
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('commerces')
    .update(updates)
    .eq('id', commerce_id)
    .select('id, nom, adresse, ville, note_google, photo_url, telephone, horaires, latitude, longitude')
    .single()

  if (updateError) {
    console.error('[refresh-from-google] update error:', updateError.message)
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  refreshCooldown.set(commerce_id, Date.now())

  return Response.json({ commerce: updated })
}
