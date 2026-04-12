'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

function getTimeLeft(date) {
  if (!date) return null
  const diff = new Date(date) - new Date()
  if (diff <= 0) return null
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return { h, m, s, diff }
}

function useCountdown(dateFin) {
  const [timeLeft, setTimeLeft] = useState(() => dateFin ? getTimeLeft(dateFin) : null)

  useEffect(() => {
    if (!dateFin) return
    const timer = setInterval(() => setTimeLeft(getTimeLeft(dateFin)), 1000)
    return () => clearInterval(timer)
  }, [dateFin])

  return timeLeft
}

function OffreCountdown({ dateFin, nbBonsRestants }) {
  const timeLeft = useCountdown(dateFin)
  const urgent = timeLeft && timeLeft.diff < 3600000
  const peuRestants = nbBonsRestants <= 5

  return (
    <div className={`w-full px-2 py-1.5 rounded-lg flex flex-col gap-0.5 ${urgent ? 'bg-red-50' : 'bg-[#F5F5F5]'}`}>
      {timeLeft ? (
        <p className={`text-xs font-black tabular-nums ${urgent ? 'text-red-500' : 'text-[#0A0A0A]'}`}>
          ⏱ {String(timeLeft.h).padStart(2,'0')}h {String(timeLeft.m).padStart(2,'0')}m {String(timeLeft.s).padStart(2,'0')}s
        </p>
      ) : (
        <p className="text-xs font-bold text-red-500">⏱ Expirée</p>
      )}
      <p className={`text-[10px] font-semibold ${peuRestants ? 'text-red-500' : 'text-[#3D3D3D]'}`}>
        🎫 {nbBonsRestants} bon{nbBonsRestants > 1 ? 's' : ''} restant{nbBonsRestants > 1 ? 's' : ''}
      </p>
    </div>
  )
}

export default function ScrollingBanner({ items, speed = 0.5 }) {
  const scrollRef = useRef(null)
  const isPaused = useRef(false)
  const posRef = useRef(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let raf

    function step() {
      if (!isPaused.current && el) {
        posRef.current += speed
        if (posRef.current >= el.scrollWidth / 2) {
          posRef.current = 0
        }
        el.scrollLeft = posRef.current
      }
      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [speed])

  function pause() { isPaused.current = true }
  function resume() {
    posRef.current = scrollRef.current?.scrollLeft || 0
    isPaused.current = false
  }

  function scrollBy(direction) {
    const el = scrollRef.current
    if (!el) return
    const step = 180
    let next = posRef.current + direction * step
    if (next < 0) next = 0
    if (next >= el.scrollWidth / 2) next = 0
    posRef.current = next
    el.scrollLeft = next
  }

  if (!items || items.length === 0) return null

  // Multiplier suffisamment pour garantir le défilement infini quel que soit le nombre d'items
  const repeat = Math.max(2, Math.ceil(12 / items.length))
  const doubled = Array.from({ length: repeat * 2 }, () => items).flat()

  return (
    <div className="relative group">

      {/* Flèche gauche */}
      <button
        onClick={() => scrollBy(-1)}
        className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-[#F0F0F0] flex items-center justify-center text-[#FF6B00] text-lg font-bold hover:bg-[#FFF0E0] transition-colors"
        aria-label="Précédent"
      >
        ‹
      </button>

      {/* Zone de défilement */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-10 cursor-grab active:cursor-grabbing select-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        onMouseDown={pause}
        onMouseUp={resume}
        onMouseLeave={resume}
        onTouchStart={pause}
        onTouchEnd={resume}
      >
        {doubled.map((item, i) => {
          const isOffre = item.dateFin != null
          const card = (
            <div className="shrink-0 w-[155px] rounded-2xl bg-white border border-[#F0F0F0] shadow-sm overflow-hidden active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">

              {/* 1. Countdown + bons restants (offres uniquement) */}
              {isOffre && (
                <OffreCountdown dateFin={item.dateFin} nbBonsRestants={item.nbBonsRestants} />
              )}

              {/* Image / icône (commerçants ou offres sans countdown) */}
              {!isOffre && (
                <div className="w-full h-[70px] bg-[#FFF0E0] flex items-center justify-center">
                  {item.image ? (
                    <Image src={item.image} alt={item.title} width={500} height={70} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{item.icon || '🏪'}</span>
                  )}
                </div>
              )}

              <div className="p-3 flex flex-col gap-1.5">

                {/* 2. Badge remise — gros et visible (offres) ou catégorie (commerçants) */}
                {isOffre && item.badge ? (
                  <div className="flex items-center justify-center bg-[#FFF0E0] rounded-xl py-2.5">
                    <span className="text-xl font-black text-[#FF6B00]">{item.badge}</span>
                  </div>
                ) : !isOffre && item.badge ? (
                  <span className="self-start bg-[#FF6B00] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                ) : null}

                {/* 3. Titre / contexte */}
                <p className="text-xs font-black text-[#0A0A0A] leading-tight line-clamp-2">
                  {item.title}
                </p>

                {/* 4. Nom du commerce (subtitle) */}
                {item.subtitle && (
                  <p className="text-[10px] font-semibold text-[#3D3D3D] truncate">
                    {item.subtitle}
                  </p>
                )}

                {/* 5. Ville */}
                {item.ville && (
                  <p className="text-[10px] text-[#3D3D3D]/60 font-medium flex items-center gap-0.5 pt-1 border-t border-[#F0F0F0] mt-auto">
                    <span>📍</span>
                    <span className="truncate">{item.ville}</span>
                  </p>
                )}

              </div>
            </div>
          )

          return item.href ? (
            <Link key={i} href={item.href} className="shrink-0">
              {card}
            </Link>
          ) : (
            <div key={i} className="shrink-0">{card}</div>
          )
        })}
      </div>

      {/* Flèche droite */}
      <button
        onClick={() => scrollBy(1)}
        className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-md border border-[#F0F0F0] flex items-center justify-center text-[#FF6B00] text-lg font-bold hover:bg-[#FFF0E0] transition-colors"
        aria-label="Suivant"
      >
        ›
      </button>

    </div>
  )
}
