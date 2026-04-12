'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { useToast } from '@/app/components/Toast'

const BADGE_LABEL = { habitant: 'Habitant 🏠', bon_habitant: 'Bon habitant ⭐', habitant_exemplaire: 'Habitant exemplaire 🏆' }
const BADGE_NEXT  = { habitant: 'bon_habitant', bon_habitant: 'habitant_exemplaire', habitant_exemplaire: null }

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }
function Sk({ className = 'h-8' }) {
  return <div className={`bg-[#E0E0E0] rounded-xl animate-pulse ${className}`} />
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
      <div className="w-full sm:w-[600px] bg-white h-full overflow-y-auto shadow-2xl flex flex-col"
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

function FicheClient({ id, onClose, onRefresh }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)
  const [acting,  setActing]  = useState(false)
  const [notes,   setNotes]   = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [emailForm, setEmailForm]     = useState({ subject: '', body: '' })
  const [badgeSelect, setBadgeSelect] = useState('')
  const { showToast } = useToast()

  useEffect(() => {
    if (!id) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetch(`/api/admin/clients/${id}`)
      .then(r => r.json())
      .then(d => {
        setData(d)
        setNotes(d.user?.notes_admin || '')
        setBadgeSelect(d.user?.badge_niveau || 'habitant')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  async function doAction(action, extra = {}) {
    setActing(true)
    const res = await fetch(`/api/admin/clients/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    const d = await res.json()
    setActing(false)
    if (d.success) { showToast('✅ Action effectuée'); setModal(null); onRefresh() }
    else showToast(`⚠️ ${d.error || 'Erreur'}`)
  }

  async function doDelete() {
    if (confirmText !== 'SUPPRIMER') return
    setActing(true)
    const res = await fetch(`/api/admin/clients/${id}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'SUPPRIMER' }),
    })
    const d = await res.json()
    setActing(false)
    if (d.success) { showToast('✅ Client supprimé (RGPD)'); onClose(); onRefresh() }
    else showToast(`⚠️ ${d.error}`)
  }

  async function saveNotes() {
    await fetch(`/api/admin/clients/${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_notes', notes }),
    })
  }

  const u     = data?.user
  const badge = u?.badge_niveau || 'habitant'
  const nextBadge = BADGE_NEXT[badge]
  const progress  = badge === 'habitant'
    ? Math.min((data?.stats?.nb_utilises || 0) / 3 * 100, 100)
    : badge === 'bon_habitant'
    ? Math.min((data?.stats?.nb_utilises || 0) / 12 * 100, 100)
    : 100

  return (
    <>
      <div className="sticky top-0 bg-white border-b border-[#F0F0F0] px-5 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {u?.avatar_url
            ? <Image src={u.avatar_url} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
            : <div className="w-10 h-10 rounded-full bg-[#FFF0E0] flex items-center justify-center font-black text-[#FF6B00]">
                {u?.nom?.[0]?.toUpperCase() || '?'}
              </div>
          }
          <div>
            <p className="font-black text-[#0A0A0A]">{u?.nom || '…'}</p>
            <p className="text-xs text-[#3D3D3D]/50">{u?.email}</p>
          </div>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-[#F5F5F5] flex items-center justify-center text-lg hover:bg-[#E0E0E0]">×</button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3 p-5">{[...Array(5)].map((_, i) => <Sk key={i} />)}</div>
      ) : !u ? (
        <p className="p-5 text-red-500">Erreur de chargement</p>
      ) : (
        <div className="flex flex-col gap-5 p-5">

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setModal('badge')} className="px-3 py-1.5 text-xs font-bold bg-[#FFF0E0] text-[#FF6B00] border border-[#FFD0A0] rounded-xl hover:bg-[#FFE0C0]">Changer badge</button>
            <button onClick={() => doAction('toggle_email')} className="px-3 py-1.5 text-xs font-bold bg-[#F5F5F5] text-[#0A0A0A] border border-[#E0E0E0] rounded-xl hover:bg-[#E8E8E8]">
              {u.notifications_email ? '🔕 Désabonner emails' : '🔔 Réabonner emails'}
            </button>
            <button onClick={() => { setEmailForm({ subject: '', body: '' }); setModal('email') }} className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-xl">✉️ Email</button>
            <button onClick={() => { setConfirmText(''); setModal('delete') }} className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-xl">Supprimer (RGPD)</button>
          </div>

          {/* Infos */}
          <section className="bg-[#F5F5F5] rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6B00] mb-3">Informations</p>
            {[
              ['Badge',       BADGE_LABEL[badge]],
              ['Villes',      (u.villes_abonnees || []).join(', ') || '—'],
              ['Inscription', fmtDate(u.created_at)],
              ['Emails',      u.notifications_email ? 'Activés' : 'Désactivés'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 border-b border-[#E8E8E8] last:border-0 text-sm">
                <span className="text-[#3D3D3D]/60">{k}</span>
                <span className="font-semibold text-[#0A0A0A]">{v}</span>
              </div>
            ))}
          </section>

          {/* Stats */}
          <section className="grid grid-cols-3 gap-2">
            {[['Réservations', data.stats?.nb_resas], ['Utilisés', data.stats?.nb_utilises], ['Taux', (data.stats?.taux_util ?? '—') + ' %']].map(([k, v]) => (
              <div key={k} className="bg-white border border-[#F0F0F0] rounded-xl p-3 text-center">
                <p className="text-lg font-black text-[#FF6B00]">{v ?? '—'}</p>
                <p className="text-[9px] text-[#3D3D3D]/50 uppercase tracking-wide">{k}</p>
              </div>
            ))}
          </section>

          {/* Progression badge */}
          {nextBadge && (
            <section className="bg-[#F5F5F5] rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6B00] mb-2">Progression badge</p>
              <div className="flex items-center justify-between mb-1.5 text-sm">
                <span className="font-semibold">{BADGE_LABEL[badge]}</span>
                <span className="text-[#3D3D3D]/50">→ {BADGE_LABEL[nextBadge]}</span>
              </div>
              <div className="w-full h-2 bg-[#E0E0E0] rounded-full overflow-hidden">
                <div className="h-full bg-[#FF6B00] rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </section>
          )}

          {/* Commerces favoris */}
          {data.favoris?.length > 0 && (
            <section>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6B00] mb-2">Commerces favoris</p>
              <div className="flex flex-col gap-1">
                {data.favoris.map(c => (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-2 bg-[#F5F5F5] rounded-xl text-sm">
                    {c.photo_url
                      ? <Image src={c.photo_url} alt="" width={32} height={32} className="w-8 h-8 rounded-lg object-cover" />
                      : <div className="w-8 h-8 rounded-lg bg-[#FFF0E0] flex items-center justify-center">🏪</div>}
                    <div>
                      <p className="font-semibold">{c.nom}</p>
                      <p className="text-[10px] text-[#3D3D3D]/50">📍 {c.ville}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Historique bons */}
          <section>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6B00] mb-2">Historique bons ({data.resas?.length})</p>
            <div className="flex flex-col gap-1">
              {(data.resas || []).slice(0, 15).map(r => (
                <div key={r.id} className="flex items-center justify-between px-3 py-2 bg-[#F5F5F5] rounded-xl text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{r.offres?.titre}</p>
                    <p className="text-[#3D3D3D]/50">{r.offres?.commerces?.nom} — {fmtDate(r.created_at)}</p>
                  </div>
                  <span className={`ml-2 shrink-0 px-2 py-0.5 rounded-full font-bold text-[9px] ${
                    r.statut === 'utilisee' ? 'bg-green-100 text-green-700' :
                    r.statut === 'reservee' ? 'bg-blue-100 text-blue-700' : 'bg-[#F0F0F0] text-[#3D3D3D]/50'
                  }`}>{r.statut}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Notes admin */}
          <section>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6B00] mb-2">Notes admin</p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={saveNotes} rows={4}
              placeholder="Ajouter une note…"
              className="w-full border-2 border-[#E0E0E0] rounded-xl px-3 py-2.5 text-sm focus:border-[#FF6B00] focus:outline-none resize-none" />
          </section>

        </div>
      )}

      <Modal open={modal === 'badge'} onClose={() => setModal(null)} title="Changer le badge">
        <select value={badgeSelect} onChange={e => setBadgeSelect(e.target.value)}
          className="w-full border-2 border-[#E0E0E0] rounded-xl px-3 py-2.5 text-sm focus:border-[#FF6B00] focus:outline-none">
          {Object.entries(BADGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="flex gap-2">
          <button onClick={() => setModal(null)} className="flex-1 border border-[#E0E0E0] py-2.5 rounded-xl text-sm font-semibold">Annuler</button>
          <button onClick={() => doAction('change_badge', { badge: badgeSelect })} disabled={acting}
            className="flex-1 bg-[#FF6B00] text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-60">{acting ? '…' : 'Confirmer'}</button>
        </div>
      </Modal>

      <Modal open={modal === 'email'} onClose={() => setModal(null)} title={`Email à ${u?.nom}`}>
        <input type="text" placeholder="Objet" value={emailForm.subject}
          onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))}
          className="w-full border-2 border-[#E0E0E0] rounded-xl px-3 py-2.5 text-sm focus:border-[#FF6B00] focus:outline-none" />
        <textarea placeholder="Corps du message" rows={5} value={emailForm.body}
          onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))}
          className="w-full border-2 border-[#E0E0E0] rounded-xl px-3 py-2.5 text-sm focus:border-[#FF6B00] focus:outline-none resize-none" />
        <div className="flex gap-2">
          <button onClick={() => setModal(null)} className="flex-1 border border-[#E0E0E0] py-2.5 rounded-xl text-sm font-semibold">Annuler</button>
          <button onClick={() => doAction('send_email', emailForm)} disabled={acting || !emailForm.subject}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-60">{acting ? '…' : 'Envoyer'}</button>
        </div>
      </Modal>

      <Modal open={modal === 'delete'} onClose={() => setModal(null)} title="Suppression RGPD — irréversible">
        <p className="text-sm text-red-600 font-semibold">Toutes les réservations et données personnelles seront supprimées.</p>
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

export default function AdminClients() {
  const [rows,     setRows]     = useState([])
  const [total,    setTotal]    = useState(0)
  const [top5,     setTop5]     = useState([])
  const [page,     setPage]     = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [badge,    setBadge]    = useState('')
  const [selected, setSelected] = useState(null)
  const debounceRef = useRef(null)

  function load(p = 0, s = search, b = badge) {
    setLoading(true)
    const q = new URLSearchParams({ page: p, ...(s && { search: s }), ...(b && { badge: b }) })
    fetch(`/api/admin/clients?${q}`)
      .then(r => r.json())
      .then(d => { setRows(d.clients || []); setTotal(d.total || 0); setTop5(d.top5 || []); setLoading(false) })
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
        <h1 className="text-2xl font-black text-[#0A0A0A]">Clients</h1>
        <span className="text-sm text-[#3D3D3D]/50">{total} total</span>
      </div>

      {/* Top 5 */}
      {top5.length > 0 && (
        <section>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6B00] mb-2">⭐ Top 5 clients du mois</p>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {top5.map(u => (
              <button key={u.id} onClick={() => setSelected(u.id)}
                className="shrink-0 bg-white border border-[#F0F0F0] rounded-2xl px-4 py-3 flex flex-col items-center gap-1 hover:border-[#FF6B00] hover:shadow-md transition-all min-w-[110px]">
                <div className="w-10 h-10 rounded-full bg-[#FFF0E0] flex items-center justify-center font-black text-[#FF6B00]">
                  {u.nom?.[0]?.toUpperCase() || '?'}
                </div>
                <p className="text-xs font-bold text-[#0A0A0A] truncate max-w-[90px]">{u.nom}</p>
                <p className="text-[10px] text-[#FF6B00] font-bold">{u.nb_utilises_mois} bons</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Rechercher nom ou email…"
          className="flex-1 min-w-[200px] border-2 border-[#E0E0E0] rounded-xl px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none" />
        <select value={badge} onChange={e => { setBadge(e.target.value); setPage(0); load(0, search, e.target.value) }}
          className="border-2 border-[#E0E0E0] rounded-xl px-3 py-2 text-sm bg-white focus:border-[#FF6B00] focus:outline-none">
          <option value="">Tous badges</option>
          {Object.entries(BADGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="border-b border-[#F0F0F0]">
            <tr className="text-[10px] uppercase tracking-wide text-[#3D3D3D]/50">
              {['Prénom', 'Email', 'Villes', 'Badge', 'Réservations', 'Utilisés', 'Taux', 'Favoris', 'Inscription'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? [...Array(8)].map((_, i) => (
              <tr key={i}><td colSpan={9} className="px-4 py-2"><Sk /></td></tr>
            )) : rows.map(u => (
              <tr key={u.id} onClick={() => setSelected(u.id)}
                className="border-t border-[#F5F5F5] hover:bg-[#FFF8F3] cursor-pointer transition-colors">
                <td className="px-4 py-3 font-semibold text-[#0A0A0A]">{u.nom?.split(' ')[0] || '—'}</td>
                <td className="px-4 py-3 text-[#3D3D3D]/60 text-xs max-w-[160px] truncate">{u.email}</td>
                <td className="px-4 py-3 text-xs text-[#3D3D3D]/70">{(u.villes_abonnees || []).join(', ') || '—'}</td>
                <td className="px-4 py-3 text-xs">{BADGE_LABEL[u.badge_niveau] || '—'}</td>
                <td className="px-4 py-3 text-center font-semibold">{u.nb_reservations}</td>
                <td className="px-4 py-3 text-center font-semibold">{u.nb_bons_utilises}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    u.taux_util >= 70 ? 'bg-green-100 text-green-700' :
                    u.taux_util >= 40 ? 'bg-orange-100 text-orange-700' : 'bg-[#F5F5F5] text-[#3D3D3D]/50'
                  }`}>{u.taux_util} %</span>
                </td>
                <td className="px-4 py-3 text-center text-[#3D3D3D]/60">{(u.commerces_abonnes || []).length}</td>
                <td className="px-4 py-3 text-xs text-[#3D3D3D]/60">{fmtDate(u.created_at)}</td>
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
        {selected && <FicheClient id={selected} onClose={() => setSelected(null)} onRefresh={() => load(page)} />}
      </SlidePanel>

    </div>
  )
}
