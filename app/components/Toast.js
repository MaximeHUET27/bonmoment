'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'

/* ── Contexte global ── */
const ToastCtx = createContext({ showToast: () => {} })
let _id = 0

/* ── Détection automatique de la variante depuis le contenu ── */
function autoVariant(message) {
  if (!message) return 'info'
  const m = String(message)
  if (m.startsWith('😔') || m.startsWith('⚠️') || m.startsWith('✗') || m.startsWith('Erreur')) return 'erreur'
  if (m.startsWith('❤️') || m.startsWith('✅') || m.startsWith('✓') || m.startsWith('Abonné')) return 'success'
  return 'info'
}

const BORDER = { success: '#22C55E', erreur: '#EF4444', info: '#FF6B00' }

/* ── Item visuel ── */
function ToastItem({ id, message, variant = 'auto', duration = 4000, onDone }) {
  const [exiting,  setExiting]  = useState(false)
  const [progress, setProgress] = useState(100)
  const v = variant === 'auto' ? autoVariant(message) : (variant || autoVariant(message))

  useEffect(() => {
    const tick = 50
    const step = (tick / duration) * 100
    const timer = setInterval(() => {
      setProgress(p => {
        const next = p - step
        if (next <= 0) {
          clearInterval(timer)
          setExiting(true)
          setTimeout(() => onDone(id), 360)
          return 0
        }
        return next
      })
    }, tick)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function dismiss() {
    if (exiting) return
    setExiting(true)
    setTimeout(() => onDone(id), 360)
  }

  return (
    <div
      onClick={dismiss}
      style={{
        animation: exiting
          ? 'bm-toast-out 0.35s cubic-bezier(0.4,0,1,1) forwards'
          : 'bm-toast-in 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        borderLeft: `4px solid ${BORDER[v] || BORDER.info}`,
      }}
      className="bg-white text-[#0A0A0A] text-sm font-semibold px-4 py-3 rounded-2xl shadow-2xl overflow-hidden relative cursor-pointer select-none w-full sm:w-auto sm:min-w-[280px] sm:max-w-sm"
      role="alert"
    >
      <p className="pr-1">{message}</p>
      {/* Barre de progression */}
      <div
        className="absolute bottom-0 left-0 h-[3px] rounded-b"
        style={{
          width: `${progress}%`,
          backgroundColor: BORDER[v] || BORDER.info,
          transition: 'width 50ms linear',
        }}
      />
    </div>
  )
}

/* ── Container (rendu par ToastProvider) ── */
function ToastContainer({ toasts, onDone }) {
  if (toasts.length === 0) return null
  return (
    <>
      <style>{`
        @keyframes bm-toast-in {
          from { opacity:0; transform:translateY(-110%) scale(0.95) }
          to   { opacity:1; transform:translateY(0) scale(1) }
        }
        @keyframes bm-toast-out {
          from { opacity:1; transform:translateY(0) scale(1) }
          to   { opacity:0; transform:translateY(-110%) scale(0.95) }
        }
      `}</style>
      <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-[990] flex flex-col gap-2 items-stretch sm:items-end pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem {...t} onDone={onDone} />
          </div>
        ))}
      </div>
    </>
  )
}

/* ── Provider — à placer dans app/layout.js ── */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, variant = 'auto', duration = 4000) => {
    const id = ++_id
    setToasts(prev => [...prev, { id, message, variant, duration }])
  }, [])

  const onDone = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastCtx.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDone={onDone} />
    </ToastCtx.Provider>
  )
}

/* ── Hook ── */
export function useToast() {
  return useContext(ToastCtx)
}
