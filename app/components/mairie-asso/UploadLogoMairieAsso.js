'use client';

import { useState, useRef } from 'react';
import ConfirmModal from '@/app/components/ConfirmModal';

export default function UploadLogoMairieAsso({ commerceId, currentLogoUrl, onUpdate }) {
  const [uploading,      setUploading]      = useState(false);
  const [error,          setError]          = useState('');
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const fileInput = useRef(null);

  async function handleUpload(e) {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Format non autorisé (PNG, JPG, WEBP uniquement)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Fichier trop volumineux (max 2 MB)');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mairie_asso_id', commerceId);

      const res = await fetch('/api/mairie-asso/logo', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || 'Erreur');
      }

      const { logo_url } = await res.json();
      onUpdate?.(logo_url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function handleDelete() {
    setError('');
    setUploading(true);
    try {
      const res = await fetch(
        `/api/mairie-asso/logo?mairie_asso_id=${commerceId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Erreur suppression');
      onUpdate?.(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setConfirmDelete(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white border border-[#F5F5F5] p-6 shadow-sm">
      <h2
        className="text-xl font-bold text-[#0A0A0A] mb-2"
        style={{ fontFamily: 'Montserrat, sans-serif' }}
      >
        Logo personnalisé
      </h2>
      <p className="text-sm text-[#3D3D3D] mb-4">
        Ce logo s&apos;affichera en haut à droite des affiches vitrine de tes adhérents qui choisiront de le mettre en avant.
      </p>

      {currentLogoUrl && (
        <div className="mb-4 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentLogoUrl}
            alt="Logo actuel"
            className="w-24 h-24 rounded-lg object-contain bg-[#F5F5F5] p-2"
          />
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={uploading}
            className="min-h-[44px] px-4 py-2 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition"
          >
            Supprimer le logo
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
          id="logo-upload-input"
        />
        <label
          htmlFor="logo-upload-input"
          className={`inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg font-bold text-white bg-[#FF6B00] hover:bg-[#CC5500] cursor-pointer transition ${uploading ? 'opacity-60 cursor-wait' : ''}`}
        >
          {uploading
            ? 'Téléversement…'
            : currentLogoUrl ? '📤 Remplacer le logo' : '📤 Téléverser un logo'}
        </label>
        <p className="text-xs text-[#3D3D3D]">
          Format : PNG, JPG ou WEBP · Carré conseillé (idéalement 512×512 px) · Taille max : 2 MB
        </p>
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <ConfirmModal
        open={confirmDelete}
        title="Supprimer le logo ?"
        message="Le logo disparaîtra des affiches vitrine de tes adhérents qui l'avaient sélectionné."
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </section>
  );
}
