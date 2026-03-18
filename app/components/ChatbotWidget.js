'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import TREE from '@/data/chatbot-tree'

/* ── Message bubble ─────────────────────────────────────────────────────── */

function BotBubble({ text }) {
  return (
    <div className="flex items-end gap-2 max-w-[85%]">
      {/* Avatar */}
      <div className="shrink-0 w-7 h-7 rounded-full bg-[#FF6B00] flex items-center justify-center text-white text-[10px] font-black mb-0.5">
        BM
      </div>
      <div className="bg-white border border-[#F0F0F0] rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <p className="text-sm text-[#0A0A0A] whitespace-pre-line leading-relaxed">{text}</p>
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

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 max-w-[85%]">
      <div className="shrink-0 w-7 h-7 rounded-full bg-[#FF6B00] flex items-center justify-center text-white text-[10px] font-black mb-0.5">
        BM
      </div>
      <div className="bg-white border border-[#F0F0F0] rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <style>{`
          @keyframes typingDot {
            0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
            40%            { transform: scale(1);   opacity: 1;   }
          }
        `}</style>
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-[#FF6B00] block"
              style={{ animation: `typingDot 1.2s ${i * 0.2}s infinite ease-in-out` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Composant principal ────────────────────────────────────────────────── */

export default function ChatbotWidget() {
  const router = useRouter()

  const [isOpen,       setIsOpen]       = useState(false)
  const [messages,     setMessages]     = useState([])     // {type:'bot'|'user', text}[]
  const [isTyping,     setIsTyping]     = useState(false)
  const [buttons,      setButtons]      = useState([])
  const [showButtons,  setShowButtons]  = useState(false)
  const [locked,       setLocked]       = useState(false)  // prevent double clicks

  const endRef = useRef(null)

  /* Auto-scroll */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping, showButtons])

  /* Show start node when opened */
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      showNode('start', null)
    }
  }, [isOpen]) // eslint-disable-line

  function addMessage(msg) {
    setMessages(prev => [...prev, msg])
  }

  const showNode = useCallback((nodeId, userLabel) => {
    const node = TREE[nodeId]
    if (!node) return

    setLocked(true)
    setShowButtons(false)
    setButtons([])

    // Add user bubble
    if (userLabel) {
      addMessage({ type: 'user', text: userLabel })
    }

    if (node.bot) {
      // Show typing indicator
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        addMessage({ type: 'bot', text: node.bot })

        // Show buttons after message
        if (node.buttons && node.buttons.length > 0) {
          setTimeout(() => {
            setButtons(node.buttons)
            setShowButtons(true)
            setLocked(false)
          }, 500)
        } else {
          setLocked(false)
        }

        // Execute action
        if (node.action) {
          if (node.action.type === 'navigate') {
            setTimeout(() => {
              router.push(node.action.path)
              handleClose()
            }, 900)
          } else if (node.action.type === 'autoclose') {
            setTimeout(handleClose, node.action.delay)
          }
        }
      }, 350)
    } else {
      // No bot message — execute action directly
      if (node.action?.type === 'navigate') {
        router.push(node.action.path)
        handleClose()
      }
      setLocked(false)
    }
  }, [router]) // eslint-disable-line

  function handleButtonClick(btn) {
    if (locked) return
    showNode(btn.next, btn.label)
  }

  function handleClose() {
    setIsOpen(false)
  }

  function handleOpen() {
    setIsOpen(true)
  }

  function handleRestart() {
    setMessages([])
    setButtons([])
    setShowButtons(false)
    setIsTyping(false)
    setLocked(false)
    setTimeout(() => showNode('start', null), 50)
  }

  return (
    <>
      {/* ── Floating button ─────────────────────────────────────────────── */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          aria-label="Ouvrir le chatbot d'aide"
          className="fixed bottom-20 right-4 z-[45] w-14 h-14 rounded-full bg-[#FF6B00] text-white shadow-xl shadow-orange-300/50 flex items-center justify-center hover:bg-[#CC5500] active:scale-95 transition-all duration-200"
        >
          <span className="text-2xl font-black leading-none">?</span>
        </button>
      )}

      {/* ── Panel ───────────────────────────────────────────────────────── */}
      {isOpen && (
        <>
          {/* Backdrop on mobile */}
          <div
            className="fixed inset-0 bg-black/30 z-[46] md:hidden"
            onClick={handleClose}
            aria-hidden
          />

          <div
            className="fixed z-[47] flex flex-col bg-[#F8F8F8]
              inset-0
              md:inset-auto md:bottom-4 md:right-4 md:w-[400px] md:h-[80vh] md:rounded-3xl md:shadow-2xl"
            style={{ animation: 'chatSlideIn 0.3s cubic-bezier(0.22,1,0.36,1) forwards' }}
          >
            <style>{`
              @keyframes chatSlideIn {
                from { transform: translateY(20px); opacity: 0; }
                to   { transform: translateY(0);    opacity: 1; }
              }
            `}</style>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-[#FF6B00] text-white md:rounded-t-3xl shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-black">
                  💬
                </div>
                <div>
                  <p className="font-black text-base leading-none">BON&apos;Aide</p>
                  <p className="text-[11px] text-white/70 mt-0.5">Réponses instantanées</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors text-lg"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
              {messages.map((msg, i) =>
                msg.type === 'bot'
                  ? <BotBubble key={i} text={msg.text} />
                  : <UserBubble key={i} text={msg.text} />
              )}

              {isTyping && <TypingIndicator />}

              {/* Buttons */}
              {showButtons && buttons.length > 0 && (
                <div className="flex flex-wrap gap-2 pl-9 mt-1">
                  {buttons.map((btn, i) => (
                    <button
                      key={i}
                      onClick={() => handleButtonClick(btn)}
                      className="text-xs font-bold px-4 py-2.5 rounded-full border-2 border-[#FF6B00] text-[#FF6B00] hover:bg-[#FF6B00] hover:text-white transition-colors min-h-[36px] text-left"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}

              <div ref={endRef} />
            </div>

            {/* Footer — Restart */}
            <div className="shrink-0 px-4 py-3 border-t border-[#EBEBEB] bg-white md:rounded-b-3xl">
              <button
                onClick={handleRestart}
                className="w-full text-xs font-semibold text-[#3D3D3D]/50 hover:text-[#FF6B00] transition-colors flex items-center justify-center gap-1.5 min-h-[32px]"
              >
                <span>🔄</span> Recommencer
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
