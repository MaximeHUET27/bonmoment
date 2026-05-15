import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isMairieAssoEnabled } from '@/lib/featureFlags';
import { rateLimit } from '@/lib/rate-limit';
import { sendInvitationEmail } from '@/lib/brevo/sendInvitationEmail';

export const dynamic = 'force-dynamic';

// Rate limit : 20 invitations/minute par IP — même pattern que /api/valider-bon
const checkRate = rateLimit({ maxRequests: 20, windowMs: 60 * 1000 });

/**
 * POST /api/mairie-asso/invitations
 * Body: { asso_id: string, commerce_id: string }
 *
 * Crée une invitation (statut 'pending') et envoie l'email Brevo.
 */
export async function POST(request) {
  if (!isMairieAssoEnabled()) {
    return NextResponse.json({ error: 'Feature désactivée' }, { status: 404 });
  }

  const limited = checkRate(request);
  if (limited) return limited;

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

  const { asso_id, commerce_id } = body;
  if (!asso_id || !commerce_id) {
    return NextResponse.json({ error: 'asso_id et commerce_id requis' }, { status: 400 });
  }

  // Vérifier que l'utilisateur est owner du compte asso
  const { data: asso, error: assoError } = await supabase
    .from('commerces')
    .select('id, nom, ville, owner_id, categorie_bonmoment')
    .eq('id', asso_id)
    .single();

  if (assoError || !asso) {
    return NextResponse.json({ error: 'Compte mairie/asso introuvable' }, { status: 404 });
  }

  if (asso.owner_id !== user.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  if (asso.categorie_bonmoment !== 'mairie_asso') {
    return NextResponse.json({ error: "Ce compte n'est pas une mairie/asso" }, { status: 400 });
  }

  // Vérifier que le commerce cible existe et est dans la même ville
  const { data: commerce, error: commerceError } = await supabase
    .from('commerces')
    .select('id, nom, ville, categorie_bonmoment, abonnement_actif, owner_id')
    .eq('id', commerce_id)
    .single();

  if (commerceError || !commerce) {
    return NextResponse.json({ error: 'Commerce introuvable' }, { status: 404 });
  }

  if (commerce.categorie_bonmoment === 'mairie_asso') {
    return NextResponse.json({ error: "Impossible d'inviter une mairie/asso" }, { status: 400 });
  }

  if (commerce.ville !== asso.ville) {
    return NextResponse.json({ error: 'Le commerce doit être dans la même ville' }, { status: 400 });
  }

  if (!commerce.abonnement_actif) {
    return NextResponse.json({ error: "Le commerce n'a pas d'abonnement actif" }, { status: 400 });
  }

  // Vérifier s'il n'y a pas déjà une invitation pending ou accepted
  const { data: existant } = await supabase
    .from('mairie_asso_membres')
    .select('id, statut')
    .eq('mairie_asso_id', asso_id)
    .eq('commerce_id', commerce_id)
    .in('statut', ['pending', 'accepted'])
    .maybeSingle();

  if (existant) {
    return NextResponse.json({
      error: existant.statut === 'pending'
        ? 'Invitation déjà en attente'
        : 'Ce commerce est déjà membre',
    }, { status: 409 });
  }

  // Si une entrée 'declined' ou 'removed' existe → update au lieu d'insert (ré-invitation immédiate)
  const { data: ancien } = await supabase
    .from('mairie_asso_membres')
    .select('id')
    .eq('mairie_asso_id', asso_id)
    .eq('commerce_id', commerce_id)
    .maybeSingle();

  let invitation;
  if (ancien) {
    const { data, error } = await supabase
      .from('mairie_asso_membres')
      .update({
        statut: 'pending',
        accepted_at: null,
        removed_at: null,
        removed_by: null,
        created_at: new Date().toISOString(),
      })
      .eq('id', ancien.id)
      .select()
      .single();
    if (error) {
      console.error('[mairie-asso] Erreur update invitation:', error);
      return NextResponse.json({ error: 'Erreur création' }, { status: 500 });
    }
    invitation = data;
  } else {
    const { data, error } = await supabase
      .from('mairie_asso_membres')
      .insert({
        mairie_asso_id: asso_id,
        commerce_id: commerce_id,
        statut: 'pending',
      })
      .select()
      .single();
    if (error) {
      console.error('[mairie-asso] Erreur insert invitation:', error);
      return NextResponse.json({ error: 'Erreur création' }, { status: 500 });
    }
    invitation = data;
  }

  // Récupérer l'email du commerçant cible (via owner_id)
  const { data: commerceOwner } = await supabase
    .from('users')
    .select('email, nom')
    .eq('id', commerce.owner_id)
    .single();

  // Envoi email Brevo en best effort (ne bloque pas si échec)
  if (commerceOwner?.email) {
    sendInvitationEmail({
      commerceEmail: commerceOwner.email,
      commercePrenom: commerceOwner.nom || '',
      assoNom: asso.nom,
    }).catch(err => {
      console.error('[mairie-asso] Email Brevo non envoyé:', err);
    });
  }

  return NextResponse.json({ invitation }, { status: 201 });
}
