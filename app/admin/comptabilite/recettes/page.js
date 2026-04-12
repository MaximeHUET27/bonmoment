'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRegime } from '@/app/admin/comptabilite/layout'

function formatEur(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

const STATUT_STYLE = {
  payee:      'bg-green-100 text-green-700',
  remboursee: 'bg-red-100 text-red-700',
  echouee:    'bg-gray-100 text-gray-500',
}

function now1erMois() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
}
function today() {
  return new Date().toISOString().split('T')[0]
}

async function telecharger(type, debut, fin) {
  const res = await fetch('/api/admin/comptabilite/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, debut, fin }),
  })
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${type}_${debut}_${fin}.${type.endsWith('csv') ? 'csv' : 'pdf'}`
  a.click()
  URL.revokeObjectURL(url)
}

export default function RecettesPage() {
  const [debut, setDebut] = useState(now1erMois())
  const [fin,   setFin]   = useState(today())
  const [page,  setPage]  = useState(1)
  const [data,  setData]  = useState(null)
  const [loading, setLoading] = useState(true)
  const regime = useRegime()

  const charger = useCallback(async (p = 1) => {
    setLoading(true)
    const res = await fetch(`/api/admin/comptabilite/recettes?debut=${debut}&fin=${fin}&page=${p}&limit=50`)
    const d = await res.json()
    setData(d)
    setPage(p)
    setLoading(false)
  }, [debut, fin])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { charger(1) }, [charger])

  const totalPages = data ? Math.ceil((data.total_count || 0) / 50) : 1

  return (
    <div className="flex flex-col gap-5">

      {/* Filtres */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F0F0F0] flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[#3D3D3D]/60">Du</label>
          <input type="date" value={debut} onChange={e => setDebut(e.target.value)}
            className="border border-[#EBEBEB] rounded-xl px-3 py-2 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[#3D3D3D]/60">Au</label>
          <input type="date" value={fin} onChange={e => setFin(e.target.value)}
            className="border border-[#EBEBEB] rounded-xl px-3 py-2 text-sm" />
        </div>
        <button onClick={() => charger(1)}
          className="bg-[#FF6B00] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#e05f00] transition-colors">
          Filtrer
        </button>
        <div className="ml-auto flex gap-2">
          <button onClick={() => telecharger('recettes_csv', debut, fin)}
            className="bg-[#F5F5F5] text-[#3D3D3D] px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[#EBEBEB] transition-colors">
            ↓ CSV
          </button>
          <button onClick={() => telecharger('recettes_pdf', debut, fin)}
            className="bg-[#F5F5F5] text-[#3D3D3D] px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[#EBEBEB] transition-colors">
            ↓ PDF
          </button>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F5F5]">
              <tr>
                {(regime === 'micro'
                  ? ['Date','N° Facture','Commerce','Montant','Mode paiement','Statut']
                  : ['Date','N° Facture','Commerce','HT','TVA','TTC','Statut']
                ).map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-[#3D3D3D]/60 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-t border-[#F5F5F5]">
                    {[...Array(regime === 'micro' ? 6 : 7)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="animate-pulse bg-gray-200 rounded h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (data?.data ?? []).length === 0 ? (
                <tr><td colSpan={regime === 'micro' ? 6 : 7} className="text-center py-12 text-[#3D3D3D]/40 text-sm">Aucune recette sur cette période</td></tr>
              ) : (
                (data?.data ?? []).map(r => (
                  <tr key={r.id} className="border-t border-[#F5F5F5] hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-4 py-3 text-[#3D3D3D] whitespace-nowrap">{r.date}</td>
                    <td className="px-4 py-3 text-[#3D3D3D]/60 text-xs">{r.numero_facture || '—'}</td>
                    <td className="px-4 py-3 font-medium text-[#0A0A0A]">{r.commerce_nom}</td>
                    {regime === 'micro' ? (
                      <>
                        <td className="px-4 py-3 text-right font-mono text-sm font-semibold">{formatEur(r.montant_ttc)}</td>
                        <td className="px-4 py-3 text-[#3D3D3D]/60 text-xs">{r.mode_paiement || '—'}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-right font-mono text-sm">{formatEur(r.montant_ht)}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-[#3D3D3D]/60">{formatEur(r.montant_tva)}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-semibold">{formatEur(r.montant_ttc)}</td>
                      </>
                    )}
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUT_STYLE[r.statut] || 'bg-gray-100 text-gray-500'}`}>
                        {r.statut}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Totaux */}
        {!loading && data?.totaux && (
          <div className="bg-[#FFF0E0] border-t border-[#FF6B00]/20 flex justify-end gap-8 px-4 py-3">
            {regime === 'micro' ? (
              <span className="text-xs font-bold text-[#FF6B00]">Total : <strong>{formatEur(data.totaux.montant_ttc)}</strong></span>
            ) : (
              <>
                <span className="text-xs font-bold text-[#3D3D3D]">Total HT : <strong>{formatEur(data.totaux.montant_ht)}</strong></span>
                <span className="text-xs font-bold text-[#3D3D3D]">TVA : <strong>{formatEur(data.totaux.montant_tva)}</strong></span>
                <span className="text-xs font-bold text-[#FF6B00]">TTC : <strong>{formatEur(data.totaux.montant_ttc)}</strong></span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button disabled={page <= 1} onClick={() => charger(page - 1)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#F5F5F5] text-[#3D3D3D] disabled:opacity-40 hover:bg-[#EBEBEB] transition-colors">
            ← Précédent
          </button>
          <span className="text-sm text-[#3D3D3D]/60">Page {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => charger(page + 1)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#F5F5F5] text-[#3D3D3D] disabled:opacity-40 hover:bg-[#EBEBEB] transition-colors">
            Suivant →
          </button>
        </div>
      )}
    </div>
  )
}
