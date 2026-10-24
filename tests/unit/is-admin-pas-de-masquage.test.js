import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Regression : `const isAdmin = isAdmin(user)` masquait l'import et faisait planter
// la page /commercant/abonnement (ReferenceError : acces avant initialisation).
function fichiers(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return e.name === 'node_modules' || e.name === '.next' ? [] : fichiers(p)
    return /\.(js|jsx)$/.test(e.name) ? [p] : []
  })
}

describe('isAdmin', () => {
  it("n'est jamais redeclare en variable locale qui masque l'import", () => {
    const fautifs = ['app', 'lib'].flatMap((d) => fichiers(path.join(process.cwd(), d)))
      .filter((f) => /\b(const|let|var)\s+isAdmin\s*=/.test(fs.readFileSync(f, 'utf8')))
    expect(fautifs).toEqual([])
  })
})
