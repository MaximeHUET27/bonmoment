'use client';

import { useEffect, useState, useCallback } from 'react';

export default function StatsCumuleesMairieAsso({ commerceId }) {
  const [stats, setStats] = useState(null);
  const [periode, setPeriode] = useState('total');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/mairie-asso/stats-cumulees?mairie_asso_id=${commerceId}&periode=${periode}`
      );
      const json = await res.json();
      setStats(json.stats);
    } finally {
      setLoading(false);
    }
  }, [commerceId, periode]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <section className="rounded-2xl bg-white border border-[#F5F5F5] p-6 shadow-sm">
        <p className="text-[#3D3D3D]">Chargement des statistiques…</p>
      </section>
    );
  }

  if (!stats) return null;

  const PERIODES = [
    { value: '7j',    label: '7 jours' },
    { value: '30j',   label: '30 jours' },
    { value: 'total', label: 'Total' },
  ];

  return (
    <section className="rounded-2xl bg-white border border-[#F5F5F5] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2
            className="text-xl font-bold text-[#0A0A0A]"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Statistiques de tes adhérents
          </h2>
          <p className="text-sm text-[#3D3D3D] mt-1">
            Vue d&apos;ensemble cumulée — aucune donnée individuelle par commerçant.
          </p>
        </div>
        <div className="flex gap-2">
          {PERIODES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriode(p.value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                periode === p.value
                  ? 'bg-[#FF6B00] text-white'
                  : 'bg-[#F5F5F5] text-[#3D3D3D] hover:bg-[#FFF0E0]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon="🎟️" label="Bons réservés"          value={stats.bons_reserves} />
        <StatCard icon="✅" label="Bons validés"            value={stats.bons_valides} />
        <StatCard icon="📈" label="Taux de validation"      value={`${stats.taux_validation}%`} />
        <StatCard icon="🤝" label="Adhérents actifs"        value={stats.nb_membres_actifs} />
        <StatCard icon="📰" label="Offres publiées"         value={stats.nb_offres_publiees} />
        <StatCard icon="⭐" label="Avis Google cumulés"     value={stats.nb_avis_google_cumules} />
      </div>
    </section>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-lg bg-[#F5F5F5] p-4">
      <div className="text-2xl mb-1">{icon}</div>
      <div
        className="text-2xl font-black text-[#0A0A0A]"
        style={{ fontFamily: 'Montserrat, sans-serif' }}
      >
        {value}
      </div>
      <div className="text-xs text-[#3D3D3D] mt-1">{label}</div>
    </div>
  );
}
