-- Row-level security on every table. Participant data has no public policy at all.
create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active); $$;

create function public.is_super_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles p
                 where p.id = (select auth.uid()) and p.is_active and p.role = 'super_admin')
         and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;

alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.events enable row level security;
alter table public.event_activities enable row level security;
alter table public.registration_forms enable row level security;
alter table public.registrations enable row level security;
alter table public.registration_members enable row level security;
alter table public.registration_activities enable row level security;
alter table public.audit_log enable row level security;

-- Public reads: published events and their activities, and settings marked public.
create policy events_public_read on public.events for select to anon, authenticated using (status = 'published');
create policy events_admin_all on public.events for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy events_delete_super on public.events as restrictive for delete to authenticated using (public.is_super_admin());

create policy activities_public_read on public.event_activities for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = event_id and e.status = 'published'));
create policy activities_admin_all on public.event_activities for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy activities_delete_super on public.event_activities as restrictive for delete to authenticated using (public.is_super_admin());

create policy settings_public_read on public.site_settings for select to anon, authenticated using (is_public);
create policy settings_admin_all on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Registration forms are not public. The server route returns the public subset using the service role.
create policy forms_admin_all on public.registration_forms for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy forms_delete_super on public.registration_forms as restrictive for delete to authenticated using (public.is_super_admin());

-- Participant data: admins read, super admin deletes, nobody inserts directly.
revoke all on public.registrations, public.registration_members, public.registration_activities, public.audit_log from anon;
revoke insert, update, delete on public.registrations, public.registration_members, public.registration_activities from authenticated;
revoke all on public.audit_log from authenticated;
grant select on public.registrations, public.registration_members, public.registration_activities, public.audit_log to authenticated;
grant update (status, internal_note) on public.registrations to authenticated;
grant delete on public.registrations to authenticated;

create policy reg_admin_read on public.registrations for select to authenticated using (public.is_admin());
create policy reg_admin_update on public.registrations for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy reg_super_delete on public.registrations for delete to authenticated using (public.is_super_admin());
create policy members_admin_read on public.registration_members for select to authenticated using (public.is_admin());
create policy regacts_admin_read on public.registration_activities for select to authenticated using (public.is_admin());
create policy audit_super_read on public.audit_log for select to authenticated using (public.is_super_admin());

-- Profiles: read your own row, only the super admin changes anything.
create policy profiles_self_read on public.profiles for select to authenticated using (id = (select auth.uid()) or public.is_super_admin());
create policy profiles_super_write on public.profiles for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
