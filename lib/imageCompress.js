/**
 * Redimensionne (max 1200px de large) et convertit en JPEG q0.82 via <canvas>.
 * Une photo iPhone de 4 Mo tombe à ~200-250 Ko. Aucune dépendance externe.
 * JPEG et non WebP : compatibilité garantie des aperçus Facebook/WhatsApp.
 * @returns {Promise<Blob>}
 */
export async function compressImage(file, maxWidth = 1200, quality = 0.82) {
  const bitmap = await createImageBitmap(file)
  const ratio  = Math.min(1, maxWidth / bitmap.width)
  const w = Math.round(bitmap.width * ratio)
  const h = Math.round(bitmap.height * ratio)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  // Fond blanc : le JPEG ne gère pas la transparence (PNG transparent → noir sinon)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('Compression échouée'))),
      'image/jpeg',
      quality
    )
  })
}
