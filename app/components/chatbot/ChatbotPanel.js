'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import ChatbotMessage from './ChatbotMessage'
import { NODES } from './chatbotData'

/* ── Bulles ──────────────────────────────────────────────────────────────── */

function BotBubble({ children }) {
  return (
    <div className="flex items-end gap-2 max-w-[90%]">
      <div className="shrink-0 w-7 h-7 rounded-full bg-[#FF6B00] flex items-center justify-center text-white text-[10px] font-black mb-0.5 select-none">
        BM
      </div>
      <div className="bg-white border border-[#F0F0F0] rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        {children}
      </div>
    </div>
  )
}

function UserBubble({ text }) {
  return (
    <div className="flex justify-end">
      <div className="bg-[#FF6B00] rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%]">
        <p className="text-sm text-white font-semibold">{text}</p>
      </div>
    </div>
  )
}

/* ── Résolution du texte conditionnel (PWA mobile/desktop) ──────────────── */

function resolveText(value, deviceType) {
  if (typeof value === 'string') return value
  return value?.[deviceType] || value?.mobile || ''
}

function resolveActions(value, deviceType) {
  if (Array.isArray(value)) return value
  return value?.[deviceType] || value?.mobile || []
}

/* ── Composant principal ─────────────────────────────────────────────────── */

export default function ChatbotPanel({ onClose, context = {} }) {
  const router = useRouter()
  const { user, supabase } = useAuth()

  const [role,     setRole]     = useState(null)   // 'guest'|'habitant'|'commercant'
  const [history,  setHistory]  = useState([])     // pile des nodeIds visités
  const [nodeId,   setNodeId]   = useState(null)   // nœud courant

  // État de la réponse courante (nœud answer)
  const [msgDone,      setMsgDone]      = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [feedbackVal,  setFeedbackVal]  = useState(null) // true|false|null

  const endRef = useRef(null)
  const deviceType = context.deviceType || 'desktop'

  /* ── Détection du rôle ── */
  useEffect(() => {
    async function detect() {
      if (!user) { setRole('guest'); return }
      if (!supabase) { setRole('habitant'); return }
      try {
        const { data } = await supabase
          .from('commerces')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle()
        setRole(data ? 'commercant' : 'habitant')
      } catch {
        setRole('habitant')
      }
    }
    detect()
  }, [user, supabase])

  /* ── Choix du nœud initial selon le rôle ── */
  useEffect(() => {
    if (!role) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (role === 'commercant') setNodeId('c-cat')
    else if (role === 'habitant') setNodeId('h-cat')
    else setNodeId('root')
  }, [role])

  /* ── Auto-scroll ── */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [nodeId, msgDone])

  /* ── Navigation ── */
  function navigate(targetId) {
    setHistory(prev => [...prev, nodeId])
    setNodeId(targetId)
    setMsgDone(false)
    setFeedbackSent(false)
    setFeedbackVal(null)
  }

  function goBack() {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    setNodeId(prev)
    setMsgDone(false)
    setFeedbackSent(false)
    setFeedbackVal(null)
  }

  function goHome() {
    setHistory([])
    if (role === 'commercant') setNodeId('c-cat')
    else if (role === 'habitant') setNodeId('h-cat')
    else setNodeId('root')
    setMsgDone(false)
    setFeedbackSent(false)
    setFeedbackVal(null)
  }

  /* ── Exécution d'une action CTA ── */
  function handleAction(action) {
    if (action.type === 'redirect') {
      onClose()
      router.push(action.path)
    } else if (action.type === 'external') {
      window.open(action.payload, '_blank', 'noopener noreferrer')
    } else if (action.type === 'event') {
      window.dispatchEvent(new Event(action.payload))
      if (action.payload !== 'bonmoment:openvilles') onClose()
    }
  }

  /* ── Feedback Supabase ── */
  async function sendFeedback(helpful) {
    if (feedbackSent) return
    setFeedbackVal(helpful)
    setFeedbackSent(true)
    try {
      if (supabase) {
        await supabase.from('chatbot_feedbacks').insert({
          question_id: nodeId,
          helpful,
          user_role: role || 'guest',
        })
      }
    } catch { /* silent */ }
  }

  /* ── Chargement rôle ── */
  if (!role || !nodeId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="w-7 h-7 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const node = NODES[nodeId]
  if (!node) return null

  const isRoot    = history.length === 0
  const isMenu    = node.type === 'menu'
  const isAnswer  = node.type === 'answer'

  // Texte et actions potentiellement conditionnels (ex: PWA mobile/desktop)
  const responseText    = isAnswer ? resolveText(node.response, deviceType) : ''
  const responseActions = isAnswer ? resolveActions(node.actions || [], deviceType) : []

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Fil de conversation ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0">

        {/* Question utilisateur (sauf racine) */}
        {isAnswer && node.question && (
          <UserBubble text={node.question} />
        )}

        {/* Message bot */}
        <BotBubble>
          {isAnswer ? (
            <ChatbotMessage
              text={responseText}
              onDone={() => setMsgDone(true)}
            />
          ) : (
            <p className="text-sm text-[#0A0A0A] leading-relaxed">{node.message}</p>
          )}
        </BotBubble>

        {/* Boutons de navigation (menu) */}
        {isMenu && (
          <div className="flex flex-col gap-2">
            {node.options.map(opt => (
              <button
                key={opt.nodeId}
                onClick={() => navigate(opt.nodeId)}
                className="w-full text-left px-4 py-3 rounded-xl border border-[#EBEBEB] bg-white hover:bg-[#FFF0E0] hover:border-[#FF6B00] text-sm text-[#0A0A0A] font-medium transition-colors min-h-[44px] active:scale-[0.98]"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Actions CTA + Feedback (answer) */}
        {isAnswer && msgDone && (
          <>
            {/* Boutons d'action */}
            {responseActions.length > 0 && (
              <div className="flex flex-wrap gap-2 pl-9">
                {responseActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => handleAction(action)}
                    className="text-xs font-bold px-4 py-2 rounded-full bg-[#FF6B00] text-white hover:bg-[#CC5500] transition-colors min-h-[34px]"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* Feedback */}
            <div className="pl-9">
              {!feedbackSent ? (
                <div>
                  <p className="text-[11px] text-[#3D3D3D]/50 font-medium mb-1.5">
                    C&apos;était utile ?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => sendFeedback(true)}
                      className="text-xs font-bold px-3 py-1.5 rounded-full border border-green-300 text-green-600 hover:bg-green-50 transition-colors min-h-[30px]"
                    >
                      👍 Oui
                    </button>
                    <button
                      onClick={() => sendFeedback(false)}
                      className="text-xs font-bold px-3 py-1.5 rounded-full border border-[#EBEBEB] text-[#3D3D3D]/60 hover:bg-[#F5F5F5] transition-colors min-h-[30px]"
                    >
                      👎 Non
                    </button>
                  </div>
                </div>
              ) : feedbackVal === true ? (
                <p className="text-[11px] text-green-600 font-medium">Merci ! 😊</p>
              ) : (
                <div>
                  <p className="text-[11px] text-[#3D3D3D]/50 font-medium mb-1.5">Désolé ! 😕</p>
                  <button
                    onClick={() => handleAction({ type: 'redirect', path: '/aide/contact' })}
                    className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#F5F5F5] text-[#3D3D3D] hover:bg-[#FFF0E0] hover:text-[#FF6B00] transition-colors"
                  >
                    📧 Contacter l&apos;équipe BONMOMENT
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        <div ref={endRef} />
      </div>

      {/* ── Barre de navigation (retour / menu) ── */}
      {!isRoot && (
        <div className="shrink-0 flex gap-2 px-4 py-3 border-t border-[#EBEBEB] bg-white">
          <button
            onClick={goBack}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-[#3D3D3D]/60 hover:text-[#FF6B00] bg-[#F5F5F5] hover:bg-[#FFF0E0] py-2.5 rounded-xl transition-colors min-h-[40px]"
          >
            ← Retour
          </button>
          <button
            onClick={goHome}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-[#3D3D3D]/60 hover:text-[#FF6B00] bg-[#F5F5F5] hover:bg-[#FFF0E0] py-2.5 rounded-xl transition-colors min-h-[40px]"
          >
            🏠 Menu
          </button>
        </div>
      )}
    </div>
  )
}
