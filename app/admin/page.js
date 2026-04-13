'use client'

import { useEffect, useState } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

/* ── Helpers ── */
function fmt(n) { return n?.toLocaleString('fr-FR') ?? '—' }
function fmtEur(n) { return n != null ? n.toLocaleString('fr-FR') + ' €' : '—' }
function fmtPct(n) { return n != null ? n + ' %' : '—' }

function evolColor(e) {
  if (e == null) return 'text-[#3D3D3D]/40'
  return e >= 0 ? 'text-green-600' : 'text-red-500'
}
function evolLabel(e) {
  if (e == null) return ''
  return (e >= 0 ? '↑' : '↓') + Math.abs(e) + '%'
}

function retentionColor(v) {
  if (v == null) return 'bg-[#F5F5F5] text-[#3D3D3D]/40'
  if (v >= 80)   return 'bg-green-100 text-green-800'
  if (v >= 50)   return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

/* ── KpiCard ── */
function KpiCard({ icon, label, value, evol, sub }) {
  return (
    <div className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-[#F0F0F0] flex flex-col gap-1 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-xl">{icon}</span>
        {evol != null && (
          <span className={`text-[10px] font-bold ${evolColor(evol)}`}>{evolLabel(evol)}</span>
        )}
      </div>
      <p className="text-xl font-black text-[#0A0A0A] tabular-nums leading-tight">{value}</p>
      <p className="text-[10px] font-semibold text-[#3D3D3D]/60 uppercase tracking-wide leading-tight">{label}</p>
      {sub && <p className="text-[9px] text-[#3D3D3D]/40 leading-tight">{sub}</p>}
    </div>
  )
}

/* ── Alerte bannière ── */
function AlertBanner({ alertes }) {
  const [dismissed, setDismissed] = useState([])
  const visible = alertes.filter((_, i) => !dismissed.includes(i))
  if (!visible.length) return null
  return (
    <div className="flex flex-col gap-2">
      {alertes.map((a, i) => dismissed.includes(i) ? null : (
        <div
          key={i}
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-sm font-semibold ${
            a.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-[#FFF0E0] text-[#CC5500] border border-[#FFD0A0]'
          }`}
        >
          <span>{a.msg}</span>
          <button onClick={() => setDismissed(d => [...d, i])} className="shrink-0 text-base opacity-60 hover:opacity-100">✕</button>
        </div>
      ))}
    </div>
  )
}

/* ── Skeleton ── */
function Sk({ className }) {
  return <div className={`bg-[#E0E0E0] rounded-xl animate-pulse ${className}`} />
}

/* ── Composant principal ── */
export default function AdminDashboard() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[...Array(10)].map((_, i) => <Sk key={i} className="h-24" />)}
      </div>
      <Sk className="h-64" />
      <div className="grid sm:grid-cols-2 gap-4">
        <Sk className="h-48" /><Sk className="h-48" />
      </div>
    </div>
  )

  if (!data) return <p className="text-red-500 font-semibold">Erreur de chargement</p>

  const { kpis, graphiques, cohorte, alertes } = data

  return (
    <div className="flex flex-col gap-6">

      <div>
        <h1 className="text-2xl font-black text-[#0A0A0A]">Dashboard</h1>
        <p className="text-sm text-[#3D3D3D]/60 mt-0.5">
          {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Alertes */}
      {alertes?.length > 0 && <AlertBanner alertes={alertes} />}

      {/* KPIs ligne 1 */}
      <section>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#3D3D3D]/50 mb-2">Revenus & croissance</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard icon="💰" label="MRR"       value={fmtEur(kpis.mrr)}   evol={kpis.mrr_evol} />
          <KpiCard icon="📈" label="ARR"       value={fmtEur(kpis.arr)}   />
          <KpiCard icon="👤" label="ARPU"      value={fmtEur(kpis.arpu)}  />
          <KpiCard icon="📉" label="Churn mensuel" value={fmtPct(kpis.churn)} />
          <KpiCard icon="🚀" label="Conv. essai→payant" value={kpis.taux_conv != null ? fmtPct(kpis.taux_conv) : 'N/A'} />
        </div>
      </section>

      {/* KPIs ligne 2 */}
      <section>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#3D3D3D]/50 mb-2">Activité & engagement</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard icon="🏪" label="Commerçants actifs"   value={fmt(kpis.actifs)}
            sub={`${kpis.essai} essai • ${kpis.resilies} résiliés`} />
          <KpiCard icon="👥" label="Clients inscrits"     value={fmt(kpis.clients_tot)} evol={kpis.clients_evol}
            sub={`${fmt(kpis.actifs_30j)} actifs 30j`} />
          <KpiCard icon="⚡" label="Taux activation"      value={fmtPct(kpis.taux_activ)} />
          <KpiCard icon="✅" label="Taux utilisation bons" value={fmtPct(kpis.taux_util)} evol={kpis.taux_util_evol} />
          <KpiCard icon="📍" label="Villes actives"       value={fmt(kpis.villes_actives)} />
        </div>
      </section>

      {/* KPIs ligne 3 */}
      <section>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#3D3D3D]/50 mb-2">Opérations ce mois</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard icon="🎟️" label="Bons réservés"       value={fmt(kpis.bons_reserves_mois)} />
          <KpiCard icon="✅" label="Bons utilisés"        value={fmt(kpis.bons_utilises_mois)} />
          <KpiCard icon="⚠️" label="Résiliations prévues" value={fmt(kpis.resiliations_prev)}
            sub="fin de période programmée" />
          <KpiCard icon="🆓" label="Actifs sans palier"   value={fmt(kpis.non_abonnes)}
            sub="activés manuellement" />
        </div>
      </section>

      {/* Graphique MRR 12 mois */}
      <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#F0F0F0]">
        <p className="text-sm font-bold text-[#0A0A0A] mb-4">MRR — 12 mois glissants</p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={graphiques.mrr}>
            <defs>
              <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#FF6B00" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF6B00" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v + '€'} />
            <Tooltip formatter={v => v + ' €'} />
            <Area type="monotone" dataKey="mrr" stroke="#FF6B00" fill="url(#mrrGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {/* Graphiques inscriptions + taux util */}
      <div className="grid sm:grid-cols-2 gap-4">
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#F0F0F0]">
          <p className="text-sm font-bold text-[#0A0A0A] mb-4">Inscriptions — 6 mois</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={graphiques.inscriptions}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="essai"   name="Essai"    fill="#FF6B00" stackId="a" />
              <Bar dataKey="payant"  name="Payant"   fill="#CC5500" stackId="a" />
              <Bar dataKey="clients" name="Clients"  fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#F0F0F0]">
          <p className="text-sm font-bold text-[#0A0A0A] mb-4">Taux utilisation bons — 6 mois</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={graphiques.util}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v + '%'} domain={[0, 100]} />
              <Tooltip formatter={v => v + ' %'} />
              <Bar dataKey="taux" name="Taux %" fill="#22C55E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      {/* Heatmap rétention cohorte */}
      <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#F0F0F0]">
        <p className="text-sm font-bold text-[#0A0A0A] mb-1">Rétention cohorte commerçants</p>
        <p className="text-[10px] text-[#3D3D3D]/50 mb-4">% encore actifs par rapport au mois d&apos;inscription</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[#3D3D3D]/50">
                <th className="text-left py-2 pr-4 font-semibold">Cohorte</th>
                <th className="px-2 font-semibold">Total</th>
                <th className="px-2 font-semibold">M+1</th>
                <th className="px-2 font-semibold">M+2</th>
                <th className="px-2 font-semibold">M+3</th>
              </tr>
            </thead>
            <tbody>
              {(cohorte || []).map((row, i) => (
                <tr key={i} className="border-t border-[#F5F5F5]">
                  <td className="py-2 pr-4 font-semibold text-[#0A0A0A]">{row.label}</td>
                  <td className="px-2 text-center">{row.total}</td>
                  {['m1', 'm2', 'm3'].map(m => (
                    <td key={m} className="px-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded font-bold ${retentionColor(row[m])}`}>
                        {row[m] != null ? row[m] + '%' : '—'}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  )
}
