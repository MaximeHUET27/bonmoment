/**
 * Backfill latitude/longitude pour les villes sans coordonnées.
 * Source : geo.api.gouv.fr (recherche par code_insee).
 *
 * Usage :
 *   node scripts/backfill-coordonnees-villes.mjs
 *
 * Variables d'environnement requises (.env.local ou export) :
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Variables manquantes : NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function main() {
  // 1. Récupère toutes les villes sans coordonnées
  const { data: villes, error } = await admin
    .from('villes')
    .select('id, nom, code_insee')
    .or('latitude.is.null,longitude.is.null')
    .order('nom')

  if (error) {
    console.error('Erreur lecture villes:', error.message)
    process.exit(1)
  }

  console.log(`${villes.length} ville(s) sans coordonnées à traiter.\n`)
  if (villes.length === 0) process.exit(0)

  let ok = 0
  let ko = 0

  for (const ville of villes) {
    try {
      // 2. Appel geo.api.gouv.fr par code_insee (recherche exacte, pas de doublon)
      const url = `https://geo.api.gouv.fr/communes/${encodeURIComponent(ville.code_insee)}?fields=centre`
      const res  = await fetch(url, { signal: AbortSignal.timeout(5000) })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data      = await res.json()
      // GeoJSON : coordinates = [longitude, latitude]
      const coords    = data?.centre?.coordinates
      if (!coords || coords.length < 2) throw new Error('centre absent')

      const longitude = coords[0]
      const latitude  = coords[1]

      // 3. Mise à jour — ne touche pas les villes qui ont déjà des coordonnées
      const { error: upErr } = await admin
        .from('villes')
        .update({ latitude, longitude })
        .eq('id', ville.id)
        .is('latitude', null) // garde-fou : jamais écraser une valeur existante

      if (upErr) throw new Error(upErr.message)

      console.log(`✓  ${ville.nom} (${ville.code_insee}) → lat ${latitude}, lng ${longitude}`)
      ok++
    } catch (err) {
      console.warn(`✗  ${ville.nom} (${ville.code_insee}) — ${err.message}`)
      ko++
    }

    // Pause légère pour ne pas saturer l'API publique
    await new Promise(r => setTimeout(r, 150))
  }

  console.log(`\nTerminé : ${ok} mis à jour, ${ko} en échec.`)
}

main()
