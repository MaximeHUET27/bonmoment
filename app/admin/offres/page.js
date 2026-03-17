'use client'

import { useEffect, useState, useMemo } from 'react'

const TYPE_CONFIG = {
  pourcentage:    { label: '%',       bg: '#EFF6FF', text: '#1D4ED8' },
  montant_fixe:   { label: '€',       bg: '#F0FDF4', text: '#15803D' },
  cadeau:         { label: '🎁',      bg: '#FFF7ED', text: '#C2410C' },
  produit_offert: { label: '📦',      bg: '#F5F3FF', text: '#7C3AED' },
  service_offert: { label: '✂️',      bg: '#FDF4FF', text: '#A21CAF' },
  concours:       { label: '🎰',      bg: '#0A0A0A', text: '#FFFFFF' },
  atelier:        { label: '🎨',      bg: '#FFF1F2', text: '#BE123C' },
}

const STATUT_CONFIG = {
  active:   { label: 'Active',   dot: '#22C55E' },
  expiree:  { label: 'Expirée',  dot: '#EF4444' },
  annulee:  { label: 'Annulée',  dot: '#6B7280' },
}

function BadgeType({ type, valeur }) {
  const cfg = TYPE_CONFIG[type] || { label: type, bg: '#F5F5F5', text: '#3D3D3D' }
  const label = type === 'pourcentage' ? `${valeur}${cfg.label}` :
                type === 'montant_fixe' ? `${valeur}${cfg.label}` : cfg.label
  return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.text }}>
      {label}
    </span>
  )
}

function StatutDot({ statut }) {
  const cfg = STATUT_CONFIG[statut] || { label: statut, dot: '#9CA3AF' }
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: cfg.dot }}>
      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

function fmt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function AdminOffres() {
  const [data,       setData]      = useState([])
  const [loading,    setLoading]   = useState(true)
  const [search,     setSearch]    = useState('')
  const [filtVille,  setFiltVille] = useState('tous')
  const [filtStatut, setFiltStatut]= useState('tous')
  const [filtType,   setFiltType]  = useState('tous')
  const [filtCommerce,setFiltCommerce] = useState('tous')
  const [sort,       setSort]      = useState('date_desc')

  useEffect(() => {
    fetch('/api/admin/offres')
      .then(r => r.json())
      .then(d => { setData(d.offres || []); setLoading(false) })
  }, [])

  const villes    = useMemo(() => ['tous', ...new Set(data.map(o => o.commerces?.ville).filter(Boolean))], [data])
  const commerces = useMemo(() => {
    const map = {}
    data.forEach(o => { if (o.commerces?.id) map[o.commerces.id] = o.commerces.nom })
    return [{ id: 'tous', nom: 'Tous les commerces' }, ...Object.entries(map).map(([id, nom]) => ({ id, nom }))]
  }, [data])

  const filtered = useMemo(() => {
    let rows = [...data]
    if (search)
      rows = rows.filter(o =>
        o.titre?.toLowerCase().includes(search.toLowerCase()) ||
        o.commerces?.nom?.toLowerCase().includes(search.toLowerCase())
      )
    if (filtVille    !== 'tous') rows = rows.filter(o => o.commerces?.ville === filtVille)
    if (filtStatut   !== 'tous') rows = rows.filter(o => o.statut === filtStatut)
    if (filtType     !== 'tous') rows = rows.filter(o => o.type_remise === filtType)
    if (filtCommerce !== 'tous') rows = rows.filter(o => o.commerces?.id === filtCommerce)

    rows.sort((a, b) => {
      if (sort === 'date_desc')   return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      if (sort === 'date_asc')    return new Date(a.created_at || 0) - new Date(b.created_at || 0)
      if (sort === 'bons_desc')   return (b.nb_bons_utilises || 0) - (a.nb_bons_utilises || 0)
      if (sort === 'resa_desc')   return (b.nb_reservations  || 0) - (a.nb_reservations  || 0)
      return 0
    })
    return rows
  }, [data, search, filtVille, filtStatut, filtType, filtCommerce, sort])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="w-8 h-8 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-black text-[#0A0A0A]">Offres</h1>
        <p className="text-sm text-[#3D3D3D]/60">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</p>
      </div>

      {/* ── Filtres ── */}
      <div className="bg-white rounded-2xl px-4 py-4 shadow-sm flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Titre ou commerce…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[160px] border border-[#E0E0E0] rounded-xl px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none"
        />
        <select value={filtVille}   onChange={e => setFiltVille(e.target.value)}   className="border border-[#E0E0E0] rounded-xl px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none bg-white">
          {villes.map(v => <option key={v} value={v}>{v === 'tous' ? 'Toutes les villes' : v}</option>)}
        </select>
        <select value={filtStatut}  onChange={e => setFiltStatut(e.target.value)}  className="border border-[#E0E0E0] rounded-xl px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none bg-white">
          <option value="tous">Tous statuts</option>
          <option value="active">🟢 Actives</option>
          <option value="expiree">🔴 Expirées</option>
          <option value="annulee">⚫ Annulées</option>
        </select>
        <select value={filtType}    onChange={e => setFiltType(e.target.value)}    className="border border-[#E0E0E0] rounded-xl px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none bg-white">
          <option value="tous">Tous types</option>
          {Object.keys(TYPE_CONFIG).map(t => (
            <option key={t} value={t}>{TYPE_CONFIG[t].label} {t}</option>
          ))}
        </select>
        <select value={filtCommerce} onChange={e => setFiltCommerce(e.target.value)} className="border border-[#E0E0E0] rounded-xl px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none bg-white max-w-[180px]">
          {commerces.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <select value={sort}        onChange={e => setSort(e.target.value)}         className="border border-[#E0E0E0] rounded-xl px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none bg-white">
          <option value="date_desc">↓ Date création</option>
          <option value="date_asc">↑ Date création</option>
          <option value="bons_desc">↓ Bons utilisés</option>
          <option value="resa_desc">↓ Réservations</option>
        </select>
      </div>

      {/* ── Table desktop ── */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-[#F5F5F5] border-b border-[#EBEBEB]">
            <tr>
              {['Commerce', 'Titre', 'Type', 'Ville', 'Début → Fin', 'Statut', 'Réservés / Total', 'Utilisés'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-[#3D3D3D]/60 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o, i) => (
              <tr key={o.id} className={`border-b border-[#F5F5F5] hover:bg-[#FAFAFA] ${i % 2 === 0 ? '' : 'bg-[#FAFAFA]/50'}`}>
                <td className="px-4 py-3 font-bold text-[#0A0A0A] whitespace-nowrap">{o.commerces?.nom || '—'}</td>
                <td className="px-4 py-3 max-w-[200px]">
                  <p className="font-semibold text-[#0A0A0A] truncate">{o.titre}</p>
                </td>
                <td className="px-4 py-3"><BadgeType type={o.type_remise} valeur={o.valeur} /></td>
                <td className="px-4 py-3 text-[#3D3D3D]">{o.commerces?.ville || '—'}</td>
                <td className="px-4 py-3 text-xs text-[#3D3D3D]/60 tabular-nums whitespace-nowrap">
                  {fmt(o.date_debut)} →<br/>{fmt(o.date_fin)}
                </td>
                <td className="px-4 py-3"><StatutDot statut={o.statut} /></td>
                <td className="px-4 py-3 text-[#0A0A0A] tabular-nums font-semibold">
                  {o.nb_reservations}
                  {o.nb_bons_total ? ` / ${o.nb_bons_total === 9999 ? '∞' : o.nb_bons_total}` : ' / ∞'}
                </td>
                <td className="px-4 py-3 font-black tabular-nums" style={{ color: o.nb_bons_utilises > 0 ? '#22C55E' : '#9CA3AF' }}>
                  {o.nb_bons_utilises}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center py-10 text-[#3D3D3D]/50 text-sm">Aucun résultat.</p>}
      </div>

      {/* ── Cards mobile ── */}
      <div className="md:hidden flex flex-col gap-3">
        {filtered.map(o => (
          <div key={o.id} className="bg-white rounded-2xl px-4 py-4 shadow-sm flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#FF6B00] truncate">{o.commerces?.nom}</p>
                <p className="font-bold text-[#0A0A0A] truncate">{o.titre}</p>
              </div>
              <StatutDot statut={o.statut} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <BadgeType type={o.type_remise} valeur={o.valeur} />
              {o.commerces?.ville && <span className="text-xs text-[#3D3D3D]/60">📍 {o.commerces.ville}</span>}
            </div>
            <div className="flex items-center gap-4 text-xs text-[#3D3D3D]/60">
              <span>📋 {o.nb_reservations} résa</span>
              <span className="font-bold" style={{ color: o.nb_bons_utilises > 0 ? '#22C55E' : '#9CA3AF' }}>
                ✅ {o.nb_bons_utilises} utilisés
              </span>
              <span>{fmt(o.date_fin)}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center py-10 text-[#3D3D3D]/50 text-sm">Aucun résultat.</p>}
      </div>
    </div>
  )
}
