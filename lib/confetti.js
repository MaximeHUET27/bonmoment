// Helper canvas-confetti — couleurs BONMOMENT
let _confetti = null

export async function triggerConfetti() {
  if (typeof window === 'undefined') return
  if (!_confetti) {
    const mod = await import('canvas-confetti')
    _confetti = mod.default
  }
  _confetti({
    particleCount: 130,
    spread: 75,
    origin: { y: 0.55 },
    colors: ['#FF6B00', '#FFFFFF', '#FBBF24', '#FF4500', '#FFD700', '#FF8C00'],
    scalar: 1.1,
    ticks: 220,
  })
}
