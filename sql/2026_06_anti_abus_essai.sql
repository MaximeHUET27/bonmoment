-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : registre anti-abus du mois d'essai gratuit
-- À exécuter manuellement dans le SQL Editor Supabase (NE PAS appliquer via CLI)
-- Date : 2026-06
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.essais_consommes (
  place_id_hash text        primary key,
  consomme_le   timestamptz not null default now(),
  expire_le     timestamptz not null
);

create index if not exists idx_essais_consommes_expire
  on public.essais_consommes (expire_le);

alter table public.essais_consommes enable row level security;

-- Aucune policy : anon/authenticated n'ont AUCUN accès direct.
-- Seul service_role (clé utilisée par les routes serveur Next.js) contourne la RLS.
revoke all on public.essais_consommes from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Vérifications post-exécution (à coller dans le SQL Editor après la migration)
-- ─────────────────────────────────────────────────────────────────────────────
-- select * from pg_policies where tablename = 'essais_consommes';
-- → doit retourner 0 ligne (aucune policy)
--
-- select relrowsecurity from pg_class where relname = 'essais_consommes';
-- → doit retourner true
-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK éventuel :
-- drop table if exists public.essais_consommes;
-- ─────────────────────────────────────────────────────────────────────────────
