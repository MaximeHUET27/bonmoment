'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { useRegime } from '@/app/admin/comptabilite/layout'

function formatEur(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function KpiCard({ label, value, evolution }) {
  const positif = evolution == null || evolution >= 0
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F0F0F0] flex flex-col gap-1">
      <p className="text-xs font-semibold text-[#3D3D3D]/60 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-black text-[#0A0A0A]">{formatEur(value)}</p>
      {evolution != null && (
        <p className={`text-xs font-semibold ${positif ? 'text-green-500' : 'text-red-500'}`}>
          {positif ? '↑' : '↓'} {Math.abs(evolution).toFixed(1)}% vs mois préc.
        </p>
      )}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-5 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="bg-gray-200 rounded-2xl h-28" />)}
      </div>
      <div className="bg-gray-200 rounded-2xl h-72" />
    </div>
  )
}

export default function ComptabiliteDashboard() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const regime = useRegime()

  async function charger() {
    setLoading(true)
    const res = await fetch('/api/admin/comptabilite/dashboard')
    const d   = await res.json()
    setData(d)
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger()
  }, [])

  async function syncStripe() {
    setSyncing(true)
    setSyncMsg('')
    const res = await fetch('/api/admin/comptabilite/recettes/sync', { method: 'POST' })
    const d   = await res.json()
    setSyncMsg(d.error ? `Erreur : ${d.error}` : `✓ ${d.synced} paiement(s) synchronisé(s)`)
    setSyncing(false)
    charger()
  }

  if (loading) return <Skeleton />

  return (
    <div className="flex flex-col gap-5">

      {/* Alertes seuils */}
      {data?.alertes?.length > 0 && (
        <div className="bg-[#FFF0E0] border border-[#FF6B00]/30 rounded-2xl p-4 flex flex-col gap-1">
          <p className="text-sm font-bold text-[#FF6B00]">⚠️ Alertes seuils</p>
          {data.alertes.map((a, i) => <p key={i} className="text-sm text-[#3D3D3D]">{a}</p>)}
        </div>
      )}

      {/* KPI cards */}
      <div className={`grid gap-4 ${regime === 'micro' ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
        <KpiCard label="CA mois"          value={data?.ca_mois_ht}      evolution={data?.evolution_ca} />
        {regime === 'sas' && (
          <KpiCard label="TVA nette mois" value={data?.tva_nette_mois}  evolution={null} />
        )}
        <KpiCard label="Charges mois"     value={data?.charges_mois_ht} evolution={data?.evolution_charges} />
        <KpiCard label="Résultat estimé"  value={data?.resultat_mois}   evolution={null} />
      </div>

      {/* KPIs secondaires */}
      <div className={`grid gap-4 ${regime === 'micro' ? 'grid-cols-2' : 'grid-cols-3'}`}>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F0F0F0]">
          <p className="text-xs text-[#3D3D3D]/60 uppercase tracking-wide font-semibold mb-1">CA Trimestre</p>
          <p className="text-xl font-black text-[#0A0A0A]">{formatEur(data?.ca_trimestre_ht)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F0F0F0]">
          <p className="text-xs text-[#3D3D3D]/60 uppercase tracking-wide font-semibold mb-1">CA Année</p>
          <p className="text-xl font-black text-[#0A0A0A]">{formatEur(data?.ca_annee_ht)}</p>
        </div>
        {regime === 'sas' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F0F0F0]">
            <p className="text-xs text-[#3D3D3D]/60 uppercase tracking-wide font-semibold mb-1">TVA collectée mois</p>
            <p className="text-xl font-black text-[#0A0A0A]">{formatEur(data?.tva_collectee_mois)}</p>
          </div>
        )}
      </div>

      {/* Graphique 12 mois */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F0F0F0]">
        <p className="text-sm font-bold text-[#0A0A0A] mb-4">CA vs Charges — 12 mois glissants</p>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data?.graphique_12mois ?? []} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="gradCa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCh" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
            <XAxis dataKey="mois" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
            <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={v => `${v}€`} />
            <Tooltip formatter={v => formatEur(v)} />
            <Legend />
            <Area type="monotone" dataKey="ca_ht" name={regime === 'micro' ? 'CA' : 'CA HT'} stroke="#FF6B00" fill="url(#gradCa)" strokeWidth={2} />
            <Area type="monotone" dataKey="charges_ht" name={regime === 'micro' ? 'Charges' : 'Charges HT'} stroke="#3B82F6" fill="url(#gradCh)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={syncStripe}
          disabled={syncing}
          className="bg-[#FF6B00] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#e05f00] transition-colors disabled:opacity-60"
        >
          {syncing ? 'Synchronisation...' : '↻ Synchroniser Stripe'}
        </button>
        {syncMsg && <span className="text-sm text-[#3D3D3D]/70">{syncMsg}</span>}
        <button
          disabled
          className="bg-[#F5F5F5] text-[#3D3D3D]/40 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-not-allowed"
          title="Bientôt disponible"
        >
          ↓ Exporter dossier annuel
        </button>
      </div>
    </div>
  )
}
