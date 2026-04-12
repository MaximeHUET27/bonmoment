import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'bonmomentapp@gmail.com'
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const TYPES_AUTORISES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
const EXT_MAP = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (user.email !== ADMIN_EMAIL)
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file')
  const chargeId = formData.get('charge_id')

  if (!file || !chargeId)
    return NextResponse.json({ error: 'Fichier et charge_id requis' }, { status: 400 })

  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: 'Fichier trop volumineux (max 5MB)' }, { status: 400 })

  if (!TYPES_AUTORISES.includes(file.type))
    return NextResponse.json({ error: 'Type de fichier non autorisé (pdf, jpg, png)' }, { status: 400 })

  const ext = EXT_MAP[file.type]
  const now = new Date()
  const path = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${chargeId}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await admin.storage
    .from('justificatifs')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: signedData, error: signError } = await admin.storage
    .from('justificatifs')
    .createSignedUrl(path, 365 * 24 * 3600)

  if (signError)
    return NextResponse.json({ error: signError.message }, { status: 500 })

  return NextResponse.json({ url: signedData.signedUrl })
}
