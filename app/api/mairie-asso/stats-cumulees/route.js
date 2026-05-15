import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isMairieAssoEnabled } from '@/lib/featureFlags';

export const dynamic = 'force-dynamic';

const VALID_PERIODES = ['7j', '30j', 'total'];

export async function GET(request) {
  if (!isMairieAssoEnabled()) {
    return NextResponse.json({ error: 'Module désactivé' }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mairieAssoId = searchParams.get('mairie_asso_id');
  const periode = searchParams.get('periode') || 'total';

  if (!mairieAssoId) {
    return NextResponse.json({ error: 'mairie_asso_id requis' }, { status: 400 });
  }

  if (!VALID_PERIODES.includes(periode)) {
    return NextResponse.json(
      { error: `Période invalide. Valeurs : ${VALID_PERIODES.join(', ')}` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc('get_stats_cumulees_mairie_asso', {
    p_asso_id: mairieAssoId,
    p_periode: periode,
  });

  if (error) {
    console.error('[stats-cumulees]', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const stats = (data && data[0]) || {
    bons_reserves: 0,
    bons_valides: 0,
    taux_validation: 0,
    nb_membres_actifs: 0,
    nb_offres_publiees: 0,
    nb_avis_google_cumules: 0,
  };

  return NextResponse.json({ stats, periode });
}
