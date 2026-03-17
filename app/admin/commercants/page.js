'use client'

import { useEffect, useState, useMemo } from 'react'

const PALIER_LABEL = { decouverte: 'Découverte', essentiel: 'Essentiel', pro: 'Pro' }
const PALIER_COLOR = { decouverte: '#3D3D3D', essentiel: '#FF6B00', pro: '#CC5500' }
const PALIER_PRIX  = { decouverte: '29€', essentiel: '49€', pro: '79€' }

function BadgePalier({ palier }) {
  const label = PALIER_LABEL[palier] || palier || '—'
  const color = PALIER_COLOR[palier] || '#9CA3AF'
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>
      {label}
    </span>
  )
}

export default function AdminCommercants() {
  const [data,      setData]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [filtVille, setFiltVille] = useState('tous')
  const [filtStatut,setFiltStatut]= useState('tous')
  const [filtPalier,setFiltPalier]= useState('tous')
  const [sort,      setSort]      = useState('date_desc')
  const [confirm,   setConfirm]   = useState(null)  // { id, nom, action }
  const [toggling,  setToggling]  = useState(null)

  useEffect(() => {
    fetch('/api/admin/commercants')
      .then(r => r.json())
      .then(d => { setData(d.commercants || []); setLoading(false) })
  }, [])

  /* ── Options villes ── */
  const villes = useMemo(() =>
    ['tous', ...new Set(data.map(c => c.ville).filter(Boolean))],
    [data]
  )

  /* ── Filtrage + tri ── */
  const filtered = useMemo(() => {
    let rows = [...data]
    if (search)       rows = rows.filter(c => c.nom?.toLowerCase().includes(search.toLowerCase()))
    if (filtVille  !== 'tous') rows = rows.filter(c => c.ville === filtVille)
    if (filtStatut !== 'tous') rows = rows.filter(c =>
      filtStatut === 'actif' ? c.abonnement_actif : !c.abonnement_actif
    )
    if (filtPalier !== 'tous') rows = rows.filter(c => (c.palier || 'decouverte') === filtPalier)

    rows.sort((a, b) => {
      if (sort === 'date_desc')   return new Date(b.created_at) - new Date(a.created_at)
      if (sort === 'date_asc')    return new Date(a.created_at) - new Date(b.created_at)
      if (sort === 'offres_desc') return (b.nb_offres || 0) - (a.nb_offres || 0)
      if (sort === 'bons_desc')   return (b.nb_bons_utilises || 0) - (a.nb_bons_utilises || 0)
      return 0
    })
    return rows
  }, [data, search, filtVille, filtStatut, filtPalier, sort])

  async function toggleCommerce(id, action) {
    setToggling(id)
    await fetch('/api/admin/commercants', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, action }),
    })
    setData(prev => prev.map(c =>
      c.id === id ? { ...c, abonnement_actif: action === 'activate' } : c
    ))
    setToggling(null)
    setConfirm(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="w-8 h-8 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-[#0A0A0A]">Commerçants</h1>
          <p className="text-sm text-[#3D3D3D]/60">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* ── Filtres ── */}
      <div className="bg-white rounded-2xl px-4 py-4 shadow-sm flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Rechercher par nom…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[160px] border border-[#E0E0E0] rounded-xl px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none"
        />
        <select value={filtVille}   onChange={e => setFiltVille(e.target.value)}   className="border border-[#E0E0E0] rounded-xl px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none bg-white">
          {villes.map(v => <option key={v} value={v}>{v === 'tous' ? 'Toutes les villes' : v}</option>)}
        </select>
        <select value={filtStatut}  onChange={e => setFiltStatut(e.target.value)}  className="border border-[#E0E0E0] rounded-xl px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none bg-white">
          <option value="tous">Tous statuts</option>
          <option value="actif">Actifs ✅</option>
          <option value="inactif">Inactifs ❌</option>
        </select>
        <select value={filtPalier}  onChange={e => setFiltPalier(e.target.value)}  className="border border-[#E0E0E0] rounded-xl px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none bg-white">
          <option value="tous">Tous paliers</option>
          <option value="decouverte">Découverte</option>
          <option value="essentiel">Essentiel</option>
          <option value="pro">Pro</option>
        </select>
        <select value={sort}        onChange={e => setSort(e.target.value)}         className="border border-[#E0E0E0] rounded-xl px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none bg-white">
          <option value="date_desc">↓ Date inscription</option>
          <option value="date_asc">↑ Date inscription</option>
          <option value="offres_desc">↓ Nb offres</option>
          <option value="bons_desc">↓ Bons utilisés</option>
        </select>
      </div>

      {/* ── Table desktop / Cards mobile ── */}

      {/* Desktop */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F5F5] border-b border-[#EBEBEB]">
            <tr>
              {['Commerce', 'Ville', 'Catégorie', 'Palier', 'Statut', 'Offres', 'Bons utilisés', 'Inscrit le', 'Action'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-[#3D3D3D]/60">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={c.id} className={`border-b border-[#F5F5F5] hover:bg-[#FAFAFA] transition-colors ${i % 2 === 0 ? '' : 'bg-[#FAFAFA]/50'}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {c.photo_url ? (
                      <img src={c.photo_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#FFF0E0] flex items-center justify-center text-sm shrink-0">🏪</div>
                    )}
                    <a href={`/commercant/${c.id}`} target="_blank" className="font-bold text-[#0A0A0A] hover:text-[#FF6B00] transition-colors">
                      {c.nom}
                    </a>
                  </div>
                </td>
                <td className="px-4 py-3 text-[#3D3D3D]">{c.ville || '—'}</td>
                <td className="px-4 py-3 text-[#3D3D3D]">{c.categorie || '—'}</td>
                <td className="px-4 py-3">
                  <BadgePalier palier={c.palier} />
                  <span className="text-[10px] text-[#3D3D3D]/40 ml-1">{PALIER_PRIX[c.palier || 'decouverte']}/mois</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-base ${c.abonnement_actif ? '' : 'opacity-40'}`}>
                    {c.abonnement_actif ? '✅' : '❌'}
                  </span>
                </td>
                <td className="px-4 py-3 font-bold text-[#0A0A0A] tabular-nums">{c.nb_offres}</td>
                <td className="px-4 py-3 font-bold text-[#22C55E] tabular-nums">{c.nb_bons_utilises}</td>
                <td className="px-4 py-3 text-[#3D3D3D]/60 text-xs tabular-nums">
                  {c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td className="px-4 py-3">
                  <ActionBtn commerce={c} onConfirm={setConfirm} toggling={toggling} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center py-10 text-[#3D3D3D]/50 text-sm">Aucun résultat.</p>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {filtered.map(c => (
          <div key={c.id} className="bg-white rounded-2xl px-4 py-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {c.photo_url ? (
                  <img src={c.photo_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#FFF0E0] flex items-center justify-center text-lg shrink-0">🏪</div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-[#0A0A0A] truncate">{c.nom}</p>
                  <p className="text-xs text-[#3D3D3D]/60">{c.ville}{c.categorie ? ` · ${c.categorie}` : ''}</p>
                </div>
              </div>
              <span className={`text-lg shrink-0 ${c.abonnement_actif ? '' : 'opacity-40'}`}>
                {c.abonnement_actif ? '✅' : '❌'}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <BadgePalier palier={c.palier} />
              <span className="text-xs text-[#3D3D3D]/60">{c.nb_offres} offres · {c.nb_bons_utilises} bons</span>
              <span className="text-xs text-[#3D3D3D]/40">
                {c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : ''}
              </span>
            </div>
            <ActionBtn commerce={c} onConfirm={setConfirm} toggling={toggling} />
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center py-10 text-[#3D3D3D]/50 text-sm">Aucun résultat.</p>
        )}
      </div>

      {/* ── Modal de confirmation ── */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl px-6 py-6 max-w-sm w-full shadow-2xl flex flex-col gap-4">
            <h2 className="text-base font-black text-[#0A0A0A]">
              {confirm.action === 'deactivate'
                ? `Désactiver ${confirm.nom} ?`
                : `Activer ${confirm.nom} ?`}
            </h2>
            {confirm.action === 'deactivate' && (
              <p className="text-sm text-[#3D3D3D]/70">
                Ses offres actives seront annulées. Le compte reste accessible mais invisible.
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 border border-[#E0E0E0] text-sm font-semibold py-2.5 rounded-xl"
              >
                Annuler
              </button>
              <button
                onClick={() => toggleCommerce(confirm.id, confirm.action)}
                disabled={toggling === confirm.id}
                className={`flex-1 text-white text-sm font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center ${
                  confirm.action === 'deactivate'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-[#22C55E] hover:bg-green-600'
                }`}
              >
                {toggling === confirm.id
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : confirm.action === 'deactivate' ? 'Désactiver' : 'Activer'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ActionBtn({ commerce, onConfirm, toggling }) {
  const isToggling = toggling === commerce.id
  if (commerce.abonnement_actif) {
    return (
      <button
        onClick={() => onConfirm({ id: commerce.id, nom: commerce.nom, action: 'deactivate' })}
        disabled={isToggling}
        className="text-xs font-bold text-red-500 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-colors min-h-[36px] disabled:opacity-50"
      >
        {isToggling ? '…' : 'Désactiver'}
      </button>
    )
  }
  return (
    <button
      onClick={() => onConfirm({ id: commerce.id, nom: commerce.nom, action: 'activate' })}
      disabled={isToggling}
      className="text-xs font-bold text-[#22C55E] border border-green-200 hover:bg-green-50 px-3 py-1.5 rounded-xl transition-colors min-h-[36px] disabled:opacity-50"
    >
      {isToggling ? '…' : 'Activer'}
    </button>
  )
}
