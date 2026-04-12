import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'bonmomentapp@gmail.com'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function debutMoisCourant() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
}

function finMoisCourant() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
}

function debutMoisPrecedent() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
}

function finMoisPrecedent() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
}

function debutAnnee() {
  return `${new Date().getFullYear()}-01-01`
}

function debutTrimestre() {
  const now = new Date()
  const t = Math.floor(now.getMonth() / 3)
  return new Date(now.getFullYear(), t * 3, 1).toISOString().split('T')[0]
}

async function sumRecettes(debut, fin) {
  const { data } = await admin
    .from('recettes')
    .select('montant_ht, montant_tva')
    .eq('statut', 'payee')
    .gte('date', debut)
    .lte('date', fin)
  return {
    ht: data?.reduce((s, r) => s + Number(r.montant_ht), 0) ?? 0,
    tva: data?.reduce((s, r) => s + Number(r.montant_tva), 0) ?? 0,
  }
}

async function sumCharges(debut, fin) {
  const { data } = await admin
    .from('charges')
    .select('montant_ht, montant_tva')
    .gte('date', debut)
    .lte('date', fin)
  return {
    ht: data?.reduce((s, r) => s + Number(r.montant_ht), 0) ?? 0,
    tva: data?.reduce((s, r) => s + Number(r.montant_tva), 0) ?? 0,
  }
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (user.email !== ADMIN_EMAIL)
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const dMois   = debutMoisCourant()
  const fMois   = finMoisCourant()
  const dPrev   = debutMoisPrecedent()
  const fPrev   = finMoisPrecedent()
  const dTrim   = debutTrimestre()
  const dAnnee  = debutAnnee()
  const today   = new Date().toISOString().split('T')[0]

  const [caMois, caPrec, caTrim, caAnnee, chargesMois, chargesPrec, params] = await Promise.all([
    sumRecettes(dMois, fMois),
    sumRecettes(dPrev, fPrev),
    sumRecettes(dTrim, today),
    sumRecettes(dAnnee, today),
    sumCharges(dMois, fMois),
    sumCharges(dPrev, fPrev),
    admin.from('parametres_comptables').select('*').limit(1).single(),
  ])

  // Charges par catégorie du mois
  const { data: chargesDetail } = await admin
    .from('charges')
    .select('categorie, montant_ht')
    .gte('date', dMois)
    .lte('date', fMois)

  const chargesParCategorie = Object.entries(
    (chargesDetail ?? []).reduce((acc, c) => {
      acc[c.categorie] = (acc[c.categorie] ?? 0) + Number(c.montant_ht)
      return acc
    }, {})
  ).map(([categorie, total_ht]) => ({ categorie, total_ht: Math.round(total_ht * 100) / 100 }))

  // Évolutions
  const evolutionCa = caPrec.ht > 0 ? ((caMois.ht - caPrec.ht) / caPrec.ht) * 100 : null
  const evolutionCharges = chargesPrec.ht > 0 ? ((chargesMois.ht - chargesPrec.ht) / chargesPrec.ht) * 100 : null

  // TVA mois
  const { data: chargesMoisDetail } = await admin
    .from('charges')
    .select('montant_tva, autoliquidation')
    .gte('date', dMois)
    .lte('date', fMois)

  const tvaDeductible = (chargesMoisDetail ?? [])
    .filter(c => !c.autoliquidation)
    .reduce((s, c) => s + Number(c.montant_tva), 0)

  const tvaCollectee = caMois.tva
  const tvaNette = tvaCollectee - tvaDeductible

  // Alertes seuils
  const alertes = []
  const p = params.data
  if (p) {
    if (caAnnee.ht > p.seuil_franchise_tva * 0.8)
      alertes.push(`CA annuel (${Math.round(caAnnee.ht)} €) approche du seuil de franchise TVA (${p.seuil_franchise_tva} €)`)
    if (caAnnee.ht > p.seuil_micro * 0.8)
      alertes.push(`CA annuel (${Math.round(caAnnee.ht)} €) approche du seuil micro-entreprise (${p.seuil_micro} €)`)
  }

  // Graphique 12 mois glissants
  const graphique12mois = []
  for (let i = 11; i >= 0; i--) {
    const now = new Date()
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const debut = d.toISOString().split('T')[0]
    const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
    const mois = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

    const [ca, ch] = await Promise.all([sumRecettes(debut, fin), sumCharges(debut, fin)])
    graphique12mois.push({
      mois,
      ca_ht: Math.round(ca.ht * 100) / 100,
      charges_ht: Math.round(ch.ht * 100) / 100,
      resultat: Math.round((ca.ht - ch.ht) * 100) / 100,
    })
  }

  return NextResponse.json({
    ca_mois_ht: Math.round(caMois.ht * 100) / 100,
    ca_trimestre_ht: Math.round(caTrim.ht * 100) / 100,
    ca_annee_ht: Math.round(caAnnee.ht * 100) / 100,
    tva_collectee_mois: Math.round(tvaCollectee * 100) / 100,
    tva_deductible_mois: Math.round(tvaDeductible * 100) / 100,
    tva_nette_mois: Math.round(tvaNette * 100) / 100,
    charges_mois_ht: Math.round(chargesMois.ht * 100) / 100,
    resultat_mois: Math.round((caMois.ht - chargesMois.ht) * 100) / 100,
    evolution_ca: evolutionCa !== null ? Math.round(evolutionCa * 10) / 10 : null,
    evolution_charges: evolutionCharges !== null ? Math.round(evolutionCharges * 10) / 10 : null,
    charges_par_categorie: chargesParCategorie,
    alertes,
    graphique_12mois: graphique12mois,
  })
}
