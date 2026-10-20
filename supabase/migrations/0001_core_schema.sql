-- First slice: events and registration. Projects, gallery, posts, team and companies come in later migrations.
create type public.app_role as enum ('super_admin', 'admin');
create type public.event_kind as enum ('competition', 'hackathon', 'workshop', 'talk', 'expo', 'other');
create type public.publish_status as enum ('draft', 'published', 'archived');
create type public.reg_state as enum ('not_planned', 'coming_soon', 'open', 'closed');
create type public.reg_status as enum ('received', 'confirmed', 'waitlisted', 'rejected', 'withdrawn');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role public.app_role not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  kind public.event_kind not null,
  status public.publish_status not null default 'draft',
  summary text,
  description_md text,
  starts_on date,               -- date only, the club has not given a time yet
  previous_starts_on date,      -- set when an event is rescheduled
  starts_at timestamptz,        -- fill in only when a real time is known
  ends_at timestamptz,
  venue text,
  poster_path text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_status_start on public.events (status, starts_on);

create table public.event_activities (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  slug text not null,
  title text not null,
  kind text not null default 'competition',
  summary text,
  rules_md text,
  takes_registration boolean not null default false,
  sort_order int not null default 0,
  unique (event_id, slug)
);

-- One registration form per event. A null means "not decided yet".
create table public.registration_forms (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events (id) on delete cascade,
  state public.reg_state not null default 'not_planned',
  opens_at timestamptz,
  closes_at timestamptz,
  audience text not null default 'unspecified' check (audience in ('unspecified', 'own_college', 'open')),
  team_min int,
  team_max int,
  capacity_teams int,
  allow_multiple_activities boolean,
  max_activities_per_team int,
  one_team_per_student boolean,
  fields jsonb not null default '[]'::jsonb,
  consent_text text,
  consent_version int not null default 1,
  retention_days int,
  updated_at timestamptz not null default now(),
  check (team_min is null or team_max is null or team_min <= team_max)
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.registration_forms (id) on delete restrict,
  public_ref text not null unique,
  idempotency_key uuid not null unique,
  team_name text not null,
  status public.reg_status not null default 'received',
  answers jsonb not null default '{}'::jsonb,
  consent_version int not null,
  consented_at timestamptz not null,
  internal_note text,
  abuse_hash text,
  created_at timestamptz not null default now()
);
create index registrations_form_created on public.registrations (form_id, created_at);

create table public.registration_members (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations (id) on delete cascade,
  form_id uuid not null references public.registration_forms (id),
  position int not null,
  is_leader boolean not null default false,
  full_name text not null,
  usn text,
  usn_norm text generated always as (upper(regexp_replace(coalesce(usn, ''), '\s', '', 'g'))) stored,
  email text,
  email_norm text generated always as (lower(btrim(coalesce(email, '')))) stored,
  phone text,
  year_of_study text,
  branch text,
  college text,
  answers jsonb not null default '{}'::jsonb,
  unique (registration_id, position)
);
create index members_form_usn on public.registration_members (form_id, usn_norm);
create index members_form_email on public.registration_members (form_id, email_norm);

create table public.registration_activities (
  registration_id uuid not null references public.registrations (id) on delete cascade,
  activity_id uuid not null references public.event_activities (id) on delete restrict,
  primary key (registration_id, activity_id)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text,
  entity_id text,
  meta jsonb not null default '{}'::jsonb,  -- ids and counts only, never personal data
  at timestamptz not null default now()
);
