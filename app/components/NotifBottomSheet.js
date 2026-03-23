'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/context/AuthContext'

/**
 * Bottom sheet affiché après l'abonnement à une ville.
 * Permet de choisir les préférences de notifications.
 */
export default function NotifBottomSheet({ isOpen, onClose, villeNom }) {
  const { user, supabase } = useAuth()
  const [emailOn, setEmailOn]   = useState(true)
  const [pushOn,  setPushOn]    = useState(false)
  const [saving,  setSaving]    = useState(false)

  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new Event('bonmoment:bottomsheet-open'))
    } else {
      window.dispatchEvent(new Event('bonmoment:bottomsheet-close'))
    }
  }, [isOpen])

  if (!isOpen) return null

  async function demandePush() {
    if (!('Notification' in window)) return false
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return false

    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
      if (user) {
        await supabase
          .from('users')
          .update({ push_subscription: sub.toJSON() })
          .eq('id', user.id)
      }
      return true
    } catch {
      return false
    }
  }

  async function handleTogglePush() {
    if (!pushOn) {
      const granted = await demandePush()
      if (granted) {
        setPushOn(true)
        await supabase
          .from('users')
          .update({ notifications_push: true })
          .eq('id', user.id)
      }
    } else {
      setPushOn(false)
      if (user) {
        await supabase
          .from('users')
          .update({ notifications_push: false })
          .eq('id', user.id)
      }
    }
  }

  async function handleSave() {
    setSaving(true)
    if (user) {
      await supabase
        .from('users')
        .update({ notifications_email: emailOn })
        .eq('id', user.id)
    }
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl px-6 pt-6 pb-10 sm:pb-6 shadow-2xl">
        <div className="w-10 h-1 bg-[#E0E0E0] rounded-full mx-auto mb-5 sm:hidden" />

        <h2 className="text-lg font-black text-[#0A0A0A] mb-1">
          Comment veux-tu être alerté ?
        </h2>
        <p className="text-xs text-[#3D3D3D]/60 mb-5">
          Pour les bons plans de <span className="font-bold text-[#FF6B00]">{villeNom}</span>
        </p>

        {/* Toggle email */}
        <div className="flex items-center justify-between py-4 border-b border-[#F5F5F5]">
          <div>
            <p className="text-sm font-bold text-[#0A0A0A]">📧 Recevoir les offres par email</p>
            <p className="text-xs text-[#3D3D3D]/50 mt-0.5">Les bons plans du lendemain chaque soir à 21h</p>
          </div>
          <button
            onClick={() => setEmailOn(v => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ml-3 ${emailOn ? 'bg-[#FF6B00]' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${emailOn ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Toggle push */}
        <div className="flex items-center justify-between py-4 border-b border-[#F5F5F5]">
          <div>
            <p className="text-sm font-bold text-[#0A0A0A]">🔔 Notifications push</p>
            <p className="text-xs text-[#3D3D3D]/50 mt-0.5">Alertes en temps réel sur cet appareil</p>
          </div>
          <button
            onClick={handleTogglePush}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${pushOn ? 'bg-[#FF6B00]' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${pushOn ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-5 w-full bg-[#FF6B00] hover:bg-[#CC5500] text-white font-black text-sm py-3.5 rounded-2xl transition-colors min-h-[48px] flex items-center justify-center"
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : 'Valider mes préférences'}
        </button>
      </div>
    </div>
  )
}
