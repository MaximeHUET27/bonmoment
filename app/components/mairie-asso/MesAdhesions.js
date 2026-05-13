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
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#F5F5F5]">
      <h2 className="text-xl font-bold text-[#0A0A0A] mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        🤝 Mes adhésions ({adhesions.length})
      </h2>
      <ul className="space-y-2">
        {adhesions.map(a => (
          <li key={a.id} className="flex items-center justify-between p-3 bg-[#F5F5F5] rounded-lg">
            <div className="flex items-center gap-3">
              {a.mairie_asso?.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.mairie_asso.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              )}
              <div>
                <span className="font-semibold text-[#0A0A0A] block">{a.mairie_asso?.nom}</span>
                <span className="text-xs text-[#3D3D3D]">{a.mairie_asso?.ville}</span>
              </div>
            </div>
            <button
              onClick={() => setConfirmLeave(a)}
              className="text-sm text-[#3D3D3D] hover:text-red-600 font-semibold min-h-[44px] px-3"
            >
              Quitter
            </button>
          </li>
        ))}
      </ul>

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
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-lg shadow-lg text-white font-semibold z-50 ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.msg}
        </div>
      )}
    </section>
  );
}
