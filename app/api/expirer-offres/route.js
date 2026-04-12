import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  // Vercel cron authentication
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('offres')
    .update({ statut: 'expiree' })
    .eq('statut', 'active')
    .lt('date_fin', new Date().toISOString())
    .select('id')

  if (error) {
    console.error('[expirer-offres] Erreur:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ expired: data?.length ?? 0 })
}
