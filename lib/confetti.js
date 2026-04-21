// Helper canvas-confetti — couleurs BONMOMENT
let _confetti = null

async function getConfetti() {
  if (typeof window === 'undefined') return null
  if (!_confetti) {
    const mod = await import('canvas-confetti')
    _confetti = mod.default
  }
  return _confetti
}

// Intensité forte — création d'offre, récompense fidélité débloquée
export async function triggerConfetti() {
  const fire = await getConfetti()
  if (!fire) return
  fire({
    particleCount: 130,
    spread: 75,
    origin: { y: 0.55 },
    colors: ['#FF6B00', '#FFFFFF', '#FBBF24', '#FF4500', '#FFD700', '#FF8C00'],
    scalar: 1.1,
    ticks: 220,
  })
}

// Intensité légère — tampon simple / bon validé avec tampon
export async function triggerConfettiLegers() {
  const fire = await getConfetti()
  if (!fire) return
  fire({
    particleCount: 55,
    spread: 50,
    startVelocity: 28,
    origin: { y: 0.6 },
    colors: ['#FF6B00', '#FFFFFF', '#FBBF24', '#FF4500', '#FFD700', '#FF8C00'],
    scalar: 0.9,
    ticks: 140,
  })
}
