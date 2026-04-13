'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useToast } from '@/app/components/Toast'

const PALIER_PRIX  = { decouverte: 29, essentiel: 49, pro: 79 }
const PALIER_LABEL = { decouverte: 'Découverte', essentiel: 'Essentiel', pro: 'Pro' }
const PALIER_COLOR = { decouverte: '#6B7280', essentiel: '#FF6B00', pro: '#CC5500' }

function fmt(n) { return n?.toLocaleString('fr-FR') ?? '—' }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }

function statusDot(c) {
  const now = new Date()
  if (c.abonnement_actif) {
    const recentOffre = c.offres_ce_mois > 0
    return recentOffre ? '🟢' : '🟡'
  }
  if (c.date_fin_essai && new Date(c.date_fin_essai) > now) return '🟠'
  return '🔴'
}

function essaiLabel(c) {
  if (!c.date_fin_essai) return null
  const j = Math.ceil((new Date(c.date_fin_essai) - new Date()) / 86400000)
  if (j <= 0) return 'Essai expiré'
  return `Essai J-${j}`
}

function Sk({ className = 'h-10' }) {
  return <div className={`bg-[#E0E0E0] rounded-xl animate-pulse ${className}`} />
}

/* ── Slide panel ── */
function SlidePanel({ open, onClose, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else      document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full sm:w-[620px] bg-white h-full overflow-y-auto shadow-2xl flex flex-col"
        style={{ animation: 'slideInRight 0.25s ease' }}>
        <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
        {children}
      </div>
    </div>
  )
}

/* ── Modale ── */
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

/* ── Fiche détail commerçant ── */
function FicheCommercant({ id, onClose, onRefresh }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null) // 'deactivate'|'palier'|'essai'|'email'|'delete'
  const [acting,  setActing]  = useState(false)
  const [notes,   setNotes]   = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [emailForm, setEmailForm] = useState({ subject: '', body: '' })
  const [palierSelect, setPalierSelect] = useState('')
  const [joursEssai, setJoursEssai] = useState(7)
  const { showToast } = useToast()

  useEffect(() => {
    if (!id) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetch(`/api/admin/commercants/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setNotes(d.commerce?.notes_admin || ''); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  async function doAction(action, extra = {}) {
    setActing(true)
    const res = await fetch(`/api/admin/commercants/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    const d = await res.json()
    setActing(false)
    if (d.success) { showToast('✅ Action effectuée'); setModal(null); onRefresh() }
    else showToast(`⚠️ ${d.error || 'Erreur'}`)
    return d
  }

  async function doDelete() {
    if (confirmText !== 'SUPPRIMER') return
    setActing(true)
    const res = await fetch(`/api/admin/commercants/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'SUPPRIMER' }),
    })
    const d = await res.json()
    setActing(false)
    if (d.success) { showToast('✅ Commerçant supprimé'); onClose(); onRefresh() }
    else showToast(`⚠️ ${d.error}`)
  }

  async function saveNotes() {
    await fetch(`/api/admin/commercants/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_notes', notes }),
    })
  }

  const c = data?.commerce

  return (
    <>
      <div className="sticky top-0 bg-white border-b border-[#F0F0F0] px-5 py-4 flex items-center justify-between z-10">
        <div>
          <p className="font-black text-[#0A0A0A]">{c?.nom || '…'}</p>
          <p className="text-xs text-[#3D3D3D]/50">{c?.email}</p>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-[#F5F5F5] flex items-center justify-center text-lg hover:bg-[#E0E0E0]">×</button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3 p-5">
          {[...Array(6)].map((_, i) => <Sk key={i} className="h-8" />)}
        </div>
      ) : !c ? (
        <p className="p-5 text-red-500">Erreur de chargement</p>
      ) : (
        <div className="flex flex-col gap-5 p-5">

          {/* Boutons d'action */}
          <div className="flex flex-wrap gap-2">
            {c.abonnement_actif
              ? <button onClick={() => setModal('deactivate')} className="px-3 py-1.5 text-xs font-bold bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-colors">Désactiver</button>
              : <button onClick={() => doAction('activate')} disabled={acting} className="px-3 py-1.5 text-xs font-bold bg-green-50 text-green-700 border border-green-200 rounded-xl hover:bg-green-100 transition-colors">Réactiver</button>
            }
            <button onClick={() => { setPalierSelect(c.palier || 'decouverte'); setModal('palier') }} className="px-3 py-1.5 text-xs font-bold bg-[#FFF0E0] text-[#FF6B00] border border-[#FFD0A0] rounded-xl hover:bg-[#FFE0C0] transition-colors">Changer palier</button>
            <button onClick={() => setModal('essai')} className="px-3 py-1.5 text-xs font-bold bg-[#F5F5F5] text-[#0A0A0A] border border-[#E0E0E0] rounded-xl hover:bg-[#E8E8E8] transition-colors">Prolonger essai</button>
            <button onClick={() => { setEmailForm({ subject: '', body: '' }); setModal('email') }} className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors">✉️ Email</button>
            <button onClick={() => { setConfirmText(''); setModal('delete') }} className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors">Supprimer</button>
          </div>

          {/* Infos */}
          <section className="bg-[#F5F5F5] rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6B00] mb-3">Informations</p>
            {[
              ['Ville',         c.ville],
              ['Catégorie',     c.categorie],
              ['Adresse',       c.adresse],
              ['Téléphone',     c.telephone],
              ['Note Google',   c.note_google],
              ['Palier',        PALIER_LABEL[c.palier] || c.palier],
              ['MRR individuel',PALIER_PRIX[c.palier || 'decouverte'] + ' €'],
              ['Inscription',       fmtDate(c.created_at)],
              ['Fin essai',         fmtDate(c.date_fin_essai)],
              ['Stripe customer',   c.stripe_customer_id],
              ['Stripe sub',        c.stripe_subscription_id],
              ['Résiliation prév.', c.resiliation_prevue ? `Oui — fin ${fmtDate(c.date_fin_abonnement)}` : null],
            ].map(([k, v]) => v ? (
              <div key={k} className="flex justify-between py-1 border-b border-[#E8E8E8] last:border-0 text-sm">
                <span className="text-[#3D3D3D]/60">{k}</span>
                <span className="font-semibold text-[#0A0A0A] text-right max-w-[55%] truncate">{v}</span>
              </div>
            ) : null)}
          </section>

          {/* Stats */}
          <section className="grid grid-cols-3 gap-2">
            {[
              ['Total bons',     data.stats?.total_bons],
              ['Bons utilisés',  data.stats?.total_utilises],
              ['Taux util.',     data.stats?.taux_util + ' %'],
            ].map(([k, v]) => (
              <div key={k} className="bg-white border border-[#F0F0F0] rounded-xl p-3 text-center">
                <p className="text-lg font-black text-[#FF6B00]">{v ?? '—'}</p>
                <p className="text-[9px] text-[#3D3D3D]/50 uppercase tracking-wide">{k}</p>
              </div>
            ))}
          </section>

          {/* Historique offres */}
          <section>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6B00] mb-2">Offres ({data.offres?.length})</p>
            <div className="flex flex-col gap-1">
              {(data.offres || []).slice(0, 10).map(o => (
                <div key={o.id} className="bg-[#F5F5F5] rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#0A0A0A] truncate">{o.titre}</p>
                    <p className="text-[#3D3D3D]/50">{fmtDate(o.date_debut)} → {fmtDate(o.date_fin)}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="font-bold text-[#0A0A0A]">{o.nb_reservations} rés. / {o.nb_utilises} util.</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      o.statut === 'active' ? 'bg-green-100 text-green-700' :
                      o.statut === 'expiree' ? 'bg-[#F5F5F5] text-[#3D3D3D]/50' : 'bg-red-100 text-red-600'
                    }`}>{o.statut}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Paiements Stripe */}
          {data.invoices?.length > 0 && (
            <section>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6B00] mb-2">Paiements Stripe</p>
              <div className="flex flex-col gap-1">
                {data.invoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between text-xs px-3 py-2 bg-[#F5F5F5] rounded-xl">
                    <span className="text-[#3D3D3D]/60">{fmtDate(inv.date)}</span>
                    <span className="font-semibold">{inv.montant} €</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                      inv.statut === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>{inv.statut}</span>
                    {inv.url && <a href={inv.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Voir</a>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Notes admin */}
          <section>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6B00] mb-2">Notes admin</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
              rows={4}
              placeholder="Ajouter une note interne…"
              className="w-full border-2 border-[#E0E0E0] rounded-xl px-3 py-2.5 text-sm focus:border-[#FF6B00] focus:outline-none resize-none"
            />
          </section>

        </div>
      )}

      {/* Modale désactiver */}
      <Modal open={modal === 'deactivate'} onClose={() => setModal(null)} title="Désactiver ce commerçant ?">
        <p className="text-sm text-[#3D3D3D]/70">
          Toutes ses offres actives seront annulées. Les bons déjà réservés restent valides jusqu&apos;à expiration.
        </p>
        <div className="flex gap-2">
          <button onClick={() => setModal(null)} className="flex-1 border border-[#E0E0E0] py-2.5 rounded-xl text-sm font-semibold">Annuler</button>
          <button onClick={() => doAction('deactivate')} disabled={acting} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-60">
            {acting ? '…' : 'Désactiver'}
          </button>
        </div>
      </Modal>

      {/* Modale palier */}
      <Modal open={modal === 'palier'} onClose={() => setModal(null)} title="Changer de palier">
        <select value={palierSelect} onChange={e => setPalierSelect(e.target.value)}
          className="w-full border-2 border-[#E0E0E0] rounded-xl px-3 py-2.5 text-sm focus:border-[#FF6B00] focus:outline-none">
          {Object.entries(PALIER_LABEL).map(([k, v]) => <option key={k} value={k}>{v} — {PALIER_PRIX[k]}€/mois</option>)}
        </select>
        <div className="flex gap-2">
          <button onClick={() => setModal(null)} className="flex-1 border border-[#E0E0E0] py-2.5 rounded-xl text-sm font-semibold">Annuler</button>
          <button onClick={() => doAction('change_palier', { palier: palierSelect })} disabled={acting} className="flex-1 bg-[#FF6B00] text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-60">
            {acting ? '…' : 'Confirmer'}
          </button>
        </div>
      </Modal>

      {/* Modale essai */}
      <Modal open={modal === 'essai'} onClose={() => setModal(null)} title="Prolonger l'essai">
        <div className="flex items-center gap-3">
          <input type="number" min={1} max={90} value={joursEssai} onChange={e => setJoursEssai(e.target.value)}
            className="w-24 border-2 border-[#E0E0E0] rounded-xl px-3 py-2.5 text-sm focus:border-[#FF6B00] focus:outline-none" />
          <span className="text-sm text-[#3D3D3D]/70">jours supplémentaires</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal(null)} className="flex-1 border border-[#E0E0E0] py-2.5 rounded-xl text-sm font-semibold">Annuler</button>
          <button onClick={() => doAction('prolonger_essai', { jours: joursEssai })} disabled={acting} className="flex-1 bg-[#FF6B00] text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-60">
            {acting ? '…' : 'Prolonger'}
          </button>
        </div>
      </Modal>

      {/* Modale email */}
      <Modal open={modal === 'email'} onClose={() => setModal(null)} title={`Email à ${c?.nom}`}>
        <input type="text" placeholder="Objet" value={emailForm.subject}
          onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))}
          className="w-full border-2 border-[#E0E0E0] rounded-xl px-3 py-2.5 text-sm focus:border-[#FF6B00] focus:outline-none" />
        <textarea placeholder="Corps du message" rows={5} value={emailForm.body}
          onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))}
          className="w-full border-2 border-[#E0E0E0] rounded-xl px-3 py-2.5 text-sm focus:border-[#FF6B00] focus:outline-none resize-none" />
        <div className="flex gap-2">
          <button onClick={() => setModal(null)} className="flex-1 border border-[#E0E0E0] py-2.5 rounded-xl text-sm font-semibold">Annuler</button>
          <button onClick={() => doAction('send_email', emailForm)} disabled={acting || !emailForm.subject} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-60">
            {acting ? '…' : 'Envoyer'}
          </button>
        </div>
      </Modal>

      {/* Modale suppression */}
      <Modal open={modal === 'delete'} onClose={() => setModal(null)} title="Supprimer définitivement ?">
        <p className="text-sm text-red-600 font-semibold">
          Cette action est irréversible. Toutes les offres et réservations seront supprimées.
        </p>
        <p className="text-sm text-[#3D3D3D]/70">Tapez <strong>SUPPRIMER</strong> pour confirmer :</p>
        <input value={confirmText} onChange={e => setConfirmText(e.target.value)}
          className="w-full border-2 border-red-200 rounded-xl px-3 py-2.5 text-sm focus:border-red-500 focus:outline-none font-mono" />
        <div className="flex gap-2">
          <button onClick={() => setModal(null)} className="flex-1 border border-[#E0E0E0] py-2.5 rounded-xl text-sm font-semibold">Annuler</button>
          <button onClick={doDelete} disabled={acting || confirmText !== 'SUPPRIMER'} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-40">
            {acting ? '…' : 'Supprimer'}
          </button>
        </div>
      </Modal>
    </>
  )
}

/* ── Page principale ── */
export default function AdminCommercants() {
  const [rows,     setRows]     = useState([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [ville,    setVille]    = useState('')
  const [palier,   setPalier]   = useState('')
  const [statut,   setStatut]   = useState('')
  const [selected, setSelected] = useState(null)
  const debounceRef = useRef(null)

  function load(p = 0, s = search, v = ville, pal = palier, stat = statut) {
    setLoading(true)
    const q = new URLSearchParams({ page: p, ...(s && { search: s }), ...(v && { ville: v }), ...(pal && { palier: pal }), ...(stat && { statut: stat }) })
    fetch(`/api/admin/commercants?${q}`)
      .then(r => r.json())
      .then(d => { setRows(d.commercants || []); setTotal(d.total || 0); setLoading(false) })
      .catch(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { load(0) }, [])

  function handleSearch(v) {
    setSearch(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setPage(0); load(0, v) }, 300)
  }

  function handleFilter(type, val) {
    if (type === 'ville')   { setVille(val);   setPage(0); load(0, search, val, palier, statut) }
    if (type === 'palier')  { setPalier(val);  setPage(0); load(0, search, ville, val, statut) }
    if (type === 'statut')  { setStatut(val);  setPage(0); load(0, search, ville, palier, val) }
  }

  function handlePage(p) { setPage(p); load(p) }

  const totalPages = Math.ceil(total / 50)

  return (
    <div className="flex flex-col gap-5">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-[#0A0A0A]">Commerçants</h1>
        <span className="text-sm text-[#3D3D3D]/50">{total} total</span>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Rechercher nom ou email…"
          className="flex-1 min-w-[200px] border-2 border-[#E0E0E0] rounded-xl px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none"
        />
        {[
          { key: 'ville',  val: ville,  opts: [['', 'Toutes villes']], extra: [] },
          { key: 'palier', val: palier, opts: [['', 'Tous paliers'], ['decouverte', 'Découverte'], ['essentiel', 'Essentiel'], ['pro', 'Pro']] },
          { key: 'statut', val: statut, opts: [['', 'Tous statuts'], ['actif', 'Actif'], ['inactif', 'Inactif']] },
        ].map(({ key, val, opts }) => (
          <select key={key} value={val} onChange={e => handleFilter(key, e.target.value)}
            className="border-2 border-[#E0E0E0] rounded-xl px-3 py-2 text-sm focus:border-[#FF6B00] focus:outline-none bg-white">
            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="border-b border-[#F0F0F0]">
            <tr className="text-[10px] uppercase tracking-wide text-[#3D3D3D]/50">
              {['', 'Nom', 'Ville', 'Palier', 'Statut', 'Offres/mois', 'Bons util.', 'Inscription', 'MRR'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? [...Array(8)].map((_, i) => (
              <tr key={i}><td colSpan={9} className="px-4 py-2"><Sk className="h-8" /></td></tr>
            )) : rows.map(c => (
              <tr key={c.id} onClick={() => setSelected(c.id)}
                className="border-t border-[#F5F5F5] hover:bg-[#FFF8F3] cursor-pointer transition-colors">
                <td className="px-3 py-3 text-lg">{statusDot(c)}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-[#0A0A0A]">{c.nom}</p>
                  <p className="text-[10px] text-[#3D3D3D]/50 truncate max-w-[160px]">{c.email}</p>
                </td>
                <td className="px-4 py-3 text-[#3D3D3D]/70">{c.ville || '—'}</td>
                <td className="px-4 py-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: PALIER_COLOR[c.palier] || '#9CA3AF' }}>
                    {PALIER_LABEL[c.palier] || c.palier || '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {c.abonnement_actif
                    ? <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Actif</span>
                    : essaiLabel(c)
                      ? <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">{essaiLabel(c)}</span>
                      : <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Résilié</span>
                  }
                </td>
                <td className="px-4 py-3 text-center font-semibold">{c.offres_ce_mois ?? '—'}</td>
                <td className="px-4 py-3 text-center font-semibold">{c.nb_bons_utilises ?? '—'}</td>
                <td className="px-4 py-3 text-[#3D3D3D]/60 text-xs">{fmtDate(c.created_at)}</td>
                <td className="px-4 py-3 font-bold text-[#FF6B00]">
                  {c.abonnement_actif ? (PALIER_PRIX[c.palier || 'decouverte'] || 29) + ' €' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => handlePage(page - 1)} disabled={page === 0}
            className="px-3 py-1.5 text-sm rounded-xl border border-[#E0E0E0] disabled:opacity-40 hover:border-[#FF6B00]">←</button>
          <span className="text-sm text-[#3D3D3D]/60">Page {page + 1} / {totalPages}</span>
          <button onClick={() => handlePage(page + 1)} disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-sm rounded-xl border border-[#E0E0E0] disabled:opacity-40 hover:border-[#FF6B00]">→</button>
        </div>
      )}

      <SlidePanel open={!!selected} onClose={() => setSelected(null)}>
        {selected && <FicheCommercant id={selected} onClose={() => setSelected(null)} onRefresh={() => load(page)} />}
      </SlidePanel>

    </div>
  )
}
