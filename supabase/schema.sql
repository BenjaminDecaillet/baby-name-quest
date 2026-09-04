-- Baby Name Quest — schéma Supabase.
-- À coller tel quel dans l'éditeur SQL du projet (Dashboard > SQL Editor > New query).
--
-- Principe de sécurité : l'application n'utilise que la clé anon (publique).
-- Chaque requête envoie le code de couple dans l'en-tête HTTP `x-couple-code` ;
-- les policies RLS ci-dessous ne laissent voir/modifier que les lignes de ce code.
-- Sans le bon code, aucune ligne n'est accessible (ni en lecture ni en écriture).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Fonction utilitaire : code de couple transmis par le client.
-- ---------------------------------------------------------------------------
create or replace function public.request_couple_code()
returns text
language sql
stable
as $$
  select nullif(
    coalesce(current_setting('request.headers', true), '{}')::json ->> 'x-couple-code',
    ''
  );
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.couples (
  code        text primary key check (code ~ '^[A-Z0-9][A-Z0-9-]{2,38}[A-Z0-9]$'),
  created_at  timestamptz not null default now(),
  match_order jsonb not null default '[]'::jsonb
);

create table if not exists public.profiles (
  id                uuid primary key default gen_random_uuid(),
  couple_code       text not null references public.couples (code) on delete cascade,
  display_name      text not null check (char_length(display_name) between 1 and 40),
  gender_preference text not null check (gender_preference in ('f', 'm', 'both')),
  created_at        timestamptz not null default now()
);

create table if not exists public.votes (
  couple_code text not null references public.couples (code) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  name_id     text not null check (char_length(name_id) between 1 and 80),
  value       text not null check (value in ('like', 'skip')),
  note        text check (note is null or char_length(note) <= 500),
  updated_at  timestamptz not null default now(),
  primary key (profile_id, name_id)
);

-- ---------------------------------------------------------------------------
-- Index
-- ---------------------------------------------------------------------------
create index if not exists profiles_couple_code_idx on public.profiles (couple_code);
create index if not exists votes_couple_code_idx on public.votes (couple_code);
create index if not exists votes_couple_value_idx on public.votes (couple_code, value);

-- Garantit qu'un vote référence un profil du même couple.
create or replace function public.check_vote_profile_couple()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = new.profile_id and p.couple_code = new.couple_code
  ) then
    raise exception 'profile % does not belong to couple %', new.profile_id, new.couple_code;
  end if;
  return new;
end;
$$;

drop trigger if exists votes_profile_couple_check on public.votes;
create trigger votes_profile_couple_check
  before insert or update on public.votes
  for each row execute function public.check_vote_profile_couple();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.couples  enable row level security;
alter table public.profiles enable row level security;
alter table public.votes    enable row level security;

drop policy if exists couples_by_code on public.couples;
create policy couples_by_code on public.couples
  for all to anon, authenticated
  using (code = public.request_couple_code())
  with check (code = public.request_couple_code());

drop policy if exists profiles_by_code on public.profiles;
create policy profiles_by_code on public.profiles
  for all to anon, authenticated
  using (couple_code = public.request_couple_code())
  with check (couple_code = public.request_couple_code());

drop policy if exists votes_by_code on public.votes;
create policy votes_by_code on public.votes
  for all to anon, authenticated
  using (couple_code = public.request_couple_code())
  with check (couple_code = public.request_couple_code());

-- Droits de base pour le rôle anon (les policies font le filtrage).
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.couples, public.profiles, public.votes to anon, authenticated;
grant execute on function public.request_couple_code() to anon, authenticated;
