import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/* Seuls domaines depuis lesquels on accepte de télécharger une photo
   commerce côté serveur : SDK Maps JS classique (getURI) et API Places
   New, les deux utilisés par le parcours d'inscription / actualisation. */
const DOMAINES_AUTORISES = [
  'lh3.googleusercontent.com',
  'maps.googleapis.com',
  'places.googleapis.com',
]

function hostnameAutorise(urlStr) {
  try {
    const { hostname, protocol } = new URL(urlStr)
    if (protocol !== 'https:') return false
    return DOMAINES_AUTORISES.some(d => hostname === d || hostname.endsWith(`.${d}`))
  } catch {
    return false
  }
}

/**
 * POST { commerce_id, photo_url_google }
 * Fetch l'image depuis Google, l'upload dans Supabase Storage
 * (bucket "commerces-photos", public), met à jour photo_url en BDD
 * et retourne l'URL publique Supabase permanente.
 *
 * Réservé au propriétaire du commerce (session requise).
 */
export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const { commerce_id, photo_url_google } = body

  if (!commerce_id || !photo_url_google) {
    return Response.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { data: commerce } = await supabase
    .from('commerces')
    .select('id')
    .eq('id', commerce_id)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!commerce) {
    return Response.json({ error: 'Commerce introuvable ou accès refusé' }, { status: 403 })
  }

  if (!hostnameAutorise(photo_url_google)) {
    return Response.json({ error: 'Domaine de photo non autorisé' }, { status: 400 })
  }

  // Fetch de l'image depuis Google
  let imageRes
  try {
    imageRes = await fetch(photo_url_google, {
      headers: { Referer: 'https://bonmoment.app' },
    })
  } catch (err) {
    return Response.json({ error: `Fetch Google échoué : ${err.message}` }, { status: 502 })
  }
  if (!imageRes.ok) {
    return Response.json({ error: `Image Google inaccessible (${imageRes.status})` }, { status: 502 })
  }

  const contentType = imageRes.headers.get('content-type') || ''
  if (!contentType.startsWith('image/')) {
    return Response.json({ error: 'Le contenu renvoyé n\'est pas une image' }, { status: 502 })
  }

  const buffer = await imageRes.arrayBuffer()

  // Upload dans Supabase Storage (upsert = écrase si déjà présent)
  const { error: uploadError } = await supabase.storage
    .from('commerces-photos')
    .upload(`${commerce_id}.jpg`, buffer, { contentType, upsert: true })

  if (uploadError) {
    return Response.json({ error: uploadError.message }, { status: 500 })
  }

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/commerces-photos/${commerce_id}.jpg`

  // Mise à jour de photo_url en BDD
  const { error: updateError } = await supabase
    .from('commerces')
    .update({ photo_url: publicUrl })
    .eq('id', commerce_id)

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  return Response.json({ url: publicUrl })
}
