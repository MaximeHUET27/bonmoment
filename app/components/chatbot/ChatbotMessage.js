'use client'

import { useState, useEffect, useRef } from 'react'

/**
 * Affiche un message avec effet typewriter (15ms/char).
 * Cliquer sur le message passe instantanément à la fin.
 */
export default function ChatbotMessage({ text, onDone }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone]           = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!text) { setDisplayed(''); setDone(true); onDone?.(); return }
    setDisplayed('')
    setDone(false)

    let i = 0
    intervalRef.current = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(intervalRef.current)
        setDone(true)
        onDone?.()
      }
    }, 15)

    return () => clearInterval(intervalRef.current)
  }, [text]) // eslint-disable-line react-hooks/exhaustive-deps

  function skip() {
    if (done) return
    clearInterval(intervalRef.current)
    setDisplayed(text)
    setDone(true)
    onDone?.()
  }

  return (
    <div onClick={skip} className={done ? '' : 'cursor-pointer'}>
      <p className="text-sm text-[#0A0A0A] whitespace-pre-line leading-relaxed">
        {displayed}
        {!done && <span className="inline-block w-0.5 h-3.5 bg-[#FF6B00] ml-0.5 align-middle animate-pulse" />}
      </p>
    </div>
  )
}
