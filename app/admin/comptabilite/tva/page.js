'use client'

import { useEffect, useState } from 'react'
import { useRegime } from '@/app/admin/comptabilite/layout'
import dynamic from 'next/dynamic'
const BarChart         = dynamic(() => import('recharts').then(m => m.BarChart),         { ssr: false })
const Bar              = dynamic(() => import('recharts').then(m => m.Bar),              { ssr: false })
const XAxis            = dynamic(() => import('recharts').then(m => m.XAxis),            { ssr: false })
const YAxis            = dynamic(() => import('recharts').then(m => m.YAxis),            { ssr: false })
const CartesianGrid    = dynamic(() => import('recharts').then(m => m.CartesianGrid),    { ssr: false })
const Tooltip          = dynamic(() => import('recharts').then(m => m.Tooltip),          { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })
const Legend           = dynamic(() => import('recharts').then(m => m.Legend),           { ssr: false })

function formatEur(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function debutTrimestre() {
  const now = new Date()
  const t = Math.floor(now.getMonth() / 3)
  return new Date(now.getFullYear(), t * 3, 1).toISOString().split('T')[0]
}

function finTrimestre() {
  const now = new Date()
  const t = Math.floor(now.getMonth() / 3)
  return new Date(now.getFullYear(), t * 3 + 3, 0).toISOString().split('T')[0]
}

async function telecharger(debut, fin) {
  const res = await fetch('/api/admin/comptabilite/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'tva_pdf', debut, fin }),
  })
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tva_${debut}_${fin}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export default function TVAPage() {
  const regime = useRegime()
  const [debut,    setDebut]    = useState(debutTrimestre())
  const [fin,      setFin]      = useState(finTrimestre())
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(null)

  async function charger() {
    setLoading(true)
    const res = await fetch(`/api/admin/comptabilite/tva?debut=${debut}&fin=${fin}`)
    const d = await res.json()
    setData(d)
    setLoading(false)
  }

  useEffect(() => {
    if (regime === 'sas') charger()
    else setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regime])

  if (regime === 'micro') {
    return (
      <div className="flex flex-col gap-5">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#F0F0F0] flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#FFF0E0] flex items-center justify-center text-2xl">
            📋
          </div>
          <p className="text-base font-black text-[#0A0A0A]">Franchise en base de TVA</p>
          <p className="text-sm text-[#3D3D3D]">
            Aucune TVA à collecter ni à déclarer — Article 293 B du CGI
          </p>
          <div className="mt-2 bg-[#FFF0E0] border border-[#FF6B00]/20 rounded-2xl px-6 py-4 max-w-md">
            <p className="text-sm text-[#FF6B00] font-semibold">
              TVA non applicable, article 293 B du CGI.
            </p>
            <p className="text-xs text-[#3D3D3D]/70 mt-2">
              En régime de franchise en base de TVA, vous n&apos;avez pas à collecter ni à reverser la TVA. Aucune déclaration de TVA n&apos;est requise tant que le chiffre d&apos;affaires reste sous le seuil légal.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Filtres */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F0F0F0] flex flex-wrap gap-3 items-center">
        <input type="date" value={debut} onChange={e => setDebut(e.target.value)}
          className="border border-[#EBEBEB] rounded-xl px-3 py-2 text-sm" />
        <input type="date" value={fin} onChange={e => setFin(e.target.value)}
          className="border border-[#EBEBEB] rounded-xl px-3 py-2 text-sm" />
        <button onClick={charger}
          className="bg-[#FF6B00] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#e05f00] transition-colors">
          Calculer
        </button>
        <button onClick={() => telecharger(debut, fin)}
          className="ml-auto bg-[#F5F5F5] text-[#3D3D3D] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#EBEBEB] transition-colors">
          ↓ PDF TVA
        </button>
      </div>

      {/* Tableau TVA principal */}
      {loading ? (
        <div className="animate-pulse bg-gray-200 rounded-2xl h-40" />
      ) : data && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F0F0F0]">
          <p className="text-sm font-bold text-[#0A0A0A] mb-4">
            TVA — du {debut} au {fin}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'TVA collectée',    val: data.tva_collectee,    desc: 'Sur les recettes' },
              { label: 'TVA déductible',   val: data.tva_deductible,   desc: 'Sur les charges' },
              { label: 'TVA autoliquidée', val: data.tva_autoliquidee, desc: 'Neutre (info)' },
              { label: 'TVA NETTE À PAYER', val: data.tva_nette,       desc: 'À reporter sur CA3', highlight: true },
            ].map(item => (
              <div key={item.label} className={`rounded-2xl p-4 ${item.highlight ? 'border-2 border-[#FF6B00]' : 'bg-[#F5F5F5]'}`}>
                <p className="text-xs font-semibold text-[#3D3D3D]/60 mb-1">{item.label}</p>
                <p className={`text-xl font-black ${item.highlight ? 'text-[#FF6B00]' : 'text-[#0A0A0A]'}`}>
                  {formatEur(item.val)}
                </p>
                <p className="text-xs text-[#3D3D3D]/40 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 bg-[#FFF0E0] rounded-xl p-3">
            <p className="text-xs text-[#FF6B00] font-semibold">
              ℹ️ Autoliquidation : La TVA sur prestations intracommunautaires est déclarée en ligne 2 (collectée) ET ligne 20 (déductible) — impact nul sur le solde.
            </p>
          </div>
        </div>
      )}

      {/* Graphique historique */}
      {!loading && data?.historique_12_periodes && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F0F0F0]">
          <p className="text-sm font-bold text-[#0A0A0A] mb-4">Historique TVA — 12 mois</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.historique_12_periodes} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="mois" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={v => `${v}€`} />
              <Tooltip formatter={v => formatEur(v)} />
              <Legend />
              <Bar dataKey="tva_collectee"  name="TVA collectée"  fill="#FF6B00" radius={[4, 4, 0, 0]} />
              <Bar dataKey="tva_deductible" name="TVA déductible" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Historique en accordéon */}
      {!loading && data?.historique_12_periodes && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] overflow-hidden">
          <p className="text-sm font-bold text-[#0A0A0A] px-5 py-4 border-b border-[#F5F5F5]">Détail par mois</p>
          {data.historique_12_periodes.map((m, i) => (
            <div key={m.mois} className="border-b border-[#F5F5F5] last:border-0">
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#FAFAFA] transition-colors text-left"
              >
                <span className="text-sm font-semibold text-[#0A0A0A]">{m.mois}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-[#FF6B00]">Nette : {formatEur(m.tva_nette)}</span>
                  <span className="text-xs text-[#3D3D3D]/40">{expanded === i ? '▲' : '▼'}</span>
                </div>
              </button>
              {expanded === i && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 pb-4">
                  <div className="bg-[#F5F5F5] rounded-xl p-3">
                    <p className="text-xs text-[#3D3D3D]/60 mb-1">Collectée</p>
                    <p className="text-sm font-bold">{formatEur(m.tva_collectee)}</p>
                  </div>
                  <div className="bg-[#F5F5F5] rounded-xl p-3">
                    <p className="text-xs text-[#3D3D3D]/60 mb-1">Déductible</p>
                    <p className="text-sm font-bold">{formatEur(m.tva_deductible)}</p>
                  </div>
                  <div className="bg-[#F5F5F5] rounded-xl p-3">
                    <p className="text-xs text-[#3D3D3D]/60 mb-1">Autoliquidée</p>
                    <p className="text-sm font-bold">{formatEur(m.tva_autoliquidee)}</p>
                  </div>
                  <div className="bg-[#FFF0E0] rounded-xl p-3">
                    <p className="text-xs text-[#FF6B00] mb-1">Nette</p>
                    <p className="text-sm font-black text-[#FF6B00]">{formatEur(m.tva_nette)}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
