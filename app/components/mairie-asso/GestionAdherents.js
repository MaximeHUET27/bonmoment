'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import ConfirmModal from '@/app/components/ConfirmModal';

/**
 * Section "Gestion des adhérents" du dashboard mairie/asso.
 * Visible uniquement si commerce.categorie_bonmoment === 'mairie_asso' ET feature flag ON.
 *
 * @param {object} props
 * @param {object} props.commerce - Le commerce mairie/asso (id, nom, ville)
 */
export default function GestionAdherents({ commerce }) {
  const [supabase] = useState(() => createClient());

  const [adherentsActifs, setAdherentsActifs] = useState([]);
  const [invitationsEnAttente, setInvitationsEnAttente] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [resultsRecherche, setResultsRecherche] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [toast, setToast] = useState(null);

  const loadMembres = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('mairie_asso_membres')
      .select(`
        id, statut, created_at, accepted_at,
        commerce:commerces!mairie_asso_membres_commerce_id_fkey(id, nom, photo_url, categorie_bonmoment)
      `)
      .eq('mairie_asso_id', commerce.id)
      .in('statut', ['pending', 'accepted'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAdherentsActifs(data.filter(d => d.statut === 'accepted'));
      setInvitationsEnAttente(data.filter(d => d.statut === 'pending'));
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commerce.id]);

  useEffect(() => {
    loadMembres();
  }, [loadMembres]);

  // Recherche commerçants invitables (debounced 300ms)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setResultsRecherche([]);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(
          `/api/mairie-asso/commercants-invitables?asso_id=${commerce.id}&q=${encodeURIComponent(searchQuery)}`
        );
        const json = await res.json();
        if (res.ok) setResultsRecherche(json.commerces || []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, commerce.id]);

  const handleInvite = async (commerceId) => {
    const res = await fetch('/api/mairie-asso/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asso_id: commerce.id, commerce_id: commerceId }),
    });
    const json = await res.json();
    if (res.ok) {
      showToast('✅ Invitation envoyée', 'success');
      setSearchQuery('');
      setResultsRecherche([]);
      loadMembres();
    } else {
      showToast(`❌ ${json.error || 'Erreur'}`, 'error');
    }
  };

  const confirmRemove = (membre, type) => {
    setConfirmModal({
      type,
      target: membre,
      title: type === 'invitation' ? "Annuler l'invitation ?" : 'Retirer ce commerçant ?',
      message: type === 'invitation'
        ? `${membre.commerce.nom} ne pourra plus accepter cette invitation. Tu pourras le ré-inviter immédiatement.`
        : `${membre.commerce.nom} ne sera plus membre de tes adhérents. Il ne pourra plus valider tes bons.`,
    });
  };

  const handleRemoveConfirmed = async () => {
    if (!confirmModal) return;
    const res = await fetch(`/api/mairie-asso/invitations/${confirmModal.target.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove' }),
    });
    if (res.ok) {
      showToast(confirmModal.type === 'invitation' ? '✅ Invitation annulée' : '✅ Membre retiré', 'success');
      loadMembres();
    } else {
      showToast('❌ Erreur', 'error');
    }
    setConfirmModal(null);
  };

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#F5F5F5] space-y-6">
      <h2 className="text-2xl font-bold text-[#0A0A0A]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        🤝 Gestion des adhérents
      </h2>

      {/* Adhérents actifs */}
      <div>
        <h3 className="text-lg font-semibold text-[#0A0A0A] mb-3">
          Adhérents actifs ({adherentsActifs.length})
        </h3>
        {loading ? (
          <p className="text-[#3D3D3D] text-sm">Chargement...</p>
        ) : adherentsActifs.length === 0 ? (
          <p className="text-[#3D3D3D] text-sm italic">Aucun adhérent pour l&apos;instant. Invite des commerçants ci-dessous.</p>
        ) : (
          <ul className="space-y-2">
            {adherentsActifs.map(m => (
              <li key={m.id} className="flex items-center justify-between p-3 bg-[#F5F5F5] rounded-lg">
                <div className="flex items-center gap-3">
                  {m.commerce.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.commerce.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  )}
                  <span className="font-semibold text-[#0A0A0A]">{m.commerce.nom}</span>
                </div>
                <button
                  onClick={() => confirmRemove(m, 'membre')}
                  className="text-sm text-red-600 hover:text-red-700 font-semibold min-h-[44px] px-3"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Invitations en attente */}
      <div>
        <h3 className="text-lg font-semibold text-[#0A0A0A] mb-3">
          Invitations en attente ({invitationsEnAttente.length})
        </h3>
        {invitationsEnAttente.length === 0 ? (
          <p className="text-[#3D3D3D] text-sm italic">Aucune invitation en attente.</p>
        ) : (
          <ul className="space-y-2">
            {invitationsEnAttente.map(m => (
              <li key={m.id} className="flex items-center justify-between p-3 bg-[#FFF0E0] rounded-lg">
                <div className="flex items-center gap-3">
                  {m.commerce.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.commerce.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  )}
                  <div>
                    <span className="font-semibold text-[#0A0A0A]">{m.commerce.nom}</span>
                    <span className="block text-xs text-[#CC5500] font-bold uppercase">En attente</span>
                  </div>
                </div>
                <button
                  onClick={() => confirmRemove(m, 'invitation')}
                  className="text-sm text-[#3D3D3D] hover:text-red-600 font-semibold min-h-[44px] px-3"
                >
                  Annuler
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Inviter un commerçant */}
      <div>
        <h3 className="text-lg font-semibold text-[#0A0A0A] mb-3">
          Inviter un commerçant
        </h3>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Rechercher par nom (min. 2 caractères)..."
          className="w-full px-4 py-3 border border-[#E0E0E0] rounded-lg focus:outline-none focus:border-[#FF6B00] text-base"
        />
        {searching && <p className="text-sm text-[#3D3D3D] mt-2">Recherche...</p>}
        {!searching && resultsRecherche.length > 0 && (
          <ul className="space-y-2 mt-3 max-h-96 overflow-y-auto">
            {resultsRecherche.map(c => (
              <li key={c.id} className="flex items-center justify-between p-3 bg-[#F5F5F5] rounded-lg">
                <div className="flex items-center gap-3">
                  {c.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  )}
                  <span className="font-semibold text-[#0A0A0A]">{c.nom}</span>
                </div>
                <button
                  onClick={() => handleInvite(c.id)}
                  className="px-4 py-2 bg-[#FF6B00] hover:bg-[#CC5500] text-white rounded-lg font-bold text-sm min-h-[44px]"
                >
                  Inviter
                </button>
              </li>
            ))}
          </ul>
        )}
        {!searching && searchQuery.trim().length >= 2 && resultsRecherche.length === 0 && (
          <p className="text-sm text-[#3D3D3D] italic mt-2">
            Aucun commerçant trouvé. Vérifie qu&apos;il est inscrit sur BONMOMENT dans ta ville.
          </p>
        )}
      </div>

      {confirmModal && (
        <ConfirmModal
          open={true}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel="Confirmer"
          cancelLabel="Annuler"
          variant="danger"
          onConfirm={handleRemoveConfirmed}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-lg shadow-lg text-white font-semibold z-40 ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.msg}
        </div>
      )}
    </section>
  );
}
