'use client'

import { useEffect, useState, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useToast } from '@/app/components/Toast'
import { getFullOffreTitle } from '@/lib/offreTitle'

function fmtDate(d)    { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }
function fmtDateTime(d){ return d ? new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—' }
function Sk({ className = 'h-8' }) {
  return <div className={`bg-[#E0E0E0] rounded-xl animate-pulse ${className}`} />
}

const TYPE_LABEL = {
  pourcentage: 'Remise %', montant_fixe: 'Remise €', montant: 'Remise €',
  cadeau: 'Cadeau', produit_offert: 'Offert', service_offert: 'Service',
  concours: 'Concours', atelier: 'Évènement', fidelite: '⭐ Fidélité',
}

const STATUT_STYLE = {
  active:     'bg-green-100 text-green-700',
  programmee: 'bg-blue-100 text-blue-700',
  expiree:    'bg-[#F5F5F5] text-[#3D3D3D]/50',
  annulee:    'bg-red-100 text-red-600',
}

function SlidePanel({ open, onClose, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full sm:w-[640px] bg-white h-full overflow-y-auto shadow-2xl flex flex-col"
        style={{ animation: 'slideInRight 0.25s ease' }}>
        <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
        {children}
      </div>
    </div>
  )
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4">
        <h3 className="text-base font-black text-[#0A0A0A]">{title}</h3>
        {children}
      </div>
    </div>
  )
}

function FicheOffre({ id, onClose, onRefresh }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)
  const [acting,  setActing]  = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const { showToast } = useToast()

  useEffect(() => {
    if (!id) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetch(`/api/admin/offres/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  async function doAction(action) {
    setActing(true)
    const res = await fetch(`/api/admin/offres/${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const d = await res.json()
    setActing(false)
    if (d.success) { showToast('✅ Action effectuée'); setModal(null); onRefresh() }
    else showToast(`⚠️ ${d.error || 'Erreur'}`)
  }

  async function doDelete() {
    if (confirmText !== 'SUPPRIMER') return
    setActing(true)
    const res = await fetch(`/api/admin/offres/${id}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'SUPPRIMER' }),
    })
    const d = await res.json()
    setActing(false)
    if (d.success) { showToast('✅ Offre supprimée'); onClose(); onRefresh() }
    else showToast(`⚠️ ${d.error}`)
  }

  const o = data?.offre
  const c = o?.commerces
  const nbResas    = (data?.resas || []).length
  const nbUtilises = (data?.resas || []).filter(r => r.statut === 'utilisee').length
  const nbReserves = (data?.resas || []).filter(r => r.statut === 'reservee').length

  return (
    <>
      <div className="sticky top-0 bg-white border-b border-[#F0F0F0] px-5 py-4 flex items-center justify-between z-10">
        <div>
          <p className="font-black text-[#0A0A0A] truncate max-w-[420px]">{getFullOffreTitle(o) || '…'}</p>
          <p className="text-xs text-[#3D3D3D]/50">{c?.nom} — {c?.ville}</p>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-[#F5F5F5] flex items-center justify-center text-lg hover:bg-[#E0E0E0]">×</button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3 p-5">{[...Array(5)].map((_, i) => <Sk key={i} />)}</div>
      ) : !o ? (
        <p className="p-5 text-red-500">Erreur de chargement</p>
      ) : (
        <div className="flex flex-col gap-5 p-5">

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {o.statut === 'active' && <>
              <button onClick={() => setModal('annuler')} className="px-3 py-1.5 text-xs font-bold bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100">Annuler l&apos;offre</button>
              <button onClick={() => setModal('expirer')} className="px-3 py-1.5 text-xs font-bold bg-[#F5F5F5] text-[#0A0A0A] border border-[#E0E0E0] rounded-xl hover:bg-[#E8E8E8]">Forcer l&apos;expiration</button>
            </>}
            <button onClick={() => { setConfirmText(''); setModal('delete') }} className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-xl">Supprimer</button>
          </div>

          {/* Stats */}
          <section className="grid grid-cols-4 gap-2">
            {[['Total rés.', nbResas], ['Utilisés', nbUtilises], ['En cours', nbReserves], ['Taux', nbResas > 0 ? Math.round(nbUtilises/nbResas*100)+'%' : '—']].map(([k, v]) => (
              <div key={k} className="bg-white border border-[#F0F0F0] rounded-xl p-3 text-center">
                <p className="text-lg font-black text-[#FF6B00]">{v}</p>
                <p className="text-[9px] text-[#3D3D3D]/50 uppercase tracking-wide">{k}</p>
              </div>
            ))}
          </section>

          {/* Infos offre */}
          <section className="bg-[#F5F5F5] rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6B00] mb-3">Informations</p>
            {[
              ['Type',     TYPE_LABEL[o.type_remise] || o.type_remise],
              ['Valeur',   o.valeur ? o.valeur + (o.type_remise === 'pourcentage' ? ' %' : ' €') : '—'],
              ['Début',    fmtDate(o.date_debut)],
              ['Fin',      fmtDate(o.date_fin)],
              ['Bons',     o.nb_bons_total === 9999 ? '∞' : o.nb_bons_total],
              ['Restants', o.nb_bons_restants === 9999 ? '∞' : o.nb_bons_restants],
              ['Statut',   o.statut],
              ['Commerce', c?.nom],
              ['Adresse',  c?.adresse],
            ].map(([k, v]) => v ? (
              <div key={k} className="flex justify-between py-1 border-b border-[#E8E8E8] last:border-0 text-sm">
                <span className="text-[#3D3D3D]/60">{k}</span>
                <span className="font-semibold text-[#0A0A0A]">{v}</span>
              </div>
            ) : null)}
          </section>

          {/* Timeline */}
          {data.timeline?.length > 0 && (
            <section className="bg-white rounded-2xl p-4 border border-[#F0F0F0]">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6B00] mb-3">Timeline réservations</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={data.timeline}>
                  <XAxis dataKey="heure" tick={{ fontSize: 8 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Bar dataKey="nb" fill="#FF6B00" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>
          )}

          {/* Liste des bons */}
          <section>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6B00] mb-2">Réservations ({nbResas})</p>
            <div className="flex flex-col gap-1">
              {(data.resas || []).slice(0, 20).map(r => (
                <div key={r.id} className="flex items-center justify-between px-3 py-2 bg-[#F5F5F5] rounded-xl text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{r.users?.nom || r.users?.email || '—'}</p>
                    <p className="text-[#3D3D3D]/50">Code: {r.code_validation} — {fmtDateTime(r.created_at)}</p>
                  </div>
                  <div className="text-right ml-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${STATUT_STYLE[r.statut] || ''}`}>{r.statut}</span>
                    {r.utilise_at && <p className="text-[9px] text-[#3D3D3D]/40 mt-0.5">{fmtDate(r.utilise_at)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      )}

      <Modal open={modal === 'annuler'} onClose={() => setModal(null)} title="Annuler l'offre ?">
        <p className="text-sm text-[#3D3D3D]/70">{nbReserves} bons en cours de réservation seront annulés.</p>
        <div className="flex gap-2">
          <button onClick={() => setModal(null)} className="flex-1 border border-[#E0E0E0] py-2.5 rounded-xl text-sm font-semibold">Non</button>
          <button onClick={() => doAction('annuler')} disabled={acting} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-60">{acting ? '…' : 'Annuler l\'offre'}</button>
        </div>
      </Modal>

      <Modal open={modal === 'expirer'} onClose={() => setModal(null)} title="Forcer l&apos;expiration ?">
        <p className="text-sm text-[#3D3D3D]/70">L&apos;offre sera marquée expirée immédiatement. Les réservations en cours passeront en expiré.</p>
        <div className="flex gap-2">
          <button onClick={() => setModal(null)} className="flex-1 border border-[#E0E0E0] py-2.5 rounded-xl text-sm font-semibold">Annuler</button>
          <button onClick={() => doAction('expirer')} disabled={acting} className="flex-1 bg-[#0A0A0A] text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-60">{acting ? '…' : 'Expirer'}</button>
        </div>
      </Modal>

      <Modal open={modal === 'delete'} onClose={() => setModal(null)} title="Supprimer définitivement ?">
        <p className="text-sm text-red-600 font-semibold">Toutes les réservations liées seront supprimées.</p>
        <p className="text-sm text-[#3D3D3D]/70">Tapez <strong>SUPPRIMER</strong> pour confirmer :</p>
        <input value={confirmText} onChange={e => setConfirmText(e.target.value)}
          className="w-full border-2 border-red-200 rounded-xl px-3 py-2.5 text-sm focus:border-red-500 focus:outline-none font-mono" />
        <div className="flex gap-2">
          <button onClick={() => setModal(null)} className="flex-1 border border-[#E0E0E0] py-2.5 rounded-xl text-sm font-semibold">Annuler</button>
          <button onClick={doDelete} disabled={acting || confirmText !== 'SUPPRIMER'}
            className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-40">{acting ? '…' : 'Supprimer'}</button>
        </div>
      </Modal>
    </>
  )
}

export default function AdminOffres() {
  const [rows,     setRows]     = useState([])
  const [total,    setTotal]    = useState(0)
  const [stats,    setStats]    = useState(null)
  const [page,     setPage]     = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [statut,   setStatut]   = useState('')
  const [type,     setType]     = useState('')
  const [selected, setSelected] = useState(null)
  const debounceRef = useRef(null)

  function load(p = 0, s = search, st = statut, ty = type) {
    setLoading(true)
    const q = new URLSearchParams({ page: p, ...(s && { search: s }), ...(st && { statut: st }), ...(ty && { type: ty }) })
    fetch(`/api/admin/offres?${q}`)
      .then(r => r.json())
      .then(d => { setRows(d.offres || []); setTotal(d.total || 0); setStats(d.stats || null); setLoading(false) })
      .catch(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { load(0) }, [])

  function handleSearch(v) {
    setSearch(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setPage(0); load(0, v) }, 300)
  }

  const totalPages = Math.ceil(total / 50)

  return (
    <div className="flex flex-col gap-5">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-[#0A0A0A]">Offres</h1>
        <span className="text-sm text-[#3D3D3D]/50">{total} total</span>
      </div>

      {/* Mini stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ['🟢 Actives', stats.nb_actives],
            ['📅 Ce mois', stats.nb_mois],
            ['📋 Moy. rés./offre', stats.avg_resa],
            ['✅ Taux util.', stats.taux_util + ' %'],
          ].map(([k, v]) => (
            <div key={k} className="bg-white rounded-2xl px-4 py-3 border border-[#F0F0F0] shadow-sm">
              <p className="text-xl font-black text-[#FF6B00] tabular-nums">{v}</p>
              <p className="text-[10px] text-[#3D3D3D]/50 uppercase tracking-wide mt-0.5">{k}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Rechercher titre ou commerce…"
          className="flex-1 min-w-[200px] border-2 border-[#E0E0E0] rounded-xl px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none" />
        <select value={statut} onChange={e => { setStatut(e.target.value); setPage(0); load(0, search, e.target.value, type) }}
          className="border-2 border-[#E0E0E0] rounded-xl px-3 py-2 text-sm bg-white focus:border-[#FF6B00] focus:outline-none">
          <option value="">Tous statuts</option>
          {['active', 'programmee', 'expiree', 'annulee'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={type} onChange={e => { setType(e.target.value); setPage(0); load(0, search, statut, e.target.value) }}
          className="border-2 border-[#E0E0E0] rounded-xl px-3 py-2 text-sm bg-white focus:border-[#FF6B00] focus:outline-none">
          <option value="">Tous types</option>
          {Object.entries(TYPE_LABEL).filter(([k], i, a) => a.findIndex(([, v]) => v === TYPE_LABEL[k]) === i).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead className="border-b border-[#F0F0F0]">
            <tr className="text-[10px] uppercase tracking-wide text-[#3D3D3D]/50">
              {['Titre', 'Commerce', 'Ville', 'Type', 'Dates', 'Statut', 'Total', 'Rés.', 'Util.', 'Taux'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? [...Array(8)].map((_, i) => (
              <tr key={i}><td colSpan={10} className="px-4 py-2"><Sk /></td></tr>
            )) : rows.map(o => (
              <tr key={o.id} onClick={() => setSelected(o.id)}
                className="border-t border-[#F5F5F5] hover:bg-[#FFF8F3] cursor-pointer transition-colors">
                <td className="px-4 py-3 max-w-[180px]">
                  <p className="font-semibold text-[#0A0A0A] truncate">{getFullOffreTitle(o)}</p>
                </td>
                <td className="px-4 py-3 text-xs text-[#3D3D3D]/70 max-w-[120px] truncate">{o.commerces?.nom}</td>
                <td className="px-4 py-3 text-xs text-[#3D3D3D]/50">{o.commerces?.ville}</td>
                <td className="px-4 py-3 text-xs">{TYPE_LABEL[o.type_remise] || o.type_remise}</td>
                <td className="px-4 py-3 text-[10px] text-[#3D3D3D]/60">
                  {fmtDate(o.date_debut)}<br/>{fmtDate(o.date_fin)}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUT_STYLE[o.statut] || ''}`}>{o.statut}</span>
                </td>
                <td className="px-4 py-3 text-center font-semibold text-[#3D3D3D]/70">
                  {o.nb_bons_total === 9999 ? '∞' : o.nb_bons_total}
                </td>
                <td className="px-4 py-3 text-center font-semibold">{o.nb_reservations}</td>
                <td className="px-4 py-3 text-center font-semibold text-green-600">{o.nb_bons_utilises}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    o.taux >= 70 ? 'bg-green-100 text-green-700' :
                    o.taux >= 40 ? 'bg-orange-100 text-orange-700' : 'bg-[#F5F5F5] text-[#3D3D3D]/50'
                  }`}>{o.taux} %</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => { const p = page - 1; setPage(p); load(p) }} disabled={page === 0}
            className="px-3 py-1.5 text-sm rounded-xl border border-[#E0E0E0] disabled:opacity-40">←</button>
          <span className="text-sm text-[#3D3D3D]/60">Page {page + 1} / {totalPages}</span>
          <button onClick={() => { const p = page + 1; setPage(p); load(p) }} disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-sm rounded-xl border border-[#E0E0E0] disabled:opacity-40">→</button>
        </div>
      )}

      <SlidePanel open={!!selected} onClose={() => setSelected(null)}>
        {selected && <FicheOffre id={selected} onClose={() => setSelected(null)} onRefresh={() => load(page)} />}
      </SlidePanel>

    </div>
  )
}
