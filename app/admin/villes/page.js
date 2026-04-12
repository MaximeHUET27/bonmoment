'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/app/components/Toast'

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
      <div className="w-full sm:w-[520px] bg-white h-full overflow-y-auto shadow-2xl flex flex-col"
        style={{ animation: 'slideInRight 0.25s ease' }}>
        <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
        {children}
      </div>
    </div>
  )
}

function FicheVille({ ville, onClose, onToggle, acting }) {
  if (!ville) return null
  return (
    <>
      <div className="sticky top-0 bg-white border-b border-[#F0F0F0] px-5 py-4 flex items-center justify-between z-10">
        <div>
          <p className="font-black text-[#0A0A0A]">📍 {ville.nom}</p>
          <p className="text-xs text-[#3D3D3D]/50">{ville.departement || '—'}</p>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-[#F5F5F5] flex items-center justify-center text-lg hover:bg-[#E0E0E0]">×</button>
      </div>

      <div className="flex flex-col gap-5 p-5">

        {/* Bouton toggle */}
        <div>
          {ville.active
            ? <button onClick={() => onToggle(ville.id, 'deactivate')} disabled={acting}
                className="px-4 py-2 text-sm font-bold bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 disabled:opacity-60">
                {acting ? '…' : 'Désactiver cette ville'}
              </button>
            : <button onClick={() => onToggle(ville.id, 'activate')} disabled={acting}
                className="px-4 py-2 text-sm font-bold bg-green-50 text-green-700 border border-green-200 rounded-xl hover:bg-green-100 disabled:opacity-60">
                {acting ? '…' : 'Activer cette ville'}
              </button>
          }
        </div>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3">
          {[
            ['🏪 Commerçants actifs', ville.commercants_actifs],
            ['👥 Clients abonnés',    ville.clients_abonnes],
            ['🎟️ Offres actives',     ville.offres_actives],
            ['📊 Statut',             ville.active ? 'Active ✅' : 'Inactive ⛔'],
          ].map(([k, v]) => (
            <div key={k} className="bg-[#F5F5F5] rounded-2xl p-4">
              <p className="text-2xl font-black text-[#FF6B00]">{v}</p>
              <p className="text-[10px] text-[#3D3D3D]/50 uppercase tracking-wide mt-0.5">{k}</p>
            </div>
          ))}
        </section>

        <p className="text-xs text-[#3D3D3D]/50 text-center">
          Désactiver une ville la masque de la liste publique. Les commerçants existants ne sont pas affectés.
        </p>

      </div>
    </>
  )
}

export default function AdminVilles() {
  const [villes,   setVilles]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [acting,   setActing]   = useState(false)
  const { showToast } = useToast()

  function load() {
    setLoading(true)
    fetch('/api/admin/villes')
      .then(r => r.json())
      .then(d => { setVilles(d.villes || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  async function handleToggle(id, action) {
    setActing(true)
    const res = await fetch('/api/admin/villes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
    const d = await res.json()
    setActing(false)
    if (d.success) {
      showToast('✅ Statut mis à jour')
      load()
      // Mettre à jour la fiche sélectionnée
      setSelected(prev => prev ? { ...prev, active: action === 'activate' } : null)
    } else {
      showToast(`⚠️ ${d.error}`)
    }
  }

  const villeSelected = selected ? villes.find(v => v.id === selected.id) : null

  return (
    <div className="flex flex-col gap-5">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-[#0A0A0A]">Villes</h1>
        <span className="text-sm text-[#3D3D3D]/50">{villes.length} total</span>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['📍 Actives',           villes.filter(v => v.active).length],
          ['⛔ Inactives',         villes.filter(v => !v.active).length],
          ['🏪 Total commerçants', villes.reduce((s, v) => s + v.commercants_actifs, 0)],
          ['👥 Total abonnés',     villes.reduce((s, v) => s + v.clients_abonnes, 0)],
        ].map(([k, v]) => (
          <div key={k} className="bg-white rounded-2xl px-4 py-3 border border-[#F0F0F0] shadow-sm">
            <p className="text-xl font-black text-[#FF6B00]">{v}</p>
            <p className="text-[10px] text-[#3D3D3D]/50 uppercase tracking-wide mt-0.5">{k}</p>
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[#F0F0F0]">
            <tr className="text-[10px] uppercase tracking-wide text-[#3D3D3D]/50">
              {['Nom', 'Dép.', 'Commerçants actifs', 'Clients abonnés', 'Offres actives', 'Statut'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? [...Array(6)].map((_, i) => (
              <tr key={i}><td colSpan={6} className="px-4 py-2"><Sk /></td></tr>
            )) : villes.map(v => (
              <tr key={v.id} onClick={() => setSelected(v)}
                className="border-t border-[#F5F5F5] hover:bg-[#FFF8F3] cursor-pointer transition-colors">
                <td className="px-4 py-3 font-semibold text-[#0A0A0A]">📍 {v.nom}</td>
                <td className="px-4 py-3 text-[#3D3D3D]/60">{v.departement || '—'}</td>
                <td className="px-4 py-3 text-center font-semibold">{v.commercants_actifs}</td>
                <td className="px-4 py-3 text-center font-semibold">{v.clients_abonnes}</td>
                <td className="px-4 py-3 text-center font-semibold">{v.offres_actives}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    v.active ? 'bg-green-100 text-green-700' : 'bg-[#F5F5F5] text-[#3D3D3D]/50'
                  }`}>{v.active ? 'Active' : 'Inactive'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SlidePanel open={!!selected} onClose={() => setSelected(null)}>
        <FicheVille
          ville={villeSelected || selected}
          onClose={() => setSelected(null)}
          onToggle={handleToggle}
          acting={acting}
        />
      </SlidePanel>

    </div>
  )
}
