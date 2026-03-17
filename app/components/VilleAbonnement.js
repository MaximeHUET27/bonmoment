'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import AuthBottomSheet from './AuthBottomSheet'
import NotifBottomSheet from './NotifBottomSheet'

/**
 * Bouton d'abonnement à une ville avec persistance Supabase.
 * Gère l'auth, le toggle abonnement, et les préférences de notifications.
 *
 * @param {string} villeNom - Nom de la ville
 * @param {string} className - Classes CSS supplémentaires
 */
export default function VilleAbonnement({ villeNom, className = '' }) {
  const { user, supabase } = useAuth()
  const [abonne,    setAbonne]    = useState(false)
  const [showAuth,  setShowAuth]  = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [toast,     setToast]     = useState(null)

  /* Lire le statut d'abonnement depuis Supabase au montage */
  useEffect(() => {
    if (!user || !villeNom) return
    supabase
      .from('users')
      .select('villes_abonnees')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.villes_abonnees) {
          setAbonne(data.villes_abonnees.includes(villeNom))
        }
      })
  }, [user, villeNom, supabase])

  function afficherToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  async function subscribe() {
    setLoading(true)
    const { error } = await supabase.rpc('array_append_unique', {
      table_name:  'users',
      column_name: 'villes_abonnees',
      value:       villeNom,
      row_id:      user.id,
    }).catch(() => ({ error: true }))

    // Fallback : UPDATE direct si la RPC n'existe pas encore
    if (error) {
      await supabase
        .from('users')
        .update({
          villes_abonnees: supabase.rpc
            ? undefined
            : [villeNom],
        })
        .eq('id', user.id)

      // Vraiment en fallback : on lit d'abord, puis on met à jour
      const { data: current } = await supabase
        .from('users')
        .select('villes_abonnees')
        .eq('id', user.id)
        .single()

      const existant = current?.villes_abonnees || []
      if (!existant.includes(villeNom)) {
        await supabase
          .from('users')
          .update({ villes_abonnees: [...existant, villeNom] })
          .eq('id', user.id)
      }
    }

    setAbonne(true)
    setLoading(false)
    afficherToast(`🎉 Tu es abonné à ${villeNom} ! Tu recevras les bons plans chaque soir à 21h.`)
    setShowNotif(true)
  }

  async function unsubscribe() {
    setLoading(true)
    const { data: current } = await supabase
      .from('users')
      .select('villes_abonnees')
      .eq('id', user.id)
      .single()

    const next = (current?.villes_abonnees || []).filter(v => v !== villeNom)
    await supabase
      .from('users')
      .update({ villes_abonnees: next })
      .eq('id', user.id)

    setAbonne(false)
    setLoading(false)
    afficherToast(`Tu t'es désabonné de ${villeNom}.`)
  }

  async function handleClick() {
    if (!user) {
      setShowAuth(true)
      return
    }
    if (abonne) {
      await unsubscribe()
    } else {
      await subscribe()
    }
  }

  /* Après connexion OAuth : s'abonner automatiquement */
  useEffect(() => {
    if (!user || !villeNom) return
    const pendingVille = sessionStorage.getItem('pendingAbonnementVille')
    if (pendingVille === villeNom) {
      sessionStorage.removeItem('pendingAbonnementVille')
      subscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors min-h-[36px] flex items-center gap-1.5 ${
          abonne
            ? 'bg-[#FF6B00] text-white'
            : 'border border-[#FF6B00] text-[#FF6B00] hover:bg-[#FFF0E0]'
        } ${loading ? 'opacity-60' : ''} ${className}`}
      >
        {loading ? (
          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : abonne ? '✅ Abonné' : "📌 S'abonner à cette ville"}
      </button>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-[#0A0A0A] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl max-w-[90vw] text-center animate-fade-in-up">
          {toast}
        </div>
      )}

      {/* Auth bottom sheet si pas connecté */}
      <AuthBottomSheet
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        redirectAfter={typeof window !== 'undefined' ? window.location.pathname : '/'}
        onBeforeRedirect={() => {
          if (villeNom) sessionStorage.setItem('pendingAbonnementVille', villeNom)
        }}
      />

      {/* Notif bottom sheet après abonnement */}
      <NotifBottomSheet
        isOpen={showNotif}
        onClose={() => setShowNotif(false)}
        villeNom={villeNom}
      />
    </>
  )
}
