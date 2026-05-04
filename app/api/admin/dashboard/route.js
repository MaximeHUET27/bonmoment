import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const ADMIN_EMAIL = 'bonmomentapp@gmail.com'
const PALIER_PRIX = { essentiel: 29, pro: 49 }

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function calcMRR(commerces) {
  return commerces
    .filter(c => c.abonnement_actif)
    .reduce((s, c) => s + (PALIER_PRIX[c.palier || 'essentiel'] || 29), 0)
}

function monthRange(year, month) {
  const debut = new Date(year, month, 1).toISOString()
  const fin   = new Date(year, month + 1, 1).toISOString()
  return { debut, fin }
}

function evol(current, prev) {
  if (!prev) return null
  return Math.round(((current - prev) / prev) * 100)
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (user.email !== ADMIN_EMAIL)
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const now          = new Date()
  const debutMois    = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const debutMoisPre = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const finMoisPre   = debutMois
  const il30j        = new Date(now.getTime() - 30 * 86400000).toISOString()
  const il14j        = new Date(now.getTime() - 14 * 86400000).toISOString()
  const il7j         = new Date(now.getTime() -  7 * 86400000).toISOString()

  /* ── Requêtes principales ── */
  const [
    { data: commerces },
    { data: users },
    { data: offresAll },
    { data: resaMois },
    { data: resaMoisPre },
    { data: usersActifs },
    { data: offresRec14j },
    { data: usersMoisPre },
  ] = await Promise.all([
    admin.from('commerces').select('id, nom, email, abonnement_actif, palier, ville, created_at, date_fin_essai, resiliation_prevue'),
    admin.from('users').select('id, created_at'),
    admin.from('offres').select('id, commerce_id, created_at, statut, date_debut, date_fin'),
    admin.from('reservations').select('id, offre_id, statut, created_at, utilise_at').gte('created_at', debutMois),
    admin.from('reservations').select('id, statut').gte('created_at', debutMoisPre).lt('created_at', finMoisPre),
    admin.from('reservations').select('user_id').gte('created_at', il30j),
    admin.from('offres').select('commerce_id').gte('created_at', il14j),
    admin.from('users').select('id').gte('created_at', debutMoisPre).lt('created_at', finMoisPre),
  ])

  const comm    = commerces || []
  const usrs    = users     || []
  const offres  = offresAll || []
  const rMois   = resaMois  || []
  const rPrec   = resaMoisPre || []

  /* ── MRR / ARR / ARPU ── */
  const mrr     = calcMRR(comm)
  const arr     = mrr * 12
  const actifs  = comm.filter(c => c.abonnement_actif).length
  const arpu    = actifs > 0 ? Math.round(mrr / actifs) : 0

  /* ── MRR mois précédent (approximation : mêmes commerçants) ── */
  const mrrPrec = comm
    .filter(c => c.created_at < finMoisPre)
    .reduce((s, c) => {
      if (!c.abonnement_actif) return s
      return s + (PALIER_PRIX[c.palier || 'essentiel'] || 29)
    }, 0)

  /* ── Commerçants segments ── */
  const essai   = comm.filter(c => !c.abonnement_actif && c.date_fin_essai && new Date(c.date_fin_essai) > now)
  const resilies = comm.filter(c => !c.abonnement_actif && (!c.date_fin_essai || new Date(c.date_fin_essai) <= now))
  const commercantsTot = comm.length

  /* ── Churn ── */
  const existantsMoisPre = comm.filter(c => c.created_at < debutMois)
  const churned  = existantsMoisPre.filter(c => !c.abonnement_actif && c.created_at >= debutMoisPre).length
  const churn    = existantsMoisPre.length > 0
    ? +(churned / existantsMoisPre.length * 100).toFixed(1)
    : 0

  /* ── Taux conversion essai → payant ce mois ── */
  const essaisTerminesMois = comm.filter(c =>
    c.date_fin_essai && c.date_fin_essai >= debutMois && c.date_fin_essai < now.toISOString()
  )
  const convertis = essaisTerminesMois.filter(c => c.abonnement_actif).length
  const tauxConv  = essaisTerminesMois.length > 0
    ? Math.round(convertis / essaisTerminesMois.length * 100)
    : null

  /* ── Clients ── */
  const clientsTot    = usrs.length
  const clientsMoisPre = (usersMoisPre || []).length
  const actifs30j     = new Set((usersActifs || []).map(r => r.user_id)).size

  /* ── Taux activation ── */
  const commercesAvecOffres = new Set(offres.map(o => o.commerce_id)).size
  const tauxActiv = commercantsTot > 0
    ? Math.round(commercesAvecOffres / commercantsTot * 100) : 0

  /* ── Taux utilisation bons mois ── */
  const utilisesMois = rMois.filter(r => r.statut === 'utilisee').length
  const tauxUtil = rMois.length > 0 ? Math.round(utilisesMois / rMois.length * 100) : 0
  const utilisesPre  = rPrec.filter(r => r.statut === 'utilisee').length
  const tauxUtilPre  = rPrec.length > 0 ? Math.round(utilisesPre / rPrec.length * 100) : 0

  /* ── Villes actives ── */
  const villesActives = new Set(comm.filter(c => c.abonnement_actif && c.ville).map(c => c.ville)).size

  /* ── KPIs opérationnels ── */
  const nonAbonnes       = comm.filter(c => c.abonnement_actif && !c.palier).length
  const resiliationsPrev = comm.filter(c => c.resiliation_prevue).length
  const bonsReservesMois = rMois.length
  const bonsUtilisesMois = utilisesMois

  /* ── Graphique MRR 12 mois ── */
  const graphMRR = []
  for (let i = 11; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = m.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    const actifsCeMois = comm.filter(c => c.created_at <= new Date(now.getFullYear(), now.getMonth() - i + 1, 1).toISOString() && c.abonnement_actif)
    const mrrPoint = actifsCeMois.reduce((s, c) => s + (PALIER_PRIX[c.palier || 'essentiel'] || 29), 0)
    graphMRR.push({ label, mrr: mrrPoint })
  }

  /* ── Graphique inscriptions 6 mois ── */
  const graphInscriptions = []
  for (let i = 5; i >= 0; i--) {
    const { debut, fin } = monthRange(now.getFullYear(), now.getMonth() - i)
    const label = new Date(now.getFullYear(), now.getMonth() - i, 1).toLocaleDateString('fr-FR', { month: 'short' })
    const commMois    = comm.filter(c => c.created_at >= debut && c.created_at < fin)
    const essaiMois   = commMois.filter(c => c.date_fin_essai).length
    const payantMois  = commMois.filter(c => !c.date_fin_essai || c.abonnement_actif).length
    const clientsMois = usrs.filter(u => u.created_at >= debut && u.created_at < fin).length
    graphInscriptions.push({ label, essai: essaiMois, payant: payantMois, clients: clientsMois })
  }

  /* ── Graphique taux utilisation 6 mois ── */
  const graphUtil = []
  for (let i = 5; i >= 0; i--) {
    const { debut, fin } = monthRange(now.getFullYear(), now.getMonth() - i)
    const label  = new Date(now.getFullYear(), now.getMonth() - i, 1).toLocaleDateString('fr-FR', { month: 'short' })
    const resas  = offres.filter(o => o.created_at >= debut && o.created_at < fin)
    graphUtil.push({ label, taux: tauxUtil })
  }

  /* ── Cohorte rétention M1/M2/M3 ── */
  const cohorte = []
  for (let i = 5; i >= 0; i--) {
    const { debut, fin } = monthRange(now.getFullYear(), now.getMonth() - i)
    const label = new Date(now.getFullYear(), now.getMonth() - i, 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    const cohort = comm.filter(c => c.created_at >= debut && c.created_at < fin)
    const total  = cohort.length
    if (!total) { cohorte.push({ label, total: 0, m1: null, m2: null, m3: null }); continue }
    // Proxy: actif aujourd'hui = encore abonné
    const m1 = i >= 1 ? Math.round(cohort.filter(c => c.abonnement_actif).length / total * 100) : null
    const m2 = i >= 2 ? Math.round(cohort.filter(c => c.abonnement_actif).length / total * 100) : null
    const m3 = i >= 3 ? Math.round(cohort.filter(c => c.abonnement_actif).length / total * 100) : null
    cohorte.push({ label, total, m1, m2, m3 })
  }

  /* ── Alertes ── */
  const alertes = []

  // Essais expirant < 7j sans offre publiée
  const essaisBientot = comm.filter(c =>
    !c.abonnement_actif &&
    c.date_fin_essai &&
    c.date_fin_essai > now.toISOString() &&
    c.date_fin_essai <= il7j === false &&
    new Date(c.date_fin_essai) <= new Date(now.getTime() + 7 * 86400000)
  )
  const essaisSansOffre = essaisBientot.filter(c =>
    !offres.some(o => o.commerce_id === c.id)
  )
  if (essaisSansOffre.length > 0)
    alertes.push({ type: 'warning', msg: `${essaisSansOffre.length} commerçant(s) en essai expirent dans < 7j sans offre publiée` })

  // Commerçants actifs sans offre depuis 14j
  const actifsIds   = comm.filter(c => c.abonnement_actif).map(c => c.id)
  const recentsIds  = new Set((offresRec14j || []).map(o => o.commerce_id))
  const inactifs14j = actifsIds.filter(id => !recentsIds.has(id)).length
  if (inactifs14j > 0)
    alertes.push({ type: 'warning', msg: `${inactifs14j} commerçant(s) actif(s) sans offre publiée depuis 14 jours` })

  // Paiements Stripe échoués
  let failedCount = 0
  try {
    const stripe    = new Stripe(process.env.STRIPE_SECRET_KEY)
    const invoices  = await stripe.invoices.list({ status: 'open', limit: 100 })
    failedCount     = invoices.data.filter(inv =>
      inv.attempt_count > 0 && inv.due_date && inv.due_date * 1000 < Date.now()
    ).length
    if (failedCount > 0)
      alertes.push({ type: 'error', msg: `${failedCount} paiement(s) en échec non régularisé(s)` })
  } catch {}

  return NextResponse.json({
    kpis: {
      mrr,         mrr_evol:    evol(mrr, mrrPrec),
      arr,
      arpu,
      churn,
      taux_conv:   tauxConv,
      actifs,      essai: essai.length, resilies: resilies.length,
      clients_tot: clientsTot, clients_evol: evol(clientsTot, clientsTot - clientsMoisPre),
      actifs_30j:  actifs30j,
      taux_activ:  tauxActiv,
      taux_util:   tauxUtil,   taux_util_evol: evol(tauxUtil, tauxUtilPre),
      villes_actives: villesActives,
      non_abonnes:         nonAbonnes,
      resiliations_prev:   resiliationsPrev,
      bons_reserves_mois:  bonsReservesMois,
      bons_utilises_mois:  bonsUtilisesMois,
    },
    graphiques: { mrr: graphMRR, inscriptions: graphInscriptions, util: graphUtil },
    cohorte,
    alertes,
  })
}
