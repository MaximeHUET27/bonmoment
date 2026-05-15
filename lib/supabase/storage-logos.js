import { createClient } from '@/lib/supabase/client';

const BUCKET = 'logos-mairie-asso';

/**
 * Upload un logo pour un compte mairie/asso.
 * @param {string} mairieAssoId - UUID du compte mairie/asso
 * @param {File} file - Fichier image (PNG/JPG/JPEG/WEBP, max 2 MB)
 * @returns {Promise<{publicUrl: string, path: string}>}
 */
export async function uploadLogoMairieAsso(mairieAssoId, file) {
  const supabase = createClient();

  const ext = file.name.split('.').pop().toLowerCase();
  const allowedExt = ['png', 'jpg', 'jpeg', 'webp'];
  if (!allowedExt.includes(ext)) {
    throw new Error('Format non autorisé. Utilise PNG, JPG, JPEG ou WEBP.');
  }

  const maxBytes = 2 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error('Fichier trop volumineux. Maximum 2 MB.');
  }

  const path = `${mairieAssoId}/logo.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  return { publicUrl, path };
}

/**
 * Supprime tous les logos d'un compte mairie/asso (toutes extensions confondues).
 */
export async function deleteLogosMairieAsso(mairieAssoId) {
  const supabase = createClient();
  const paths = ['png', 'jpg', 'jpeg', 'webp'].map(ext => `${mairieAssoId}/logo.${ext}`);

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove(paths);

  if (error) throw error;
}
