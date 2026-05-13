'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import ConfirmModal from '@/app/components/ConfirmModal';

/**
 * Section listant les mairies/assos dont le commerçant est membre actif.
 * Masquée si aucune adhésion. Bouton "Quitter" avec ConfirmModal.
 *
 * @param {object} props
 * @param {string} props.commerceId - L'ID du commerce du commerçant connecté
 */
export default function MesAdhesions({ commerceId }) {
  const [supabase] = useState(() => createClient());
  const [adhesions, setAdhesions] = useState([]);
  const [confirmLeave, setConfirmLeave] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAdhesions = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('mairie_asso_membres')
      .select(`
        id, accepted_at,
        mairie_asso:commerces!mairie_asso_membres_mairie_asso_id_fkey(id, nom, photo_url, ville)
      `)
      .eq('commerce_id', commerceId)
      .eq('statut', 'accepted')
      .order('accepted_at', { ascending: false });
    setAdhesions(data || []);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commerceId]);

  useEffect(() => { loadAdhesions(); }, [loadAdhesions]);

  const handleLeaveConfirmed = async () => {
    if (!confirmLeave) return;
    const res = await fetch(`/api/mairie-asso/invitations/${confirmLeave.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leave' }),
    });
    if (res.ok) {
      showToast(`Tu as quitté ${confirmLeave.mairie_asso?.nom}`, 'success');
      loadAdhesions();
    } else {
      showToast('❌ Erreur', 'error');
    }
    setConfirmLeave(null);
  };

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) return null;
  if (adhesions.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-4 shadow-sm">
      <h2 className="text-sm font-black text-[#0A0A0A] uppercase tracking-wide">
        🤝 Mes adhésions ({adhesions.length})
      </h2>
      <div className="flex flex-col">
        {adhesions.map(a => (
          <div key={a.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-[#F5F5F5] last:border-0">
            <div className="flex items-center gap-3 min-w-0">
              {a.mairie_asso?.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.mairie_asso.photo_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
              )}
              <div className="min-w-0">
                <span className="text-sm font-bold text-[#0A0A0A] truncate block">{a.mairie_asso?.nom}</span>
                <span className="text-[11px] text-[#3D3D3D]/50">{a.mairie_asso?.ville}</span>
              </div>
            </div>
            <button
              onClick={() => setConfirmLeave(a)}
              className="text-[11px] font-semibold text-[#3D3D3D]/50 hover:text-red-500 transition-colors shrink-0"
            >
              Quitter
            </button>
          </div>
        ))}
      </div>

      <ConfirmModal
        open={!!confirmLeave}
        title="Quitter cette mairie/asso ?"
        message={`Tu ne pourras plus valider les bons de ${confirmLeave?.mairie_asso?.nom}. Tu pourras revenir si elle te ré-invite.`}
        confirmLabel="Quitter"
        variant="danger"
        onConfirm={handleLeaveConfirmed}
        onCancel={() => setConfirmLeave(null)}
      />

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl shadow-lg text-white font-semibold z-50 text-sm ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
