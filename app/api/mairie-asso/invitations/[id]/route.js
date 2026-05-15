import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isMairieAssoEnabled } from '@/lib/featureFlags';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/mairie-asso/invitations/[id]
 * Body: { action: 'accept' | 'decline' | 'remove' | 'leave' }
 *
 * - accept  : commerce accepte une invitation pending → 'accepted'
 * - decline : commerce refuse une invitation pending → 'declined'
 * - remove  : asso retire un membre (pending ou accepted) → 'removed', removed_by='mairie_asso'
 * - leave   : commerce quitte une asso (accepted) → 'removed', removed_by='commerce'
 */
export async function PATCH(request, { params }) {
  if (!isMairieAssoEnabled()) {
    return NextResponse.json({ error: 'Feature désactivée' }, { status: 404 });
  }

  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body invalide' }, { status: 400 });
  }

  const { action } = body;
  if (!['accept', 'decline', 'remove', 'leave'].includes(action)) {
    return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
  }

  // Charger l'invitation avec les deux commerces liés
  const { data: invitation, error: invError } = await supabase
    .from('mairie_asso_membres')
    .select(`
      id, statut, mairie_asso_id, commerce_id,
      mairie_asso:commerces!mairie_asso_membres_mairie_asso_id_fkey(owner_id),
      commerce:commerces!mairie_asso_membres_commerce_id_fkey(owner_id)
    `)
    .eq('id', id)
    .single();

  if (invError || !invitation) {
    return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 });
  }

  const isAssoOwner = invitation.mairie_asso?.owner_id === user.id;
  const isCommerceOwner = invitation.commerce?.owner_id === user.id;

  if (action === 'accept' || action === 'decline') {
    if (!isCommerceOwner) {
      return NextResponse.json({ error: 'Seul le commerce peut accepter ou décliner' }, { status: 403 });
    }
    if (invitation.statut !== 'pending') {
      return NextResponse.json({ error: 'Invitation non en attente' }, { status: 400 });
    }
  }

  if (action === 'remove') {
    if (!isAssoOwner) {
      return NextResponse.json({ error: 'Seule la mairie/asso peut retirer un membre' }, { status: 403 });
    }
    if (!['pending', 'accepted'].includes(invitation.statut)) {
      return NextResponse.json({ error: 'Membre non actif' }, { status: 400 });
    }
  }

  if (action === 'leave') {
    if (!isCommerceOwner) {
      return NextResponse.json({ error: 'Seul le commerce peut quitter' }, { status: 403 });
    }
    if (invitation.statut !== 'accepted') {
      return NextResponse.json({ error: 'Adhésion non active' }, { status: 400 });
    }
  }

  let updates;
  switch (action) {
    case 'accept':
      updates = { statut: 'accepted', accepted_at: new Date().toISOString() };
      break;
    case 'decline':
      updates = { statut: 'declined' };
      break;
    case 'remove':
      updates = { statut: 'removed', removed_at: new Date().toISOString(), removed_by: 'mairie_asso' };
      break;
    case 'leave':
      updates = { statut: 'removed', removed_at: new Date().toISOString(), removed_by: 'commerce' };
      break;
  }

  const { data, error } = await supabase
    .from('mairie_asso_membres')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[mairie-asso] Erreur update invitation:', error);
    return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 });
  }

  return NextResponse.json({ invitation: data });
}
