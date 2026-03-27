-- ============================================================
-- BONMOMENT - Schema Supabase
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLE : villes
-- ============================================================
create table public.villes (
  id           uuid primary key default uuid_generate_v4(),
  nom          text not null,
  code_insee   text unique not null,
  departement  text not null,
  active       boolean not null default false,
  created_at   timestamp with time zone not null default now()
);

alter table public.villes enable row level security;

-- Tout le monde peut lire les villes actives
create policy "villes_select_public"
  on public.villes for select
  using (active = true);

-- ============================================================
-- TABLE : users
-- ============================================================
create table public.users (
  id                      uuid primary key references auth.users(id) on delete cascade,
  email                   text not null,
  nom                     text,
  avatar_url              text,
  villes_abonnees         text[] not null default '{}',
  commerces_abonnes       uuid[] not null default '{}',
  badge_niveau            text not null default 'habitant',
  -- 'habitant' | 'commerçant' | 'admin'
  role                    text not null default 'habitant',
  notifications_actives   boolean not null default true,
  created_at              timestamp with time zone not null default now()
);

alter table public.users enable row level security;

-- Lecture publique des profils
create policy "users_select_public"
  on public.users for select
  using (true);

-- Insertion uniquement pour son propre profil
create policy "users_insert_own"
  on public.users for insert
  with check (auth.uid() = id);

-- Mise à jour uniquement de son propre profil
create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Suppression uniquement de son propre profil
create policy "users_delete_own"
  on public.users for delete
  using (auth.uid() = id);

-- ============================================================
-- TABLE : commerces
-- ============================================================
create table public.commerces (
  id                           uuid primary key default uuid_generate_v4(),
  place_id                     text unique not null,
  owner_id                     uuid not null references public.users(id) on delete cascade,
  nom                          text not null,
  categorie                    text,
  categorie_bonmoment          text,
  adresse                      text,
  ville                        text,
  description                  text,
  photo_url                    text,
  qr_code_url                  text,
  abonnement_actif             boolean not null default false,
  -- Parrainage
  code_parrainage              text unique,
  code_parrainage_expire_at    timestamp with time zone,
  parrain_id                   uuid references public.commerces(id) on delete set null,
  parrainage_filleuls_mois     integer not null default 0,
  -- Informations enrichies
  telephone                    text,
  note_google                  numeric(3,1),
  horaires                     jsonb,
  created_at                   timestamp with time zone not null default now()
);

alter table public.commerces enable row level security;

-- Lecture publique des commerces
create policy "commerces_select_public"
  on public.commerces for select
  using (true);

-- Insertion uniquement par un utilisateur connecté (owner_id = soi-même)
create policy "commerces_insert_own"
  on public.commerces for insert
  with check (auth.uid() = owner_id);

-- Mise à jour uniquement par le propriétaire
create policy "commerces_update_own"
  on public.commerces for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Suppression uniquement par le propriétaire
create policy "commerces_delete_own"
  on public.commerces for delete
  using (auth.uid() = owner_id);

-- ============================================================
-- TABLE : offres
-- ============================================================
create table public.offres (
  id                 uuid primary key default uuid_generate_v4(),
  commerce_id        uuid not null references public.commerces(id) on delete cascade,
  titre              text not null,
  description        text,
  type_remise        text,
  valeur             numeric,
  date_debut         timestamp with time zone,
  date_fin           timestamp with time zone,
  nb_bons_total      integer,
  nb_bons_restants   integer,
  statut             text not null default 'active',
  est_recurrente     boolean not null default false,
  created_at         timestamp with time zone not null default now()
);

alter table public.offres enable row level security;

-- Lecture publique des offres actives
create policy "offres_select_public"
  on public.offres for select
  using (statut = 'active');

-- Insertion uniquement par le propriétaire du commerce lié
create policy "offres_insert_owner"
  on public.offres for insert
  with check (
    auth.uid() = (select owner_id from public.commerces where id = commerce_id)
  );

-- Mise à jour uniquement par le propriétaire du commerce lié
create policy "offres_update_owner"
  on public.offres for update
  using (
    auth.uid() = (select owner_id from public.commerces where id = commerce_id)
  )
  with check (
    auth.uid() = (select owner_id from public.commerces where id = commerce_id)
  );

-- Suppression uniquement par le propriétaire du commerce lié
create policy "offres_delete_owner"
  on public.offres for delete
  using (
    auth.uid() = (select owner_id from public.commerces where id = commerce_id)
  );

-- ============================================================
-- TABLE : reservations
-- ============================================================
create table public.reservations (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.users(id) on delete cascade,
  offre_id         uuid not null references public.offres(id) on delete cascade,
  code_validation  text,
  qr_code_data     text,
  statut           text not null default 'reservee',
  created_at       timestamp with time zone not null default now(),
  utilise_at       timestamp with time zone
);

alter table public.reservations enable row level security;

-- Un user ne voit que ses propres réservations
create policy "reservations_select_own"
  on public.reservations for select
  using (auth.uid() = user_id);

-- Le propriétaire du commerce peut aussi voir les réservations de ses offres
create policy "reservations_select_commerce_owner"
  on public.reservations for select
  using (
    auth.uid() = (
      select c.owner_id
      from public.offres o
      join public.commerces c on c.id = o.commerce_id
      where o.id = offre_id
    )
  );

-- Insertion uniquement pour soi-même
create policy "reservations_insert_own"
  on public.reservations for insert
  with check (auth.uid() = user_id);

-- Mise à jour uniquement de ses propres réservations
create policy "reservations_update_own"
  on public.reservations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Suppression uniquement de ses propres réservations
create policy "reservations_delete_own"
  on public.reservations for delete
  using (auth.uid() = user_id);
