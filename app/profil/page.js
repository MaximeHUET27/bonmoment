'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/app/context/AuthContext'
import VilleSearchOverlay from '@/app/components/VilleSearchOverlay'

/* ── Helpers badges ────────────────────────────────────────────────────────── */

const BADGES = {
  habitant:           { label: 'Habitant',           emoji: '🏠', next: 'Bon habitant',         desc: 'Valide 3 bons en 1 semaine pour progresser', color: '#3D3D3D' },
  bon_habitant:       { label: 'Bon habitant',        emoji: '⭐', next: 'Habitant exemplaire',  desc: 'Valide 3 bons/sem pendant 1 mois pour progresser', color: '#FF6B00' },
  habitant_exemplaire:{ label: 'Habitant exemplaire', emoji: '🏆', next: null,                   desc: 'Tu as atteint le niveau maximum !', color: '#CC5500' },
}

function getBadgeProgress(badge, bonsValides) {
  if (badge === 'habitant')     return Math.min((bonsValides / 3) * 100, 100)
  if (badge === 'bon_habitant') return Math.min((bonsValides / 12) * 100, 100)
  return 100
}

function statutPastille(statut) {
  if (statut === 'utilisee') return { color: '#22C55E', label: 'Utilisé' }
  if (statut === 'reservee') return { color: '#FF6B00', label: 'Actif'   }
  return                             { color: '#9CA3AF', label: 'Expiré'  }
}

function Toggle({ value, onChange, label, sublabel }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[#F5F5F5] last:border-0">
      <div>
        <p className="text-sm font-bold text-[#0A0A0A]">{label}</p>
        {sublabel && <p className="text-xs text-[#3D3D3D]/50 mt-0.5">{sublabel}</p>}
      </div>
      <button
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 ${value ? 'bg-[#FF6B00]' : 'bg-[#E0E0E0]'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

/* ── Composant principal ────────────────────────────────────────────────────── */

export default function ProfilPage() {
  const { user, loading, supabase, signOut } = useAuth()
  const router = useRouter()

  const [profile,            setProfile]            = useState(null)
  const [reservations,       setReservations]        = useState([])
  const [favorisDetails,     setFavorisDetails]      = useState([])
  const [villeCounts,        setVilleCounts]         = useState({})
  const [villesBonmoment,    setVillesBonmoment]     = useState([])
  const [fetching,           setFetching]            = useState(true)
  const [confirmDelete,      setConfirmDelete]       = useState(false)
  const [deleting,           setDeleting]            = useState(false)
  const [toast,              setToast]               = useState(null)
  const [showVilleOverlay,   setShowVilleOverlay]    = useState(false)

  /* Auth guard */
  useEffect(() => {
    if (!loading && !user) router.replace('/')
  }, [user, loading, router])

  /* Charger les données */
  useEffect(() => {
    if (!user) return

    async function load() {
      const [
        { data: prof },
        { data: resa },
        { data: villesActives },
      ] = await Promise.all([
        supabase
          .from('users')
          .select('nom, email, avatar_url, badge_niveau, villes_abonnees, commerces_abonnes, notifications_email, notifications_push')
          .eq('id', user.id)
          .single(),
        supabase
          .from('reservations')
          .select('id, statut, created_at, offres(titre, date_fin, commerces(nom, ville))')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('villes')
          .select('id, nom')
          .eq('active', true)
          .order('nom'),
      ])

      setVillesBonmoment(villesActives || [])

      setProfile(prof)
      setReservations(resa || [])

      /* Offres actives par ville abonnée */
      if (prof?.villes_abonnees?.length) {
        const counts = {}
        await Promise.all(
          prof.villes_abonnees.map(async (ville) => {
            const { count } = await supabase
              .from('offres')
              .select('id', { count: 'exact', head: true })
              .eq('statut', 'active')
              .gt('date_fin', new Date().toISOString())
              .eq('commerces.ville', ville)
            counts[ville] = count || 0
          })
        )
        setVilleCounts(counts)
      }

      /* Détails des commerces favoris */
      if (prof?.commerces_abonnes?.length) {
        const { data: comms } = await supabase
          .from('commerces')
          .select('id, nom, ville, photo_url')
          .in('id', prof.commerces_abonnes)
        setFavorisDetails(comms || [])
      }

      setFetching(false)
    }

    load()
  }, [user, supabase])

  function afficherToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  async function toggleEmailNotif() {
    const next = !profile.notifications_email
    await supabase.from('users').update({ notifications_email: next }).eq('id', user.id)
    setProfile(p => ({ ...p, notifications_email: next }))
  }

  async function togglePushNotif() {
    if (!profile.notifications_push) {
      if (!('Notification' in window)) {
        afficherToast('Les notifications push ne sont pas supportées sur cet appareil.')
        return
      }
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        afficherToast('Permission refusée. Active les notifications dans les paramètres du navigateur.')
        return
      }
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })
        await supabase
          .from('users')
          .update({ notifications_push: true, push_subscription: sub.toJSON() })
          .eq('id', user.id)
      } catch {
        await supabase
          .from('users')
          .update({ notifications_push: true })
          .eq('id', user.id)
      }
    } else {
      await supabase
        .from('users')
        .update({ notifications_push: false })
        .eq('id', user.id)
    }
    setProfile(p => ({ ...p, notifications_push: !p.notifications_push }))
  }

  async function abonnerVille(villeNom) {
    const existant = profile.villes_abonnees || []
    if (existant.includes(villeNom)) return
    const next = [...existant, villeNom]
    await supabase.from('users').update({ villes_abonnees: next }).eq('id', user.id)
    setProfile(p => ({ ...p, villes_abonnees: next }))
    afficherToast(`🎉 Tu es abonné à ${villeNom} !`)
    // Charger le nb d'offres pour la nouvelle ville
    const { count } = await supabase
      .from('offres')
      .select('id', { count: 'exact', head: true })
      .eq('statut', 'active')
      .gt('date_fin', new Date().toISOString())
    setVilleCounts(prev => ({ ...prev, [villeNom]: count || 0 }))
  }

  async function desabonnerVille(villeNom) {
    const next = (profile.villes_abonnees || []).filter(v => v !== villeNom)
    await supabase.from('users').update({ villes_abonnees: next }).eq('id', user.id)
    setProfile(p => ({ ...p, villes_abonnees: next }))
  }

  async function retirerFavori(commerceId) {
    const next = (profile.commerces_abonnes || []).filter(id => id !== commerceId)
    await supabase.from('users').update({ commerces_abonnes: next }).eq('id', user.id)
    setProfile(p => ({ ...p, commerces_abonnes: next }))
    setFavorisDetails(f => f.filter(c => c.id !== commerceId))
  }

  async function supprimerCompte() {
    setDeleting(true)
    await supabase.from('users').delete().eq('id', user.id)
    await signOut()
    router.push('/')
    afficherToast('Ton compte a été supprimé.')
  }

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <span className="w-8 h-8 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !profile) return null

  const prenom = profile.nom?.split(' ')[0] || user.email?.split('@')[0] || 'Toi'
  const badge  = BADGES[profile.badge_niveau || 'habitant'] || BADGES.habitant
  const bonsValides = reservations.filter(r => r.statut === 'utilisee').length
  const progress = getBadgeProgress(profile.badge_niveau || 'habitant', bonsValides)

  /* Tri des réservations : actives en haut, puis utilisées, puis expirées */
  const resaSorted = [...reservations].sort((a, b) => {
    const order = { reservee: 0, utilisee: 1, expiree: 2 }
    return (order[a.statut] ?? 3) - (order[b.statut] ?? 3)
  })

  return (
    <main className="min-h-screen bg-[#F5F5F5] flex flex-col">

      {/* ── Header ── */}
      <header className="w-full bg-white border-b border-[#EBEBEB] px-5 py-3 flex items-center justify-between sticky top-0 z-30">
        <Link href="/">
          <Image src="/LOGO.png" alt="BONMOMENT" width={600} height={300} unoptimized priority className="w-[110px] h-auto" />
        </Link>
        <Link href="/" className="text-xs text-[#3D3D3D]/60 hover:text-[#FF6B00] transition-colors">
          ← Accueil
        </Link>
      </header>

      <div className="flex-1 w-full max-w-xl mx-auto px-4 py-6 flex flex-col gap-4">

        {/* ── Mes informations ── */}
        <section className="bg-white rounded-3xl px-5 py-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00] mb-3">Mes informations</p>
          <div className="flex items-center gap-4 mb-5">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={prenom} className="w-14 h-14 rounded-full object-cover border-2 border-[#FF6B00]/20" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[#FFF0E0] flex items-center justify-center text-2xl font-black text-[#FF6B00]">
                {prenom[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-base font-black text-[#0A0A0A]">{prenom}</p>
              <p className="text-xs text-[#3D3D3D]/60">{profile.email || user.email}</p>
            </div>
          </div>

          {/* Badge + barre de progression */}
          <div className="bg-[#F5F5F5] rounded-2xl px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{badge.emoji}</span>
                <span className="text-sm font-black text-[#0A0A0A]">{badge.label}</span>
              </div>
              <span className="text-[10px] font-semibold text-[#3D3D3D]/50">{bonsValides} bon{bonsValides > 1 ? 's' : ''} validé{bonsValides > 1 ? 's' : ''}</span>
            </div>
            {badge.next && (
              <>
                <div className="w-full bg-[#E0E0E0] rounded-full h-2 mb-1.5">
                  <div
                    className="h-2 rounded-full bg-[#FF6B00] transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#3D3D3D]/50">{badge.desc}</p>
              </>
            )}
            {!badge.next && (
              <p className="text-[10px] text-[#FF6B00] font-semibold">{badge.desc}</p>
            )}
          </div>
        </section>

        {/* ── Mes villes ── */}
        <section className="bg-white rounded-3xl px-5 py-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00]">Mes villes</p>
            <button
              onClick={() => setShowVilleOverlay(true)}
              className="text-xs font-bold text-[#FF6B00] border border-[#FF6B00] px-3 py-1 rounded-full hover:bg-[#FFF0E0] transition-colors min-h-[32px]"
            >
              + Ajouter une ville
            </button>
          </div>

          {(!profile.villes_abonnees || profile.villes_abonnees.length === 0) ? (
            <p className="text-sm text-[#3D3D3D]/50 text-center py-4">
              Tu n'es abonné à aucune ville pour l'instant.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {profile.villes_abonnees.map(ville => (
                <div key={ville} className="flex items-center justify-between py-2.5 border-b border-[#F5F5F5] last:border-0">
                  <div>
                    <p className="text-sm font-bold text-[#0A0A0A]">📍 {ville}</p>
                    <p className="text-[11px] text-[#3D3D3D]/50">
                      {villeCounts[ville] !== undefined
                        ? `${villeCounts[ville]} offre${villeCounts[ville] > 1 ? 's' : ''} active${villeCounts[ville] > 1 ? 's' : ''}`
                        : '—'}
                    </p>
                  </div>
                  <button
                    onClick={() => desabonnerVille(ville)}
                    className="text-[10px] font-semibold text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 px-2.5 py-1 rounded-full transition-colors"
                  >
                    Se désabonner
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Mes commerces favoris ── */}
        <section className="bg-white rounded-3xl px-5 py-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00] mb-4">Mes commerces favoris</p>

          {favorisDetails.length === 0 ? (
            <p className="text-sm text-[#3D3D3D]/50 text-center py-4">
              Aucun commerce en favori pour l'instant.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {favorisDetails.map(commerce => (
                <div key={commerce.id} className="flex items-center gap-3 py-2.5 border-b border-[#F5F5F5] last:border-0">
                  {commerce.photo_url ? (
                    <img src={commerce.photo_url} alt={commerce.nom} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-[#FFF0E0] flex items-center justify-center text-lg shrink-0">🏪</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#0A0A0A] truncate">{commerce.nom}</p>
                    {commerce.ville && <p className="text-[11px] text-[#3D3D3D]/50">📍 {commerce.ville}</p>}
                  </div>
                  <button
                    onClick={() => retirerFavori(commerce.id)}
                    aria-label={`Retirer ${commerce.nom} des favoris`}
                    className="shrink-0"
                  >
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#FF6B00]">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Mes notifications ── */}
        <section className="bg-white rounded-3xl px-5 py-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00] mb-2">Mes notifications</p>
          <Toggle
            value={profile.notifications_email ?? true}
            onChange={toggleEmailNotif}
            label="📧 Email quotidien"
            sublabel="Bons plans du lendemain chaque soir"
          />
          <Toggle
            value={profile.notifications_push ?? false}
            onChange={togglePushNotif}
            label="🔔 Notifications push"
            sublabel="Alertes en temps réel sur cet appareil"
          />
        </section>

        {/* ── Mes bons ── */}
        <section className="bg-white rounded-3xl px-5 py-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B00] mb-4">Mes bons</p>

          {resaSorted.length === 0 ? (
            <p className="text-sm text-[#3D3D3D]/50 text-center py-4">
              Aucune réservation pour l'instant.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {resaSorted.map(resa => {
                const pastille = statutPastille(resa.statut)
                return (
                  <div key={resa.id} className="border border-[#F0F0F0] rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#0A0A0A] truncate">
                        {resa.offres?.commerces?.nom || '—'}
                      </p>
                      <p className="text-xs text-[#3D3D3D]/60 truncate">{resa.offres?.titre}</p>
                      <p className="text-[10px] text-[#3D3D3D]/40 mt-0.5">
                        {new Date(resa.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: pastille.color }}
                      >
                        {pastille.label}
                      </span>
                      {resa.statut === 'reservee' && (
                        <Link
                          href={`/bon/${resa.id}`}
                          className="text-[10px] font-bold text-[#FF6B00] underline underline-offset-1"
                        >
                          Voir mon bon
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Déconnexion ── */}
        <button
          onClick={() => signOut().then(() => router.push('/'))}
          className="w-full border border-[#E0E0E0] text-sm font-semibold text-[#3D3D3D] py-3 rounded-2xl hover:border-[#FF6B00] hover:text-[#FF6B00] transition-colors"
        >
          Déconnexion
        </button>

        {/* ── Supprimer le compte ── */}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs text-red-400 hover:text-red-600 text-center py-2 transition-colors"
          >
            Supprimer mon compte
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex flex-col gap-3">
            <p className="text-sm font-bold text-red-600">
              Es-tu sûr ? Toutes tes données seront supprimées sous 30 jours.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 border border-[#E0E0E0] text-sm font-semibold py-2.5 rounded-xl"
              >
                Annuler
              </button>
              <button
                onClick={supprimerCompte}
                disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center"
              >
                {deleting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : 'Oui, supprimer'}
              </button>
            </div>
          </div>
        )}

        <div className="h-8" />
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-[#0A0A0A] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl max-w-[90vw] text-center">
          {toast}
        </div>
      )}

      {/* Overlay ajout de ville */}
      <VilleSearchOverlay
        isOpen={showVilleOverlay}
        onClose={() => setShowVilleOverlay(false)}
        villesBonmoment={villesBonmoment}
        onSelectActive={abonnerVille}
        onSubscribed={abonnerVille}
      />
    </main>
  )
}
