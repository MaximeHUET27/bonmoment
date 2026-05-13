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
    <div className="bg-white rounded-3xl px-6 py-6 flex flex-col gap-4 shadow-sm">
      <h2 className="text-sm font-black text-[#0A0A0A] uppercase tracking-wide">🤝 Gestion des adhérents</h2>

      {/* Adhérents actifs */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-semibold text-[#3D3D3D]/40 uppercase tracking-widest">
          Adhérents actifs ({adherentsActifs.length})
        </p>
        {loading ? (
          <div className="flex flex-col gap-2 animate-pulse">
            {[...Array(2)].map((_, i) => <div key={i} className="h-10 bg-[#F5F5F5] rounded-xl" />)}
          </div>
        ) : adherentsActifs.length === 0 ? (
          <p className="text-sm text-[#3D3D3D]/50 italic">Aucun adhérent pour l&apos;instant. Invite des commerçants ci-dessous.</p>
        ) : (
          <div className="flex flex-col">
            {adherentsActifs.map(m => (
              <div key={m.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-[#F5F5F5] last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  {m.commerce.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.commerce.photo_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                  )}
                  <span className="text-sm font-bold text-[#0A0A0A] truncate">{m.commerce.nom}</span>
                </div>
                <button
                  onClick={() => confirmRemove(m, 'membre')}
                  className="text-[11px] font-semibold text-red-400 hover:text-red-600 transition-colors shrink-0"
                >
                  Retirer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invitations en attente */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-semibold text-[#3D3D3D]/40 uppercase tracking-widest">
          Invitations en attente ({invitationsEnAttente.length})
        </p>
        {invitationsEnAttente.length === 0 ? (
          <p className="text-sm text-[#3D3D3D]/50 italic">Aucune invitation en attente.</p>
        ) : (
          <div className="flex flex-col">
            {invitationsEnAttente.map(m => (
              <div key={m.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-[#F5F5F5] last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  {m.commerce.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.commerce.photo_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                  )}
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-[#0A0A0A] truncate block">{m.commerce.nom}</span>
                    <span className="text-[10px] font-semibold text-[#FF6B00] uppercase tracking-widest">En attente</span>
                  </div>
                </div>
                <button
                  onClick={() => confirmRemove(m, 'invitation')}
                  className="text-[11px] font-semibold text-[#3D3D3D]/50 hover:text-red-500 transition-colors shrink-0"
                >
                  Annuler
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inviter un commerçant */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-semibold text-[#3D3D3D]/40 uppercase tracking-widest">
          Inviter un commerçant
        </p>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Rechercher par nom (min. 2 caractères)..."
          className="w-full px-4 py-3 border border-[#E0E0E0] rounded-xl text-sm focus:outline-none focus:border-[#FF6B00] transition-colors"
        />
        {searching && <p className="text-[11px] text-[#3D3D3D]/50">Recherche...</p>}
        {!searching && resultsRecherche.length > 0 && (
          <div className="flex flex-col max-h-80 overflow-y-auto">
            {resultsRecherche.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-[#F5F5F5] last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  {c.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.photo_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                  )}
                  <span className="text-sm font-bold text-[#0A0A0A] truncate">{c.nom}</span>
                </div>
                <button
                  onClick={() => handleInvite(c.id)}
                  className="text-xs font-bold text-[#FF6B00] border border-[#FF6B00] px-3 py-1.5 rounded-full hover:bg-[#FFF0E0] transition-colors shrink-0 min-h-[36px] flex items-center"
                >
                  Inviter
                </button>
              </div>
            ))}
          </div>
        )}
        {!searching && searchQuery.trim().length >= 2 && resultsRecherche.length === 0 && (
          <p className="text-[11px] text-[#3D3D3D]/50 italic">
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
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl shadow-lg text-white font-semibold z-40 text-sm ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
