'use client'

import { useState, useCallback } from 'react'
import { useToast } from './Toast'

export default function ReviewOverlay({ reservationId, commerceId, commerceNom, placeId, onClose }) {
  const [step,        setStep]        = useState('stars')
  const [note,        setNote]        = useState(0)
  const [hover,       setHover]       = useState(0)
  const [commentaire, setCommentaire] = useState('')
  const [sending,     setSending]     = useState(false)
  const [toast,       setToast]       = useState(false)
  const { showToast } = useToast()

  const handleStarClick = useCallback(async (n) => {
    setNote(n)
    if (n >= 4) {
      /* 4-5 étoiles : INSERT BDD + ouvre Google + ferme */
      try {
        await fetch('/api/avis-google', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservation_id: reservationId, commerce_id: commerceId, note: n }),
        })
      } catch {}
      window.open(`https://search.google.com/local/writereview?placeid=${placeId}`, '_blank', 'noopener')
      showToast('Merci ! ⭐')
      setTimeout(onClose, 1000)
    } else {
      setStep('feedback')
    }
  }, [reservationId, commerceId, placeId, onClose, showToast])

  const handleFeedbackSend = useCallback(async () => {
    setSending(true)
    try {
      await fetch('/api/feedback-commerce', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId, commerce_id: commerceId, note, commentaire }),
      })
    } catch {}
    setSending(false)
    setToast(true)
    setTimeout(onClose, 1800)
  }, [reservationId, commerceId, note, commentaire, onClose])

  const activeStars = hover || note
  const starStyle = (i) => ({
    fontSize: '40px', cursor: 'pointer',
    color: i <= activeStars ? '#FF6B00' : '#D1D5DB',
    transition: 'color 0.1s', lineHeight: 1, userSelect: 'none',
  })

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-6">
      <div className="bg-white rounded-3xl px-6 py-8 w-full max-w-sm flex flex-col items-center gap-5 shadow-2xl">
        {step === 'stars' && (
          <>
            {reservationId && (
              <p className="text-base font-black text-[#0A0A0A] text-center">✅ Bon validé !</p>
            )}
            <p className="text-base font-bold text-[#0A0A0A] text-center leading-snug">
              Comment s&apos;est passée ton expérience chez <span className="text-[#FF6B00]">{commerceNom}</span> ?
            </p>
            <div className="flex gap-3" role="group" aria-label="Note">
              {[1,2,3,4,5].map(i => (
                <button key={i} onClick={() => handleStarClick(i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)} style={starStyle(i)} aria-label={`${i} étoile${i>1?'s':''}`}>
                  {i <= activeStars ? '★' : '☆'}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Plus tard</button>
          </>
        )}
        {step === 'feedback' && (
          <>
            <p className="text-lg font-black text-[#0A0A0A] text-center">Merci pour ton retour 🙏</p>
            <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} rows={3}
              placeholder="Qu'est-ce qui pourrait être amélioré ?"
              className="w-full border border-[#E0E0E0] rounded-2xl px-4 py-3 text-sm text-[#0A0A0A] resize-none outline-none focus:border-[#FF6B00] transition-colors"
            />
            {toast ? (
              <div className="w-full text-center text-sm font-bold text-green-600 py-2">Merci, ton avis a été transmis !</div>
            ) : (
              <button onClick={handleFeedbackSend} disabled={sending} className="w-full bg-[#FF6B00] hover:bg-[#CC5500] disabled:opacity-60 text-white font-bold text-base py-4 rounded-2xl transition-colors">
                {sending ? 'Envoi…' : 'Envoyer mon avis'}
              </button>
            )}
            <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Passer</button>
          </>
        )}
      </div>
    </div>
  )
}
