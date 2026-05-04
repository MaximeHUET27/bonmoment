import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL   = 'bonmomentapp@gmail.com'
const PALIER_PRIX   = { essentiel: 29, pro: 49 }

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  /* ── Auth ── */
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (user.email !== ADMIN_EMAIL)
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const now       = new Date()
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  // Il y a 1 mois (pour rétention M1)
  const unMoisAvant   = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
  const deuxMoisAvant = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate())

  /* ── Requêtes parallèles ── */
  const [
    { data: commercesData },
    { count: totalUsers },
    { count: offresActives },
    { count: bonsReservesMois },
    { count: bonsUtilisesMois },
    { data: offresData },
    { data: resaAll },
    { data: resaMois },
    { data: resaToday },
    { data: commercesM1 },
  ] = await Promise.all([
    admin.from('commerces').select('id, abonnement_actif, palier, ville, created_at'),
    admin.from('users').select('*', { count: 'exact', head: true }),
    admin.from('offres').select('*', { count: 'exact', head: true }).eq('statut', 'active'),
    admin.from('reservations').select('*', { count: 'exact', head: true }).gte('created_at', debutMois),
    admin.from('reservations').select('*', { count: 'exact', head: true }).eq('statut', 'utilisee').gte('utilise_at', debutMois),
    admin.from('offres').select('commerce_id').gte('created_at', debutMois),
    admin.from('reservations').select('user_id').eq('statut', 'utilisee'),
    admin.from('reservations').select('user_id').gte('created_at', debutMois),
    admin.from('reservations').select('user_id').gte('created_at', today),
    // Commerces inscrits le mois précédent (pour rétention M1)
    admin.from('commerces')
      .select('id, abonnement_actif')
      .gte('created_at', deuxMoisAvant.toISOString())
      .lt('created_at', unMoisAvant.toISOString()),
  ])

  const commerces          = commercesData || []
  const commercantsActifs  = commerces.filter(c => c.abonnement_actif).length
  const commercantsTotal   = commerces.length

  /* ── MRR ── */
  const mrr = commerces
    .filter(c => c.abonnement_actif)
    .reduce((s, c) => s + (PALIER_PRIX[c.palier || 'essentiel'] || 29), 0)

  /* ── Villes actives ── */
  const villesActives = new Set(
    commerces.filter(c => c.abonnement_actif && c.ville).map(c => c.ville)
  ).size

  /* ── Taux utilisation ── */
  const tauxUtil = (bonsReservesMois || 0) > 0
    ? Math.round(((bonsUtilisesMois || 0) / (bonsReservesMois || 1)) * 100)
    : 0

  /* ── Churn (approximation : actifs créés avant ce mois ET désactivés) ── */
  const existantsAvantMois  = commerces.filter(c => c.created_at < debutMois).length
  const inactifsAvantMois   = commerces.filter(c => c.created_at < debutMois && !c.abonnement_actif).length
  const churn = existantsAvantMois > 0
    ? Math.round((inactifsAvantMois / existantsAvantMois) * 100)
    : 0

  /* ── KPIs SaaS avancés ── */
  const arr  = mrr * 12
  const arpu = commercantsActifs > 0 ? Math.round(mrr / commercantsActifs) : 0

  // Taux d'activation : commerçants ayant au moins 1 offre / total
  const commercantsAvecOffres = new Set((offresData || []).map(o => o.commerce_id)).size
  const tauxActivation = commercantsTotal > 0
    ? Math.round((commercantsAvecOffres / commercantsTotal) * 100)
    : 0

  // Offres / commerçant / mois
  const offresParCommerceMois = commercantsActifs > 0
    ? +((offresData?.length || 0) / commercantsActifs).toFixed(1)
    : 0

  // DAU / MAU (basé sur les réservations)
  const dau    = new Set((resaToday || []).map(r => r.user_id)).size
  const mau    = new Set((resaMois  || []).map(r => r.user_id)).size
  const dauMau = mau > 0 ? Math.round((dau / mau) * 100) : 0

  // Rétention M1
  const totalM1 = (commercesM1 || []).length
  const actifsM1 = (commercesM1 || []).filter(c => c.abonnement_actif).length
  const retentionM1 = totalM1 > 0 ? Math.round((actifsM1 / totalM1) * 100) : null

  return NextResponse.json({
    kpis: {
      mrr,
      commercants_actifs:  commercantsActifs,
      clients_total:       totalUsers || 0,
      villes_actives:      villesActives,
      offres_actives:      offresActives || 0,
      bons_reserves_mois:  bonsReservesMois || 0,
      bons_utilises_mois:  bonsUtilisesMois || 0,
      taux_utilisation:    tauxUtil,
      churn,
    },
    saas: {
      arr,
      arpu,
      taux_activation:          tauxActivation,
      offres_par_commerce_mois: offresParCommerceMois,
      dau_mau:                  dauMau,
      retention_m1:             retentionM1,
    },
  })
}
