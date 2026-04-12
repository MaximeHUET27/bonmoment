'use client'

import { useEffect, useState } from 'react'
import { useRegime } from '@/app/admin/comptabilite/layout'

function formatEur(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function Ligne({ label, val, highlight }) {
  return (
    <div className={`flex items-center justify-between py-3 border-b border-[#F5F5F5] last:border-0 ${highlight ? 'font-bold' : ''}`}>
      <span className={`text-sm ${highlight ? 'text-[#FF6B00]' : 'text-[#3D3D3D]'}`}>{label}</span>
      <span className={`text-sm tabular-nums ${highlight ? 'text-[#FF6B00] text-base' : 'text-[#0A0A0A]'}`}>{formatEur(val)}</span>
    </div>
  )
}

export default function DeclarationsPage() {
  const regime = useRegime()
  const [params,      setParams]      = useState(null)
  const [dashboard,   setDashboard]   = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [remuneration, setRemuneration] = useState(0)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/comptabilite/parametres').then(r => r.json()),
      fetch('/api/admin/comptabilite/dashboard').then(r => r.json()),
    ]).then(([p, d]) => {
      setParams(p)
      setDashboard(d)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="animate-pulse bg-gray-200 rounded-2xl h-64" />

  const ca = dashboard?.ca_annee_ht ?? 0
  const charges = (dashboard?.graphique_12mois ?? []).reduce((s, m) => s + m.charges_ht, 0)

  // Micro
  const cotisations = ca * 0.212
  const abattement  = ca * 0.50
  const revenuNet   = ca * 0.50

  // SAS
  const resultat = ca - charges
  const is15 = Math.min(Math.max(resultat, 0), 42500) * 0.15
  const is25 = Math.max(0, resultat - 42500) * 0.25
  const isTotal = is15 + is25
  const chargesSociales = remuneration * 0.45

  async function exporterEC() {
    const headers = ['Intitulé', 'Montant (€)']
    const rows = regime === 'micro'
      ? [
          ['CA annuel', ca.toFixed(2)],
          ['Cotisations URSSAF (21,2%)', cotisations.toFixed(2)],
          ['Abattement IR (50%)', abattement.toFixed(2)],
          ['Revenu net imposable', revenuNet.toFixed(2)],
        ]
      : [
          ['CA annuel', ca.toFixed(2)],
          ['Charges déductibles', charges.toFixed(2)],
          ['Résultat avant IS', resultat.toFixed(2)],
          ['IS estimé (15% + 25%)', isTotal.toFixed(2)],
          ['Rémunération président', remuneration.toFixed(2)],
          ['Charges sociales président (45%)', chargesSociales.toFixed(2)],
        ]
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dossier_EC_${new Date().getFullYear()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Toggle régime */}
      <div className="flex gap-2">
        {['micro', 'sas'].map(r => (
          <button key={r} onClick={() => setRegime(r)}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              regime === r ? 'bg-[#FF6B00] text-white' : 'bg-[#F5F5F5] text-[#3D3D3D] hover:bg-[#FFF0E0] hover:text-[#FF6B00]'
            }`}>
            {r === 'micro' ? 'Micro-entreprise' : 'SAS / Société'}
          </button>
        ))}
      </div>

      {regime === 'micro' ? (
        <div className="flex flex-col gap-5">
          {/* URSSAF */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F0F0F0]">
            <p className="text-sm font-bold text-[#0A0A0A] mb-1">URSSAF — Cotisations sociales</p>
            <p className="text-xs text-[#3D3D3D]/50 mb-4">Taux : 21,2% du CA — BIC Prestations de services</p>
            <Ligne label="CA à déclarer" val={ca} />
            <Ligne label="Taux cotisations" val={null} />
            <div className="flex items-center justify-between py-3 border-b border-[#F5F5F5]">
              <span className="text-sm text-[#3D3D3D]">Taux</span>
              <span className="text-sm font-semibold text-[#0A0A0A]">21,2%</span>
            </div>
            <Ligne label="Montant cotisations estimé" val={cotisations} highlight />
          </div>

          {/* IR */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F0F0F0]">
            <p className="text-sm font-bold text-[#0A0A0A] mb-1">Impôt sur le revenu (IR)</p>
            <p className="text-xs text-[#3D3D3D]/50 mb-4">Abattement forfaitaire 50% — BIC Prestations de services</p>
            <Ligne label="CA annuel" val={ca} />
            <Ligne label="Abattement forfaitaire (50%)" val={abattement} />
            <Ligne label="Revenu net imposable" val={revenuNet} highlight />
            <div className="mt-4 bg-[#FFF0E0] rounded-xl p-3">
              <p className="text-xs text-[#FF6B00] font-semibold">
                → Reporter <strong>{formatEur(revenuNet)}</strong> case <strong>5KP</strong> de la déclaration complémentaire 2042-C-PRO
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Résultat fiscal */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F0F0F0]">
            <p className="text-sm font-bold text-[#0A0A0A] mb-4">Résultat fiscal</p>
            <Ligne label="CA annuel" val={ca} />
            <Ligne label="– Charges déductibles" val={charges} />
            <Ligne label="= Résultat avant IS" val={resultat} highlight />
          </div>

          {/* IS */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F0F0F0]">
            <p className="text-sm font-bold text-[#0A0A0A] mb-4">Impôt sur les Sociétés (IS estimé)</p>
            <Ligne label="15% jusqu'à 42 500€" val={is15} />
            <Ligne label="25% au-delà de 42 500€" val={is25} />
            <Ligne label="Total IS estimé" val={isTotal} highlight />
          </div>

          {/* Charges sociales */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F0F0F0]">
            <p className="text-sm font-bold text-[#0A0A0A] mb-4">Charges sociales président</p>
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm text-[#3D3D3D] whitespace-nowrap">Rémunération annuelle :</label>
              <input type="number" min="0" step="100" value={remuneration}
                onChange={e => setRemuneration(Number(e.target.value))}
                className="border border-[#EBEBEB] rounded-xl px-3 py-2 text-sm w-40" />
              <span className="text-sm text-[#3D3D3D]/60">€</span>
            </div>
            <Ligne label="Estimation charges sociales (45%)" val={chargesSociales} highlight />
          </div>

          {/* Récap liasse */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F0F0F0]">
            <p className="text-sm font-bold text-[#0A0A0A] mb-4">Récap liasse fiscale</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F5F5]">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-bold text-[#3D3D3D]/60 uppercase">Intitulé</th>
                    <th className="text-right px-4 py-2 text-xs font-bold text-[#3D3D3D]/60 uppercase">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'CA annuel', val: ca },
                    { label: 'Charges déductibles', val: charges },
                    { label: 'Résultat avant IS', val: resultat },
                    { label: 'IS estimé', val: isTotal },
                    { label: 'Rémunération président', val: remuneration },
                    { label: 'Charges sociales président', val: chargesSociales },
                  ].map(r => (
                    <tr key={r.label} className="border-t border-[#F5F5F5]">
                      <td className="px-4 py-3 text-[#3D3D3D]">{r.label}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-[#0A0A0A]">{formatEur(r.val)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Export */}
      <button onClick={exporterEC}
        className="bg-[#FF6B00] text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-[#e05f00] transition-colors self-start">
        ↓ Exporter pour l&apos;expert-comptable (CSV)
      </button>
    </div>
  )
}
