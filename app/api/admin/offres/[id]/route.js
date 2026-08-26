import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'bonmomentapp@gmail.com'
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (user.email !== ADMIN_EMAIL) return null
  return user
}

export async function GET(request, { params }) {
  if (!await checkAdmin())
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params

  try {
    const [{ data: offre, error: offreError }, { data: resas }] = await Promise.all([
      admin.from('offres')
        .select('*, commerces(id, nom, ville, adresse, photo_url, telephone)')
        .eq('id', id)
        .single(),
      admin.from('reservations')
        .select('id, statut, created_at, utilise_at, code_validation, users(id, nom, email, avatar_url)')
        .eq('offre_id', id)
        .order('created_at', { ascending: false }),
    ])

    if (offreError || !offre)
      return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 })

    /* Timeline heure par heure */
    const timeline = {}
    for (const r of resas || []) {
      const h = new Date(r.created_at).toISOString().substring(0, 13)
      timeline[h] = (timeline[h] || 0) + 1
    }
    const timelineArr = Object.entries(timeline)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([heure, nb]) => ({ heure: heure + ':00', nb }))

    return NextResponse.json({ offre, resas: resas || [], timeline: timelineArr })
  } catch (err) {
    console.error('[admin/offres/[id] GET]', err)
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  if (!await checkAdmin())
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id }     = await params
  const body       = await request.json()
  const { action } = body

  if (action === 'annuler') {
    const { count } = await admin.from('reservations')
      .select('*', { count: 'exact', head: true }).eq('offre_id', id).eq('statut', 'reservee')
    await admin.from('offres').update({ statut: 'annulee' }).eq('id', id)
    await admin.from('reservations').update({ statut: 'annulee' }).eq('offre_id', id).eq('statut', 'reservee')
    return NextResponse.json({ success: true, nb_annules: count || 0 })
  }

  if (action === 'expirer') {
    await admin.from('offres').update({ statut: 'expiree', date_fin: new Date().toISOString() }).eq('id', id)
    await admin.from('reservations').update({ statut: 'expiree' }).eq('offre_id', id).eq('statut', 'reservee')
    return NextResponse.json({ success: true })
  }

  if (action === 'modifier') {
    const { date_fin, nb_bons_restants, date_debut, titre, description, type_remise, valeur } = body
    const update = {}

    const { data: cur } = await admin.from('offres').select('date_debut, date_fin, type_remise').eq('id', id).single()
    if (!cur) return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 })

    if (date_debut !== undefined && date_debut !== '') {
      const deb = new Date(date_debut)
      if (isNaN(deb.getTime()))
        return NextResponse.json({ error: 'Date de début invalide' }, { status: 400 })
      update.date_debut = deb.toISOString()
    }

    if (date_fin !== undefined && date_fin !== '') {
      const fin = new Date(date_fin)
      if (isNaN(fin.getTime()))
        return NextResponse.json({ error: 'Date de fin invalide' }, { status: 400 })
      const debutRef = update.date_debut ? new Date(update.date_debut) : new Date(cur.date_debut)
      if (fin <= debutRef)
        return NextResponse.json({ error: 'La date de fin doit être après le début' }, { status: 400 })
      update.date_fin = fin.toISOString()
    }

    const debutEffectif = update.date_debut ? new Date(update.date_debut) : (cur.date_debut ? new Date(cur.date_debut) : null)
    const finEffectif   = update.date_fin   ? new Date(update.date_fin)   : (cur.date_fin   ? new Date(cur.date_fin)   : null)
    if (debutEffectif && finEffectif && (finEffectif - debutEffectif) > 24 * 60 * 60 * 1000)
      return NextResponse.json({ error: 'Une offre ne peut pas dépasser 24 heures' }, { status: 400 })

    if (nb_bons_restants !== undefined && nb_bons_restants !== '') {
      const val = parseInt(nb_bons_restants, 10)
      if (isNaN(val) || val < 0)
        return NextResponse.json({ error: 'Nombre de bons invalide' }, { status: 400 })
      update.nb_bons_restants = val
    }

    if (titre !== undefined) {
      const t = String(titre).trim()
      if (t.length === 0)
        return NextResponse.json({ error: 'Le titre ne peut pas être vide' }, { status: 400 })
      if (t.length > 120)
        return NextResponse.json({ error: 'Titre trop long (120 caractères max)' }, { status: 400 })
      update.titre = t
    }

    if (description !== undefined) {
      const d = String(description).trim()
      if (d.length > 150)
        return NextResponse.json({ error: 'Description trop longue (150 caractères max)' }, { status: 400 })
      update.description = d
    }

    const TYPES_VALIDES = ['pourcentage', 'montant_fixe', 'montant', 'cadeau',
      'produit_offert', 'service_offert', 'concours', 'atelier', 'fidelite']
    if (type_remise !== undefined && type_remise !== '') {
      if (!TYPES_VALIDES.includes(type_remise))
        return NextResponse.json({ error: "Type d'offre invalide" }, { status: 400 })
      update.type_remise = type_remise
    }
    const typeEffectif = update.type_remise || cur.type_remise
    if (valeur !== undefined) {
      if (['pourcentage', 'montant_fixe', 'montant'].includes(typeEffectif)) {
        const v = Number(valeur)
        if (isNaN(v) || v <= 0)
          return NextResponse.json({ error: 'Valeur invalide' }, { status: 400 })
        if (typeEffectif === 'pourcentage' && v > 100)
          return NextResponse.json({ error: 'Le pourcentage ne peut pas dépasser 100' }, { status: 400 })
        update.valeur = v
      } else {
        update.valeur = null
      }
    }

    if (Object.keys(update).length === 0)
      return NextResponse.json({ error: 'Aucun champ à modifier' }, { status: 400 })

    const { error: updateErr } = await admin.from('offres').update(update).eq('id', id)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
}

export async function DELETE(request, { params }) {
  if (!await checkAdmin())
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id }      = await params
  const { confirm } = await request.json()
  if (confirm !== 'SUPPRIMER')
    return NextResponse.json({ error: 'Confirmation invalide' }, { status: 400 })

  await admin.from('reservations').delete().eq('offre_id', id)
  await admin.from('offres').delete().eq('id', id)

  return NextResponse.json({ success: true })
}
