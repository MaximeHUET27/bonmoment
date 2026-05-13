'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import ConfirmModal from '@/app/components/ConfirmModal';

/**
 * Bandeau orange affiché en haut du dashboard commerçant si invitations pending.
 * Au clic → modale avec liste des invitations + boutons Accepter/Décliner.
 * Accepter : sans confirmation (Q6). Décliner : avec ConfirmModal (Q6).
 *
 * @param {object} props
 * @param {string} props.commerceId - L'ID du commerce du commerçant connecté
 */
export default function BandeauInvitations({ commerceId }) {
  const [supabase] = useState(() => createClient());
  const [invitations, setInvitations] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(null);
  const [toast, setToast] = useState(null);

  const loadInvitations = useCallback(async () => {
    const { data } = await supabase
      .from('mairie_asso_membres')
      .select(`
        id, created_at,
        mairie_asso:commerces!mairie_asso_membres_mairie_asso_id_fkey(id, nom, photo_url, ville)
      `)
      .eq('commerce_id', commerceId)
      .eq('statut', 'pending')
      .order('created_at', { ascending: false });

    setInvitations(data || []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commerceId]);

  useEffect(() => { loadInvitations(); }, [loadInvitations]);

  const handleAccept = async (invitationId) => {
    const res = await fetch(`/api/mairie-asso/invitations/${invitationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept' }),
    });
    if (res.ok) {
      showToast('✅ Invitation acceptée', 'success');
      loadInvitations();
    } else {
      showToast('❌ Erreur', 'error');
    }
  };

  const handleDeclineConfirmed = async () => {
    if (!confirmDecline) return;
    const res = await fetch(`/api/mairie-asso/invitations/${confirmDecline.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'decline' }),
    });
    if (res.ok) {
      showToast('Invitation déclinée', 'success');
      loadInvitations();
    } else {
      showToast('❌ Erreur', 'error');
    }
    setConfirmDecline(null);
  };

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (invitations.length === 0) return null;

  return (
    <>
      <div
        onClick={() => setModalOpen(true)}
        className="bg-[#FFF0E0] border border-[#FF6B00] rounded-xl p-4 cursor-pointer hover:bg-[#FFE4D0] transition flex items-center justify-between"
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setModalOpen(true)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">📩</span>
          <span className="font-bold text-[#CC5500]">
            Tu as {invitations.length} invitation{invitations.length > 1 ? 's' : ''} en attente
          </span>
        </div>
        <span className="text-[#FF6B00] font-bold">Voir →</span>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-[#0A0A0A] mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Invitations en attente
            </h2>
            <ul className="space-y-4">
              {invitations.map(inv => (
                <li key={inv.id} className="border border-[#F5F5F5] rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {inv.mairie_asso?.photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={inv.mairie_asso.photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                    )}
                    <div>
                      <p className="font-bold text-[#0A0A0A]">{inv.mairie_asso?.nom}</p>
                      <p className="text-xs text-[#3D3D3D]">{inv.mairie_asso?.ville}</p>
                    </div>
                  </div>
                  <p className="text-sm text-[#3D3D3D] mb-3">
                    En acceptant, tu pourras valider les bons de leurs offres dans ton commerce.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(inv.id)}
                      className="flex-1 px-4 py-3 bg-[#FF6B00] hover:bg-[#CC5500] text-white rounded-lg font-bold min-h-[44px]"
                    >
                      ✓ Accepter
                    </button>
                    <button
                      onClick={() => { setModalOpen(false); setConfirmDecline(inv); }}
                      className="flex-1 px-4 py-3 bg-[#F5F5F5] hover:bg-gray-200 text-[#3D3D3D] rounded-lg font-bold min-h-[44px]"
                    >
                      Décliner
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setModalOpen(false)}
              className="mt-4 w-full px-4 py-3 text-[#3D3D3D] font-semibold min-h-[44px]"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDecline}
        title="Décliner cette invitation ?"
        message={`${confirmDecline?.mairie_asso?.nom} sera notifié de ton refus.`}
        confirmLabel="Décliner"
        variant="danger"
        onConfirm={handleDeclineConfirmed}
        onCancel={() => setConfirmDecline(null)}
      />

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-lg shadow-lg text-white font-semibold z-50 ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.msg}
        </div>
      )}
    </>
  );
}
