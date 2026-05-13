import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isMairieAssoEnabled } from '@/lib/featureFlags';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mairie-asso/commercants-invitables?asso_id=xxx&q=recherche
 *
 * Retourne les commerçants invitables par une mairie/asso :
 * - Même ville que la mairie/asso
 * - Catégorie autre que 'mairie_asso'
 * - Abonnement actif
 * - Pas déjà membre actif (pending ou accepted)
 * - Filtre optionnel sur le nom (q, min 0 car)
 */
export async function GET(request) {
  if (!isMairieAssoEnabled()) {
    return NextResponse.json({ error: 'Feature désactivée' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const assoId = searchParams.get('asso_id');
  const query = (searchParams.get('q') || '').trim();

  if (!assoId) {
    return NextResponse.json({ error: 'asso_id requis' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { data: asso, error: assoError } = await supabase
    .from('commerces')
    .select('id, ville, owner_id, categorie_bonmoment')
    .eq('id', assoId)
    .single();

  if (assoError || !asso) {
    return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });
  }

  if (asso.owner_id !== user.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  if (asso.categorie_bonmoment !== 'mairie_asso') {
    return NextResponse.json({ error: "Ce compte n'est pas une mairie/asso" }, { status: 400 });
  }

  // Récupérer les commerce_id déjà membres ou en attente
  const { data: liens } = await supabase
    .from('mairie_asso_membres')
    .select('commerce_id')
    .eq('mairie_asso_id', assoId)
    .in('statut', ['pending', 'accepted']);

  const dejaInvitesIds = (liens || []).map(l => l.commerce_id);

  let q = supabase
    .from('commerces')
    .select('id, nom, photo_url, categorie_bonmoment, ville, abonnement_actif')
    .eq('ville', asso.ville)
    .eq('abonnement_actif', true)
    .neq('categorie_bonmoment', 'mairie_asso');

  if (dejaInvitesIds.length > 0) {
    q = q.not('id', 'in', `(${dejaInvitesIds.join(',')})`);
  }

  if (query.length > 0) {
    q = q.ilike('nom', `%${query}%`);
  }

  q = q.order('nom', { ascending: true }).limit(50);

  const { data: commerces, error: searchError } = await q;

  if (searchError) {
    console.error('[mairie-asso] Erreur recherche commerces:', searchError);
    return NextResponse.json({ error: 'Erreur recherche' }, { status: 500 });
  }

  return NextResponse.json({ commerces: commerces || [] });
}
