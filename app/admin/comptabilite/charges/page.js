'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRegime } from '@/app/admin/comptabilite/layout'

function formatEur(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

const CATEGORIES = ['hebergement','services','materiel','deplacements','marketing','juridique','autres']
const CAT_COLORS = {
  hebergement:  'bg-blue-100   text-blue-700',
  services:     'bg-purple-100 text-purple-700',
  materiel:     'bg-yellow-100 text-yellow-700',
  deplacements: 'bg-green-100  text-green-700',
  marketing:    'bg-pink-100   text-pink-700',
  juridique:    'bg-red-100    text-red-700',
  autres:       'bg-gray-100   text-gray-600',
}
const TVA_TAUX = [20, 10, 5.5, 0]

function now1erMois() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
}
function today() { return new Date().toISOString().split('T')[0] }

const FORM_VIDE = { date: today(), fournisseur: '', description: '', montant_ht: '', taux_tva: 20, categorie: 'services', autoliquidation: false, recurrente: false, periodicite: 'mensuelle' }

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

export default function ChargesPage() {
  const [debut, setDebut] = useState(now1erMois())
  const [fin,   setFin]   = useState(today())
  const [filtreCategorie, setFiltreCategorie] = useState('')
  const [page, setPage]   = useState(1)
  const [data, setData]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState(FORM_VIDE)
  const [editId, setEditId]     = useState(null)
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState('')
  const [fichier, setFichier]   = useState(null)
  const [genLoading, setGenLoading] = useState(false)
  const regime = useRegime()
  const fileRef = useRef()

  const charger = useCallback(async (p = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ debut, fin, page: p, limit: 50 })
    if (filtreCategorie) params.set('categorie', filtreCategorie)
    const res = await fetch(`/api/admin/comptabilite/charges?${params}`)
    const d = await res.json()
    setData(d)
    setPage(p)
    setLoading(false)
  }, [debut, fin, filtreCategorie])

  useEffect(() => { charger(1) }, [charger])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  function ouvrirNouvelle() {
    setForm(FORM_VIDE)
    setEditId(null)
    setFichier(null)
    setModal(true)
  }

  function ouvrirEdition(charge) {
    setForm({
      date: charge.date,
      fournisseur: charge.fournisseur,
      description: charge.description || '',
      montant_ht: charge.montant_ht,
      taux_tva: charge.taux_tva,
      categorie: charge.categorie,
      autoliquidation: charge.autoliquidation,
      recurrente: charge.recurrente,
      periodicite: charge.periodicite || 'mensuelle',
    })
    setEditId(charge.id)
    setFichier(null)
    setModal(true)
  }

  async function soumettre(e) {
    e.preventDefault()
    setSaving(true)
    try {
      let chargeId = editId
      if (editId) {
        const res = await fetch(`/api/admin/comptabilite/charges?id=${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const d = await res.json()
        if (d.error) throw new Error(d.error)
      } else {
        const res = await fetch('/api/admin/comptabilite/charges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const d = await res.json()
        if (d.error) throw new Error(d.error)
        chargeId = d.id
      }

      // Upload justificatif si présent
      if (fichier && chargeId) {
        const fd = new FormData()
        fd.append('file', fichier)
        fd.append('charge_id', chargeId)
        const upRes = await fetch('/api/admin/comptabilite/charges/upload', { method: 'POST', body: fd })
        const upData = await upRes.json()
        if (upData.url) {
          await fetch(`/api/admin/comptabilite/charges?id=${chargeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ justificatif_url: upData.url }),
          })
        }
      }

      setModal(false)
      showToast(editId ? '✓ Charge modifiée' : '✓ Charge ajoutée')
      charger(1)
    } catch (err) {
      showToast(`Erreur : ${err.message}`)
    }
    setSaving(false)
  }

  async function supprimer(id) {
    if (!confirm('Supprimer cette charge ?')) return
    const res = await fetch(`/api/admin/comptabilite/charges?id=${id}`, { method: 'DELETE' })
    const d = await res.json()
    if (d.error) { showToast(`Erreur : ${d.error}`); return }
    showToast('✓ Charge supprimée')
    charger(page)
  }

  async function genererRecurrentes() {
    setGenLoading(true)
    const res = await fetch('/api/admin/comptabilite/charges?recurrente=true&limit=100')
    const d = await res.json()
    const recurrentes = d.data ?? []
    const aujourd = today()
    let crees = 0
    for (const c of recurrentes) {
      const newDate = now1erMois()
      const postRes = await fetch('/api/admin/comptabilite/charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newDate,
          fournisseur: c.fournisseur,
          description: c.description,
          montant_ht: c.montant_ht,
          taux_tva: c.taux_tva,
          categorie: c.categorie,
          autoliquidation: c.autoliquidation,
          recurrente: false,
        }),
      })
      const pd = await postRes.json()
      if (!pd.error) crees++
    }
    showToast(`✓ ${crees} charge(s) récurrente(s) générée(s) pour ce mois`)
    setGenLoading(false)
    charger(1)
  }

  const totalPages = data ? Math.ceil((data.total_count || 0) / 50) : 1

  return (
    <div className="flex flex-col gap-5">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[#0A0A0A] text-white px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl">
          {toast}
        </div>
      )}

      {/* Filtres + Actions */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F0F0F0] flex flex-wrap gap-3 items-center">
        <input type="date" value={debut} onChange={e => setDebut(e.target.value)}
          className="border border-[#EBEBEB] rounded-xl px-3 py-2 text-sm" />
        <input type="date" value={fin} onChange={e => setFin(e.target.value)}
          className="border border-[#EBEBEB] rounded-xl px-3 py-2 text-sm" />
        <select value={filtreCategorie} onChange={e => setFiltreCategorie(e.target.value)}
          className="border border-[#EBEBEB] rounded-xl px-3 py-2 text-sm text-[#3D3D3D]">
          <option value="">Toutes catégories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => charger(1)}
          className="bg-[#FF6B00] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#e05f00] transition-colors">
          Filtrer
        </button>
        <div className="ml-auto flex flex-wrap gap-2">
          <button onClick={() => telecharger('charges_csv', debut, fin)}
            className="bg-[#F5F5F5] text-[#3D3D3D] px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[#EBEBEB] transition-colors">
            ↓ CSV
          </button>
          <button onClick={() => telecharger('charges_pdf', debut, fin)}
            className="bg-[#F5F5F5] text-[#3D3D3D] px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[#EBEBEB] transition-colors">
            ↓ PDF
          </button>
          <button onClick={genererRecurrentes} disabled={genLoading}
            className="bg-[#F5F5F5] text-[#3D3D3D] px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[#EBEBEB] transition-colors disabled:opacity-50">
            {genLoading ? '...' : '↻ Récurrentes du mois'}
          </button>
          <button onClick={ouvrirNouvelle}
            className="bg-[#FF6B00] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#e05f00] transition-colors">
            + Ajouter
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
                  ? ['Date','Fournisseur','Description','Catégorie','Montant','Justif.','']
                  : ['Date','Fournisseur','Description','Catégorie','HT','TVA','TTC','Justif.','']
                ).map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-xs font-bold text-[#3D3D3D]/60 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-t border-[#F5F5F5]">
                    {[...Array(regime === 'micro' ? 7 : 9)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="animate-pulse bg-gray-200 rounded h-4" /></td>
                    ))}
                  </tr>
                ))
              ) : (data?.data ?? []).length === 0 ? (
                <tr><td colSpan={regime === 'micro' ? 7 : 9} className="text-center py-12 text-[#3D3D3D]/40 text-sm">Aucune charge sur cette période</td></tr>
              ) : (
                (data?.data ?? []).map(c => (
                  <tr key={c.id} className="border-t border-[#F5F5F5] hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-[#3D3D3D]">{c.date}</td>
                    <td className="px-4 py-3 font-medium text-[#0A0A0A] max-w-[140px] truncate">{c.fournisseur}</td>
                    <td className="px-4 py-3 text-[#3D3D3D]/60 text-xs max-w-[160px] truncate">{c.description || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${CAT_COLORS[c.categorie] || 'bg-gray-100 text-gray-600'}`}>
                        {c.categorie}
                      </span>
                    </td>
                    {regime === 'micro' ? (
                      <td className="px-4 py-3 text-right font-mono text-sm font-semibold">{formatEur(c.montant_ttc)}</td>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-right font-mono text-sm">{formatEur(c.montant_ht)}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-[#3D3D3D]/60">{formatEur(c.montant_tva)}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-semibold">{formatEur(c.montant_ttc)}</td>
                      </>
                    )}
                    <td className="px-4 py-3 text-center">
                      {c.justificatif_url
                        ? <a href={c.justificatif_url} target="_blank" rel="noopener noreferrer" className="text-[#FF6B00] hover:underline text-xs">📎</a>
                        : <span className="text-[#3D3D3D]/20 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => ouvrirEdition(c)} aria-label="Modifier"
                          className="p-1.5 rounded-lg text-[#3D3D3D]/40 hover:text-[#FF6B00] hover:bg-[#FFF0E0] transition-colors text-xs">
                          ✏️
                        </button>
                        <button onClick={() => supprimer(c.id)} aria-label="Supprimer"
                          className="p-1.5 rounded-lg text-[#3D3D3D]/40 hover:text-red-500 hover:bg-red-50 transition-colors text-xs">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Totaux par catégorie */}
        {!loading && (data?.totaux_par_categorie ?? []).length > 0 && (
          <div className="border-t border-[#F5F5F5] p-4">
            <p className="text-xs font-bold text-[#3D3D3D]/60 uppercase tracking-wide mb-3">Totaux par catégorie</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {data.totaux_par_categorie.map(t => (
                <div key={t.categorie} className="bg-[#F5F5F5] rounded-xl px-3 py-2">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${CAT_COLORS[t.categorie] || ''}`}>{t.categorie}</span>
                  <p className="text-sm font-black text-[#0A0A0A] mt-1">{formatEur(regime === 'micro' ? t.total_ttc ?? t.total_ht : t.total_ht)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button disabled={page <= 1} onClick={() => charger(page - 1)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#F5F5F5] text-[#3D3D3D] disabled:opacity-40">
            ← Précédent
          </button>
          <span className="text-sm text-[#3D3D3D]/60">Page {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => charger(page + 1)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#F5F5F5] text-[#3D3D3D] disabled:opacity-40">
            Suivant →
          </button>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-black text-[#0A0A0A] mb-5">
                {editId ? 'Modifier la charge' : 'Nouvelle charge'}
              </h2>
              <form onSubmit={soumettre} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#3D3D3D]/60">Date *</label>
                    <input type="date" required value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      className="border border-[#EBEBEB] rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#3D3D3D]/60">{regime === 'micro' ? 'Montant (€) *' : 'Montant HT (€) *'}</label>
                    <input type="number" step="0.01" min="0.01" required value={form.montant_ht}
                      onChange={e => setForm(f => ({ ...f, montant_ht: e.target.value }))}
                      className="border border-[#EBEBEB] rounded-xl px-3 py-2 text-sm" />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#3D3D3D]/60">Fournisseur *</label>
                  <input type="text" required value={form.fournisseur}
                    onChange={e => setForm(f => ({ ...f, fournisseur: e.target.value }))}
                    className="border border-[#EBEBEB] rounded-xl px-3 py-2 text-sm" />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#3D3D3D]/60">Description</label>
                  <input type="text" value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="border border-[#EBEBEB] rounded-xl px-3 py-2 text-sm" />
                </div>

                <div className={`grid gap-4 ${regime === 'sas' ? 'grid-cols-2' : ''}`}>
                  {regime === 'sas' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[#3D3D3D]/60">Taux TVA</label>
                      <select value={form.taux_tva} onChange={e => setForm(f => ({ ...f, taux_tva: Number(e.target.value) }))}
                        className="border border-[#EBEBEB] rounded-xl px-3 py-2 text-sm">
                        {TVA_TAUX.map(t => <option key={t} value={t}>{t}%</option>)}
                      </select>
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#3D3D3D]/60">Catégorie *</label>
                    <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
                      className="border border-[#EBEBEB] rounded-xl px-3 py-2 text-sm">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {regime === 'sas' && (
                  <>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="autoliq" checked={form.autoliquidation}
                        onChange={e => setForm(f => ({ ...f, autoliquidation: e.target.checked }))}
                        className="w-4 h-4 accent-[#FF6B00]" />
                      <label htmlFor="autoliq" className="text-sm text-[#3D3D3D]">Autoliquidation TVA</label>
                    </div>
                    {form.autoliquidation && (
                      <p className="text-xs text-[#FF6B00] bg-[#FFF0E0] rounded-xl px-3 py-2">
                        TVA intracommunautaire : sera déclarée en collectée + déductible (impact nul).
                      </p>
                    )}
                  </>
                )}

                <div className="flex items-center gap-3">
                  <input type="checkbox" id="recurrente" checked={form.recurrente}
                    onChange={e => setForm(f => ({ ...f, recurrente: e.target.checked }))}
                    className="w-4 h-4 accent-[#FF6B00]" />
                  <label htmlFor="recurrente" className="text-sm text-[#3D3D3D]">Charge récurrente</label>
                  {form.recurrente && (
                    <select value={form.periodicite} onChange={e => setForm(f => ({ ...f, periodicite: e.target.value }))}
                      className="border border-[#EBEBEB] rounded-xl px-2 py-1 text-xs ml-2">
                      <option value="mensuelle">Mensuelle</option>
                    </select>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#3D3D3D]/60">Justificatif (PDF, JPG, PNG — max 5MB)</label>
                  <input type="file" ref={fileRef} accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => setFichier(e.target.files[0] || null)}
                    className="text-sm text-[#3D3D3D]" />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#F5F5F5] text-[#3D3D3D] hover:bg-[#EBEBEB] transition-colors">
                    Annuler
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#FF6B00] text-white hover:bg-[#e05f00] transition-colors disabled:opacity-60">
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
