import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isMairieAssoEnabled } from '@/lib/featureFlags';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(request) {
  if (!isMairieAssoEnabled()) {
    return NextResponse.json({ error: 'Module désactivé' }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const mairieAssoId = formData.get('mairie_asso_id');

  if (!file || !mairieAssoId) {
    return NextResponse.json(
      { error: 'file et mairie_asso_id requis' },
      { status: 400 }
    );
  }

  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { error: 'Format non autorisé (PNG, JPG, WEBP uniquement)' },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'Fichier trop volumineux (max 2 MB)' },
      { status: 400 }
    );
  }

  // Vérifier que l'utilisateur est owner du mairie_asso
  const { data: asso, error: assoError } = await supabase
    .from('commerces')
    .select('id, owner_id, categorie_bonmoment')
    .eq('id', mairieAssoId)
    .eq('owner_id', user.id)
    .eq('categorie_bonmoment', 'mairie_asso')
    .single();

  if (assoError || !asso) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const ext = file.name.split('.').pop().toLowerCase();
  const path = `${mairieAssoId}/logo.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  // Nettoyage : supprimer toutes les variantes existantes pour garantir un seul fichier
  const oldPaths = ['png', 'jpg', 'jpeg', 'webp'].map(e => `${mairieAssoId}/logo.${e}`);
  await supabase.storage.from('logos-mairie-asso').remove(oldPaths);

  const { error: uploadError } = await supabase.storage
    .from('logos-mairie-asso')
    .upload(path, arrayBuffer, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    console.error('[logo upload]', uploadError);
    return NextResponse.json(
      { error: 'Erreur lors du téléversement' },
      { status: 500 }
    );
  }

  const { data: { publicUrl } } = supabase.storage
    .from('logos-mairie-asso')
    .getPublicUrl(path);

  const cacheBustedUrl = `${publicUrl}?v=${Date.now()}`;

  await supabase
    .from('commerces')
    .update({ logo_url: cacheBustedUrl })
    .eq('id', mairieAssoId);

  return NextResponse.json({ logo_url: cacheBustedUrl }, { status: 200 });
}

export async function DELETE(request) {
  if (!isMairieAssoEnabled()) {
    return NextResponse.json({ error: 'Module désactivé' }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mairieAssoId = searchParams.get('mairie_asso_id');

  if (!mairieAssoId) {
    return NextResponse.json({ error: 'mairie_asso_id requis' }, { status: 400 });
  }

  const { data: asso } = await supabase
    .from('commerces')
    .select('id')
    .eq('id', mairieAssoId)
    .eq('owner_id', user.id)
    .eq('categorie_bonmoment', 'mairie_asso')
    .single();

  if (!asso) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const paths = ['png', 'jpg', 'jpeg', 'webp'].map(
    ext => `${mairieAssoId}/logo.${ext}`
  );
  await supabase.storage.from('logos-mairie-asso').remove(paths);

  await supabase
    .from('commerces')
    .update({ logo_url: null })
    .eq('id', mairieAssoId);

  return NextResponse.json({ success: true });
}
