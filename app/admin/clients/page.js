'use client'

import { useEffect, useState, useMemo } from 'react'

const BADGE_CONFIG = {
  habitant:            { label: 'Habitant',           emoji: '🏠', color: '#6B7280' },
  bon_habitant:        { label: 'Bon habitant',        emoji: '⭐', color: '#FF6B00' },
  habitant_exemplaire: { label: 'Habitant exemplaire', emoji: '🏆', color: '#CC5500' },
}

function BadgeBadge({ niveau }) {
  const cfg = BADGE_CONFIG[niveau] || BADGE_CONFIG.habitant
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
      style={{ backgroundColor: cfg.color }}>
      {cfg.emoji} {cfg.label}
    </span>
  )
}

export default function AdminClients() {
  const [data,      setData]       = useState([])
  const [loading,   setLoading]    = useState(true)
  const [search,    setSearch]     = useState('')
  const [filtVille, setFiltVille]  = useState('tous')
  const [filtBadge, setFiltBadge]  = useState('tous')
  const [sort,      setSort]       = useState('date_desc')

  useEffect(() => {
    fetch('/api/admin/clients')
      .then(r => r.json())
      .then(d => { setData(d.clients || []); setLoading(false) })
  }, [])

  const villes = useMemo(() => {
    const all = new Set()
    data.forEach(u => (u.villes_abonnees || []).forEach(v => all.add(v)))
    return ['tous', ...all]
  }, [data])

  const filtered = useMemo(() => {
    let rows = [...data]
    if (search)
      rows = rows.filter(u =>
        u.nom?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
      )
    if (filtVille !== 'tous')
      rows = rows.filter(u => (u.villes_abonnees || []).includes(filtVille))
    if (filtBadge !== 'tous')
      rows = rows.filter(u => (u.badge_niveau || 'habitant') === filtBadge)

    rows.sort((a, b) => {
      if (sort === 'date_desc')   return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      if (sort === 'date_asc')    return new Date(a.created_at || 0) - new Date(b.created_at || 0)
      if (sort === 'bons_desc')   return (b.nb_bons_utilises || 0) - (a.nb_bons_utilises || 0)
      if (sort === 'resa_desc')   return (b.nb_reservations  || 0) - (a.nb_reservations  || 0)
      return 0
    })
    return rows
  }, [data, search, filtVille, filtBadge, sort])

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
        <h1 className="text-xl font-black text-[#0A0A0A]">Clients</h1>
        <p className="text-sm text-[#3D3D3D]/60">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</p>
      </div>

      {/* ── Filtres ── */}
      <div className="bg-white rounded-2xl px-4 py-4 shadow-sm flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Rechercher par nom ou email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] border border-[#E0E0E0] rounded-xl px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none"
        />
        <select value={filtVille} onChange={e => setFiltVille(e.target.value)} className="border border-[#E0E0E0] rounded-xl px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none bg-white">
          {villes.map(v => <option key={v} value={v}>{v === 'tous' ? 'Toutes les villes' : v}</option>)}
        </select>
        <select value={filtBadge} onChange={e => setFiltBadge(e.target.value)} className="border border-[#E0E0E0] rounded-xl px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none bg-white">
          <option value="tous">Tous les badges</option>
          <option value="habitant">🏠 Habitant</option>
          <option value="bon_habitant">⭐ Bon habitant</option>
          <option value="habitant_exemplaire">🏆 Habitant exemplaire</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} className="border border-[#E0E0E0] rounded-xl px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none bg-white">
          <option value="date_desc">↓ Date inscription</option>
          <option value="date_asc">↑ Date inscription</option>
          <option value="bons_desc">↓ Bons utilisés</option>
          <option value="resa_desc">↓ Bons réservés</option>
        </select>
      </div>

      {/* ── Table desktop ── */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F5F5] border-b border-[#EBEBEB]">
            <tr>
              {['Client', 'Villes abonnées', 'Badge', 'Réservations', 'Bons utilisés', 'Inscrit le'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-[#3D3D3D]/60">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => {
              const prenom = u.nom?.split(' ')[0] || u.email?.split('@')[0] || '—'
              return (
                <tr key={u.id} className={`border-b border-[#F5F5F5] hover:bg-[#FAFAFA] ${i % 2 === 0 ? '' : 'bg-[#FAFAFA]/50'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#FFF0E0] flex items-center justify-center text-sm font-black text-[#FF6B00] shrink-0">
                          {prenom[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-[#0A0A0A]">{u.nom || prenom}</p>
                        <p className="text-xs text-[#3D3D3D]/50 truncate max-w-[180px]">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {(u.villes_abonnees || []).length > 0
                      ? <span className="text-xs text-[#3D3D3D]">{u.villes_abonnees.join(', ')}</span>
                      : <span className="text-xs text-[#3D3D3D]/30">Aucune</span>
                    }
                  </td>
                  <td className="px-4 py-3"><BadgeBadge niveau={u.badge_niveau} /></td>
                  <td className="px-4 py-3 font-bold text-[#0A0A0A] tabular-nums">{u.nb_reservations}</td>
                  <td className="px-4 py-3 font-bold text-[#22C55E] tabular-nums">{u.nb_bons_utilises}</td>
                  <td className="px-4 py-3 text-xs text-[#3D3D3D]/60 tabular-nums">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center py-10 text-[#3D3D3D]/50 text-sm">Aucun résultat.</p>}
      </div>

      {/* ── Cards mobile ── */}
      <div className="md:hidden flex flex-col gap-3">
        {filtered.map(u => {
          const prenom = u.nom?.split(' ')[0] || u.email?.split('@')[0] || '—'
          return (
            <div key={u.id} className="bg-white rounded-2xl px-4 py-4 shadow-sm flex items-center gap-3">
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#FFF0E0] flex items-center justify-center text-lg font-black text-[#FF6B00] shrink-0">
                  {prenom[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#0A0A0A] truncate">{u.nom || prenom}</p>
                <p className="text-xs text-[#3D3D3D]/50 truncate">{u.email}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <BadgeBadge niveau={u.badge_niveau} />
                  <span className="text-[10px] text-[#3D3D3D]/50">
                    {u.nb_reservations} résa · {u.nb_bons_utilises} utilisés
                  </span>
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && <p className="text-center py-10 text-[#3D3D3D]/50 text-sm">Aucun résultat.</p>}
      </div>
    </div>
  )
}
