// scripts/import-villes.js
// Importe toutes les communes françaises dans la table "villes" de Supabase.
// Usage : node scripts/import-villes.js
//
// Prérequis : ajouter dans .env.local la variable :
//   SUPABASE_SERVICE_ROLE_KEY=<votre clé service_role>
// → Supabase Dashboard → Project Settings → API → service_role (secret)

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ── Chargement du .env.local ────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.local')

function loadEnv(filePath) {
  try {
    const lines = readFileSync(filePath, 'utf-8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
      if (key) process.env[key] = value
    }
  } catch {
    console.error(`❌ Impossible de lire ${filePath}`)
    process.exit(1)
  }
}

loadEnv(envPath)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  console.error('❌ Variable NEXT_PUBLIC_SUPABASE_URL manquante dans .env.local')
  process.exit(1)
}

if (!SERVICE_ROLE_KEY) {
  console.error(`
❌ Variable SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local

   La clé anon est bloquée par le RLS (Row Level Security).
   Ce script nécessite la service role key pour contourner le RLS.

   → Supabase Dashboard
     → Project Settings (⚙️)
     → API
     → Rubrique "Project API keys"
     → Copier la valeur de "service_role" (secret)

   Puis ajouter dans .env.local :
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
`)
  process.exit(1)
}

// Service role key → bypass RLS complet
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// ── Constantes ───────────────────────────────────────────────────────────────
const API_URL = 'https://geo.api.gouv.fr/communes?fields=nom,code,codeDepartement&format=json'
const BATCH_SIZE = 500

// ── Téléchargement ───────────────────────────────────────────────────────────
async function fetchCommunes() {
  process.stdout.write('⬇️  Téléchargement des communes depuis geo.api.gouv.fr... ')
  const res = await fetch(API_URL)
  if (!res.ok) {
    console.error(`\n❌ Erreur HTTP ${res.status}`)
    process.exit(1)
  }
  const data = await res.json()
  console.log(`${data.length.toLocaleString('fr-FR')} communes récupérées.`)
  return data
}

// ── Import par lots ──────────────────────────────────────────────────────────
async function importByBatch(communes) {
  const total = communes.length
  let inserted = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = communes.slice(i, i + BATCH_SIZE)

    const rows = batch.map(c => ({
      nom: c.nom,
      code_insee: c.code,
      departement: c.codeDepartement ?? '',
      active: false,
    }))

    const { error } = await supabase
      .from('villes')
      .upsert(rows, {
        onConflict: 'code_insee',
        ignoreDuplicates: true,
      })

    if (error) {
      console.error(`\n⚠️  Erreur sur le lot ${i}–${i + batch.length} : ${error.message}`)
      errors += batch.length
    } else {
      inserted += batch.length
    }

    const done = Math.min(i + BATCH_SIZE, total)
    process.stdout.write(
      `\r📦 ${done.toLocaleString('fr-FR')} / ${total.toLocaleString('fr-FR')} communes importées...`
    )
  }

  return { inserted, skipped, errors }
}

// ── Point d'entrée ───────────────────────────────────────────────────────────
async function main() {
  console.log('\n🇫🇷 Import des communes françaises dans Supabase\n')

  const communes = await fetchCommunes()
  const { inserted, errors } = await importByBatch(communes)

  console.log('\n')
  console.log('✅ Import terminé !')
  console.log(`   Insérées / mises à jour : ${inserted.toLocaleString('fr-FR')}`)
  console.log(`   Erreurs                 : ${errors.toLocaleString('fr-FR')}`)
  console.log(`   Total API               : ${communes.length.toLocaleString('fr-FR')}`)
  console.log(`\n   Les communes sont insérées avec active = false.`)
  console.log(`   Pour activer une ville, passez active = true dans Supabase.\n`)
}

main().catch(err => {
  console.error('\n❌ Erreur inattendue :', err.message)
  process.exit(1)
})
