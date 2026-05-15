'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SelecteurLogoAffiche({ commerceId, currentAfficheLogoId, onUpdate }) {
  const [supabase] = useState(() => createClient());
  const [assos,    setAssos]   = useState([]);
  const [selected, setSelected] = useState(currentAfficheLogoId || '');
  const [saving,   setSaving]  = useState(false);
  const [loading,  setLoading] = useState(true);

  // Récupère les adhésions actives avec logo pour proposer le sélecteur
  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc('get_invitations_et_adhesions_commerce', {
        p_commerce_id: commerceId,
      });
      // Seules les adhésions acceptées dont l'asso a uploadé un logo
      const avecLogo = (data || []).filter(
        a => a.statut === 'accepted' && a.mairie_asso_logo_url
      );
      setAssos(avecLogo);
      setLoading(false);
    }
    load();
  }, [commerceId, supabase]);

  async function handleChange(e) {
    const newValue = e.target.value;
    setSelected(newValue);
    setSaving(true);
    try {
      await fetch('/api/commercant/logo-affiche', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commerce_id: commerceId,
          affiche_logo_mairie_asso_id: newValue || null,
        }),
      });
      onUpdate?.(newValue || null);
    } finally {
      setSaving(false);
    }
  }

  if (loading || assos.length === 0) return null;

  return (
    <div className="mt-4 p-4 rounded-lg bg-[#F5F5F5]">
      <label
        htmlFor="selecteur-logo-affiche"
        className="block text-sm font-semibold text-[#0A0A0A] mb-2"
      >
        Logo à afficher sur ton affiche
      </label>
      <select
        id="selecteur-logo-affiche"
        value={selected}
        onChange={handleChange}
        disabled={saving}
        className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-[#F5F5F5] bg-white text-[#3D3D3D] focus:border-[#FF6B00] focus:outline-none"
      >
        <option value="">Aucun logo</option>
        {assos.map(a => (
          <option key={a.mairie_asso_id} value={a.mairie_asso_id}>
            {a.mairie_asso_nom}
          </option>
        ))}
      </select>
      {saving && <p className="text-xs text-[#3D3D3D] mt-1">Enregistrement…</p>}
    </div>
  );
}
