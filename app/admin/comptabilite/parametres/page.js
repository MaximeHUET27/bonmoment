'use client'

import { useEffect, useState } from 'react'

const FORM_VIDE = {
  regime: 'micro',
  periodicite_tva: 'trimestrielle',
  ec_nom: '', ec_email: '', ec_tel: '',
  siret: '', num_tva: '', date_cloture: '31/12',
  seuil_micro: 77700, seuil_franchise_tva: 36800,
}

export default function ParametresPage() {
  const [form,    setForm]    = useState(FORM_VIDE)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [toast,   setToast]   = useState('')
  const [chargesRecurrentes, setChargesRecurrentes] = useState([])
  const [loadingRec, setLoadingRec] = useState(true)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  useEffect(() => {
    fetch('/api/admin/comptabilite/parametres')
      .then(r => r.json())
      .then(d => {
        if (!d.error) setForm(prev => ({ ...prev, ...d }))
        setLoading(false)
      })

    fetch('/api/admin/comptabilite/charges?recurrente=true&limit=100')
      .then(r => r.json())
      .then(d => {
        setChargesRecurrentes(d.data ?? [])
        setLoadingRec(false)
      })
  }, [])

  async function sauvegarder(e) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/comptabilite/parametres', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    if (d.error) showToast(`Erreur : ${d.error}`)
    else showToast('✓ Paramètres sauvegardés')
    setSaving(false)
  }

  async function supprimerRecurrente(id) {
    await fetch(`/api/admin/comptabilite/charges?id=${id}`, { method: 'DELETE' })
    setChargesRecurrentes(prev => prev.filter(c => c.id !== id))
    showToast('✓ Charge récurrente supprimée')
  }

  function champ(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }))
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[#0A0A0A] text-white px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl">
          {toast}
        </div>
      )}

      {loading ? (
        <div className="animate-pulse bg-gray-200 rounded-2xl h-96" />
      ) : (
        <form onSubmit={sauvegarder} className="flex flex-col gap-5">

          {/* Régime */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F0F0F0]">
            <p className="text-sm font-bold text-[#0A0A0A] mb-4">Régime fiscal</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3D3D3D]/60">Régime</label>
                <select value={form.regime} onChange={champ('regime')}
                  className="border border-[#EBEBEB] rounded-xl px-3 py-2.5 text-sm">
                  <option value="micro">Micro-entreprise</option>
                  <option value="sas">SAS / Société</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3D3D3D]/60">Périodicité TVA</label>
                <select value={form.periodicite_tva} onChange={champ('periodicite_tva')}
                  className="border border-[#EBEBEB] rounded-xl px-3 py-2.5 text-sm">
                  <option value="trimestrielle">Trimestrielle</option>
                  <option value="mensuelle">Mensuelle</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3D3D3D]/60">Date de clôture</label>
                <input type="text" value={form.date_cloture} onChange={champ('date_cloture')} placeholder="31/12"
                  className="border border-[#EBEBEB] rounded-xl px-3 py-2.5 text-sm" />
              </div>
            </div>
          </div>

          {/* Expert-comptable */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F0F0F0]">
            <p className="text-sm font-bold text-[#0A0A0A] mb-4">Expert-comptable</p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3D3D3D]/60">Nom</label>
                <input type="text" value={form.ec_nom || ''} onChange={champ('ec_nom')}
                  className="border border-[#EBEBEB] rounded-xl px-3 py-2.5 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3D3D3D]/60">Email</label>
                <input type="email" value={form.ec_email || ''} onChange={champ('ec_email')}
                  className="border border-[#EBEBEB] rounded-xl px-3 py-2.5 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3D3D3D]/60">Téléphone</label>
                <input type="tel" value={form.ec_tel || ''} onChange={champ('ec_tel')}
                  className="border border-[#EBEBEB] rounded-xl px-3 py-2.5 text-sm" />
              </div>
            </div>
          </div>

          {/* Identifiants légaux */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F0F0F0]">
            <p className="text-sm font-bold text-[#0A0A0A] mb-4">Identifiants légaux</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3D3D3D]/60">SIRET</label>
                <input type="text" value={form.siret || ''} onChange={champ('siret')} placeholder="12345678901234"
                  className="border border-[#EBEBEB] rounded-xl px-3 py-2.5 text-sm font-mono" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3D3D3D]/60">Régime TVA</label>
                <input type="text" value="TVA non applicable, article 293 B du CGI" readOnly
                  className="border border-[#EBEBEB] rounded-xl px-3 py-2.5 text-sm text-[#3D3D3D]/60 bg-[#FAFAFA] cursor-default" />
              </div>
            </div>
          </div>

          {/* Seuils d'alerte */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F0F0F0]">
            <p className="text-sm font-bold text-[#0A0A0A] mb-4">Seuils d&apos;alerte</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3D3D3D]/60">Seuil régime micro (€)</label>
                <input type="number" value={form.seuil_micro} onChange={champ('seuil_micro')}
                  className="border border-[#EBEBEB] rounded-xl px-3 py-2.5 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#3D3D3D]/60">Seuil franchise TVA (€)</label>
                <input type="number" value={form.seuil_franchise_tva} onChange={champ('seuil_franchise_tva')}
                  className="border border-[#EBEBEB] rounded-xl px-3 py-2.5 text-sm" />
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="bg-[#FF6B00] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-[#e05f00] transition-colors disabled:opacity-60 self-start">
            {saving ? 'Sauvegarde...' : 'Enregistrer les paramètres'}
          </button>
        </form>
      )}

      {/* Charges récurrentes */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] overflow-hidden">
        <p className="text-sm font-bold text-[#0A0A0A] px-5 py-4 border-b border-[#F5F5F5]">
          Charges récurrentes configurées
        </p>
        {loadingRec ? (
          <div className="p-5"><div className="animate-pulse bg-gray-200 rounded-xl h-16" /></div>
        ) : chargesRecurrentes.length === 0 ? (
          <p className="text-sm text-[#3D3D3D]/40 text-center py-8">
            Aucune charge récurrente. Créez-en depuis l&apos;onglet Charges.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F5F5]">
                <tr>
                  {['Fournisseur','Catégorie','Montant HT','Périodicité',''].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-xs font-bold text-[#3D3D3D]/60 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chargesRecurrentes.map(c => (
                  <tr key={c.id} className="border-t border-[#F5F5F5]">
                    <td className="px-4 py-3 font-medium text-[#0A0A0A]">{c.fournisseur}</td>
                    <td className="px-4 py-3 text-[#3D3D3D]/70">{c.categorie}</td>
                    <td className="px-4 py-3 font-mono text-sm">{Number(c.montant_ht).toFixed(2)} €</td>
                    <td className="px-4 py-3 text-[#3D3D3D]/60">{c.periodicite || 'mensuelle'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => supprimerRecurrente(c.id)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
