import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isMairieAssoEnabled } from '@/lib/featureFlags';

export const dynamic = 'force-dynamic';

export async function PATCH(request) {
  if (!isMairieAssoEnabled()) {
    return NextResponse.json({ error: 'Module désactivé' }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { commerce_id, affiche_logo_mairie_asso_id } = await request.json();

  if (!commerce_id) {
    return NextResponse.json({ error: 'commerce_id requis' }, { status: 400 });
  }

  // Vérifier owner
  const { data: commerce } = await supabase
    .from('commerces')
    .select('id, owner_id')
    .eq('id', commerce_id)
    .eq('owner_id', user.id)
    .single();

  if (!commerce) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  // Si une asso est choisie : vérifier que le commerçant est bien membre accepted
  if (affiche_logo_mairie_asso_id) {
    const { data: membre } = await supabase
      .from('mairie_asso_membres')
      .select('id')
      .eq('mairie_asso_id', affiche_logo_mairie_asso_id)
      .eq('commerce_id', commerce_id)
      .eq('statut', 'accepted')
      .maybeSingle();

    if (!membre) {
      return NextResponse.json(
        { error: "Tu n'es pas membre accepté de cette mairie/asso" },
        { status: 403 }
      );
    }
  }

  const { error } = await supabase
    .from('commerces')
    .update({ affiche_logo_mairie_asso_id: affiche_logo_mairie_asso_id || null })
    .eq('id', commerce_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
