'use client'

import { useEffect, useState } from 'react'

/* ── Objectifs SaaS (référence cahier des charges) ──────────────────────── */
const OBJ = {
  mrr:                     1000,
  commercants_actifs:        20,
  clients_total:            500,
  villes_actives:             5,
  offres_actives:            40,
  bons_reserves_mois:       300,
  bons_utilises_mois:       180,
  taux_utilisation:          60,
  churn:                      5,   // objectif : < 5%
  arr:                    12000,
  arpu:                      50,
  taux_activation:           80,
  offres_par_commerce_mois:   4,
  dau_mau:                   20,
  retention_m1:              70,
}

/* ── Helpers couleur ─────────────────────────────────────────────────────── */
function colorKPI(val, obj, inversed = false) {
  if (inversed) {
    if (val <= obj)           return { text: '#22C55E', bg: '#F0FDF4', dot: '#22C55E' }
    if (val <= obj * 1.5)     return { text: '#FF6B00', bg: '#FFF7ED', dot: '#FF6B00' }
    return                           { text: '#EF4444', bg: '#FEF2F2', dot: '#EF4444' }
  }
  const pct = obj > 0 ? val / obj : 1
  if (pct >= 1)       return { text: '#22C55E', bg: '#F0FDF4', dot: '#22C55E' }
  if (pct >= 0.5)     return { text: '#FF6B00', bg: '#FFF7ED', dot: '#FF6B00' }
  return                     { text: '#EF4444', bg: '#FEF2F2', dot: '#EF4444' }
}

function pctProgress(val, obj) {
  return Math.min((val / obj) * 100, 100)
}

function formatEur(n) {
  return n?.toLocaleString('fr-FR') + ' €'
}

/* ── Carte KPI ───────────────────────────────────────────────────────────── */
function KpiCard({ icon, label, value, obj, unit = '', inversed = false, format }) {
  const display = format ? format(value) : `${value}${unit}`
  const c       = colorKPI(value, obj, inversed)

  return (
    <div
      className="flex flex-col gap-1 bg-white rounded-2xl px-4 py-4 shadow-sm min-w-[140px] sm:min-w-0 border border-[#F0F0F0]"
      style={{ borderTop: `3px solid ${c.dot}` }}
    >
      <span className="text-2xl leading-none">{icon}</span>
      <p
        className="text-2xl font-black leading-tight tabular-nums"
        style={{ color: c.text }}
      >
        {display}
      </p>
      <p className="text-[10px] font-semibold text-[#3D3D3D]/60 uppercase tracking-wide leading-tight">{label}</p>
      {obj != null && (
        <p className="text-[9px] text-[#3D3D3D]/40">
          Obj. {format ? format(obj) : `${obj}${unit}`}
        </p>
      )}
    </div>
  )
}

/* ── Ligne KPI SaaS avancé avec barre ──────────────────────────────────────── */
function SaasRow({ icon, label, value, obj, unit = '', inversed = false, format, note }) {
  if (value === null || value === undefined) {
    return (
      <div className="flex items-center gap-3 py-3 border-b border-[#F5F5F5] last:border-0">
        <span className="text-xl w-7 shrink-0">{icon}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold text-[#0A0A0A]">{label}</span>
            <span className="text-xs text-[#3D3D3D]/40">N/A</span>
          </div>
          {note && <p className="text-[10px] text-[#3D3D3D]/40">{note}</p>}
        </div>
      </div>
    )
  }

  const c    = colorKPI(value, obj, inversed)
  const pct  = inversed
    ? Math.min((obj / Math.max(value, 0.01)) * 100, 100)
    : pctProgress(value, obj)
  const display = format ? format(value) : `${value}${unit}`
  const objFmt  = format ? format(obj)   : `${obj}${unit}`

  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#F5F5F5] last:border-0">
      <span className="text-xl w-7 shrink-0">{icon}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-bold text-[#0A0A0A]">{label}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black tabular-nums" style={{ color: c.text }}>
              {display}
            </span>
            <span className="text-[10px] text-[#3D3D3D]/40">/ {objFmt}</span>
          </div>
        </div>
        <div className="w-full h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: c.dot }}
          />
        </div>
        {note && <p className="text-[10px] text-[#3D3D3D]/40 mt-1">{note}</p>}
      </div>
    </div>
  )
}

/* ── Composant principal ─────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Erreur de chargement'); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="w-8 h-8 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-red-500 font-semibold">
        {error || 'Données indisponibles'}
      </div>
    )
  }

  const { kpis, saas } = data

  return (
    <div className="flex flex-col gap-6">

      {/* ── Titre ── */}
      <div>
        <h1 className="text-2xl font-black text-[#0A0A0A]">Dashboard</h1>
        <p className="text-sm text-[#3D3D3D]/60 mt-0.5">
          {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* ── KPIs principaux — scroll horizontal mobile, grille desktop ── */}
      <section>
        <h2 className="text-xs font-black uppercase tracking-widest text-[#3D3D3D]/50 mb-3">
          KPIs du mois
        </h2>
        <div
          className="flex sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-3 overflow-x-auto pb-2 sm:overflow-visible sm:pb-0"
          style={{ scrollbarWidth: 'none' }}
        >
          <KpiCard icon="💰" label="MRR"                  value={kpis.mrr}                  obj={OBJ.mrr}                format={formatEur} />
          <KpiCard icon="🏪" label="Commerçants actifs"   value={kpis.commercants_actifs}   obj={OBJ.commercants_actifs} />
          <KpiCard icon="👥" label="Clients inscrits"     value={kpis.clients_total}        obj={OBJ.clients_total} />
          <KpiCard icon="📍" label="Villes actives"       value={kpis.villes_actives}       obj={OBJ.villes_actives} />
          <KpiCard icon="🎟️" label="Offres actives"       value={kpis.offres_actives}       obj={OBJ.offres_actives} />
          <KpiCard icon="📋" label="Bons réservés / mois" value={kpis.bons_reserves_mois}   obj={OBJ.bons_reserves_mois} />
          <KpiCard icon="✅" label="Bons utilisés / mois" value={kpis.bons_utilises_mois}   obj={OBJ.bons_utilises_mois} />
          <KpiCard icon="📈" label="Taux utilisation"     value={kpis.taux_utilisation}     obj={OBJ.taux_utilisation} unit="%" />
          <KpiCard icon="📉" label="Churn rate"           value={kpis.churn}                obj={OBJ.churn}            unit="%" inversed />
        </div>
      </section>

      {/* ── KPIs SaaS avancés ── */}
      <section className="bg-white rounded-3xl px-5 py-5 shadow-sm">
        <h2 className="text-xs font-black uppercase tracking-widest text-[#3D3D3D]/50 mb-1">
          KPIs SaaS avancés
        </h2>
        <p className="text-[11px] text-[#3D3D3D]/40 mb-4">Indicateurs de santé business</p>

        <div className="grid sm:grid-cols-2 gap-x-8">
          <div>
            <SaasRow
              icon="💵"
              label="ARR (Revenu annuel récurrent)"
              value={saas.arr}
              obj={OBJ.arr}
              format={formatEur}
            />
            <SaasRow
              icon="👤"
              label="ARPU (Revenu moyen par commerçant)"
              value={saas.arpu}
              obj={OBJ.arpu}
              format={formatEur}
            />
            <SaasRow
              icon="🚀"
              label="Taux d'activation"
              value={saas.taux_activation}
              obj={OBJ.taux_activation}
              unit="%"
              note="Commerçants ayant publié ≥1 offre"
            />
          </div>
          <div>
            <SaasRow
              icon="📦"
              label="Offres / commerçant / mois"
              value={saas.offres_par_commerce_mois}
              obj={OBJ.offres_par_commerce_mois}
              note="Activité de publication"
            />
            <SaasRow
              icon="📡"
              label="DAU / MAU"
              value={saas.dau_mau}
              obj={OBJ.dau_mau}
              unit="%"
              note="Engagement quotidien vs mensuel"
            />
            <SaasRow
              icon="🔄"
              label="Rétention M1"
              value={saas.retention_m1}
              obj={OBJ.retention_m1}
              unit="%"
              note={saas.retention_m1 === null ? "Pas assez de données (< 2 mois)" : "Commerçants encore actifs 1 mois après inscription"}
            />
          </div>
        </div>
      </section>

      {/* ── Raccourcis vers les tables ── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: '/admin/commercants', icon: '🏪', label: 'Gérer les commerçants', color: '#FF6B00' },
          { href: '/admin/clients',     icon: '👥', label: 'Voir les clients',       color: '#3B82F6' },
          { href: '/admin/offres',      icon: '🎟️', label: 'Toutes les offres',      color: '#8B5CF6' },
        ].map(l => (
          <a
            key={l.href}
            href={l.href}
            className="bg-white rounded-2xl px-5 py-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow border border-[#F0F0F0] hover:border-[#FF6B00]/30 group"
          >
            <span className="text-3xl">{l.icon}</span>
            <span className="font-bold text-sm text-[#0A0A0A] group-hover:text-[#FF6B00] transition-colors">
              {l.label} →
            </span>
          </a>
        ))}
      </section>

    </div>
  )
}
