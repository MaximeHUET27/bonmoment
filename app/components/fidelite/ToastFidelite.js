'use client'

import { useEffect } from 'react'

const CONFIG = {
  success: { bg: 'bg-green-500',  icon: '✓' },
  warning: { bg: 'bg-orange-400', icon: '⏰' },
  error:   { bg: 'bg-red-500',    icon: '✗' },
}

export default function ToastFidelite({ type = 'success', message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2000)
    return () => clearTimeout(t)
  }, [onClose])

  const { bg, icon } = CONFIG[type] ?? CONFIG.success

  return (
    <>
      <style>{`
        @keyframes toast-in-out {
          0%   { opacity: 0; transform: translateX(-50%) translateY(10px); }
          12%  { opacity: 1; transform: translateX(-50%) translateY(0);    }
          75%  { opacity: 1; transform: translateX(-50%) translateY(0);    }
          100% { opacity: 0; transform: translateX(-50%) translateY(-4px); }
        }
      `}</style>
      <div
        className={`fixed bottom-6 left-1/2 z-[60] px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-white font-bold text-sm ${bg}`}
        style={{ animation: 'toast-in-out 2s ease forwards' }}
        aria-live="polite"
      >
        <span>{icon}</span>
        <span>{message}</span>
      </div>
    </>
  )
}
