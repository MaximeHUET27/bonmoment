'use client';

import { useEffect } from 'react';

/**
 * Modale de confirmation réutilisable conforme à la charte BONMOMENT.
 *
 * @param {object} props
 * @param {boolean} props.open - Modale ouverte/fermée
 * @param {string} props.title - Titre de la modale (H2)
 * @param {string} props.message - Message principal
 * @param {string} [props.confirmLabel] - Label bouton confirmation (défaut: "Confirmer")
 * @param {string} [props.cancelLabel] - Label bouton annulation (défaut: "Annuler")
 * @param {'danger' | 'primary'} [props.variant] - Variante visuelle (défaut: 'primary')
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onCancel
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'primary',
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmBg = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-[#FF6B00] hover:bg-[#CC5500]';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-[#0A0A0A] mb-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          {title}
        </h2>
        <p className="text-base text-[#3D3D3D] mb-6">
          {message}
        </p>
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-3 rounded-lg font-semibold text-[#3D3D3D] bg-[#F5F5F5] hover:bg-gray-200 transition min-h-[44px]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-3 rounded-lg font-bold text-white transition min-h-[44px] ${confirmBg}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
