import fs from 'node:fs'
import path from 'node:path'

/** Lit .env.local (Playwright ne le charge pas) sans jamais exposer les valeurs. */
export function env(name) {
  if (process.env[name]) return process.env[name]
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const m = raw.match(new RegExp(`^${name}=(.*)$`, 'm'))
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : undefined
  } catch { return undefined }
}

export const SUPABASE_URL = env('NEXT_PUBLIC_SUPABASE_URL')
export const ANON_KEY = env('NEXT_PUBLIC_SUPABASE_ANON_KEY')

export function rest(request, pathAndQuery, { method = 'GET', body } = {}) {
  return request.fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    method,
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
    data: body,
  })
}
