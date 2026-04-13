import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * POST { commerce_id, photo_url_google }
 * Fetch l'image depuis Google, l'upload dans Supabase Storage
 * (bucket "commerces-photos", public), met à jour photo_url en BDD
 * et retourne l'URL publique Supabase permanente.
 */
export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const { commerce_id, photo_url_google } = body

  if (!commerce_id || !photo_url_google) {
    return Response.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  // Fetch de l'image depuis Google
  let imageRes
  try {
    imageRes = await fetch(photo_url_google)
  } catch (err) {
    return Response.json({ error: `Fetch Google échoué : ${err.message}` }, { status: 502 })
  }
  if (!imageRes.ok) {
    return Response.json({ error: `Image Google inaccessible (${imageRes.status})` }, { status: 502 })
  }

  const buffer      = await imageRes.arrayBuffer()
  const contentType = imageRes.headers.get('content-type') || 'image/jpeg'

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
