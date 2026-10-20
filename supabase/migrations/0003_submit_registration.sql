-- The only way to create a registration. One transaction, serialised per form, so two people
-- submitting at the same moment cannot beat the capacity limit or the duplicate check.
create function public.submit_registration(
  p_form_id uuid, p_idempotency_key uuid, p_team_name text, p_members jsonb,
  p_activity_ids uuid[], p_answers jsonb, p_consent_version int, p_abuse_hash text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  f public.registration_forms%rowtype;
  prior public.registrations%rowtype;
  n_members int; n_teams int; n_acts int; reg_id uuid; ref text; m jsonb; pos int := 0; tries int := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_form_id::text, 0));

  select * into prior from public.registrations where idempotency_key = p_idempotency_key and form_id = p_form_id;
  if found then return jsonb_build_object('ok', true, 'public_ref', prior.public_ref); end if;

  select * into f from public.registration_forms where id = p_form_id;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;

  -- Database time, never the client's.
  if f.state <> 'open' or (f.opens_at is not null and now() < f.opens_at)
     or (f.closes_at is not null and now() >= f.closes_at) then
    return jsonb_build_object('ok', false, 'code', 'closed');
  end if;
  if p_consent_version is distinct from f.consent_version then
    return jsonb_build_object('ok', false, 'code', 'consent');
  end if;
  if coalesce(btrim(p_team_name), '') = '' or jsonb_typeof(p_members) <> 'array' then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;

  n_members := jsonb_array_length(p_members);
  if n_members < 1 or (f.team_min is not null and n_members < f.team_min)
     or (f.team_max is not null and n_members > f.team_max) then
    return jsonb_build_object('ok', false, 'code', 'team_size');
  end if;
  if exists (select 1 from jsonb_array_elements(p_members) e where coalesce(btrim(e ->> 'full_name'), '') = '') then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;

  if f.capacity_teams is not null then
    select count(*) into n_teams from public.registrations
      where form_id = f.id and status not in ('withdrawn', 'rejected');
    if n_teams >= f.capacity_teams then return jsonb_build_object('ok', false, 'code', 'full'); end if;
  end if;

  select count(distinct x) into n_acts from unnest(coalesce(p_activity_ids, '{}')) x;
  if n_acts > 0 and (select count(*) from public.event_activities a
                     where a.id = any (p_activity_ids) and a.event_id = f.event_id and a.takes_registration) <> n_acts then
    return jsonb_build_object('ok', false, 'code', 'activities');
  end if;
  if (f.allow_multiple_activities is false and n_acts > 1)
     or (f.max_activities_per_team is not null and n_acts > f.max_activities_per_team) then
    return jsonb_build_object('ok', false, 'code', 'activities');
  end if;

  -- Null means undecided (Q-06). Enforce only when the club has said yes.
  if f.one_team_per_student is true and exists (
    select 1 from jsonb_array_elements(p_members) mm
    join public.registration_members rm on rm.form_id = f.id
    join public.registrations r on r.id = rm.registration_id and r.status not in ('withdrawn', 'rejected')
    where nullif(upper(regexp_replace(coalesce(mm ->> 'usn', ''), '\s', '', 'g')), '') = rm.usn_norm
       or nullif(lower(btrim(coalesce(mm ->> 'email', ''))), '') = rm.email_norm
  ) then
    return jsonb_build_object('ok', false, 'code', 'conflict');
  end if;

  -- Random reference, not sequential. gen_random_uuid avoids needing pgcrypto.
  loop
    ref := 'R-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    exit when not exists (select 1 from public.registrations where public_ref = ref);
    tries := tries + 1;
    if tries > 5 then raise exception 'could not allocate a reference'; end if;
  end loop;

  insert into public.registrations (form_id, public_ref, idempotency_key, team_name, answers, consent_version, consented_at, abuse_hash)
  values (f.id, ref, p_idempotency_key, btrim(p_team_name), coalesce(p_answers, '{}'::jsonb), f.consent_version, now(), p_abuse_hash)
  returning id into reg_id;

  for m in select * from jsonb_array_elements(p_members) loop
    pos := pos + 1;
    insert into public.registration_members (registration_id, form_id, position, is_leader, full_name, usn, email, phone, year_of_study, branch, college, answers)
    values (reg_id, f.id, pos, pos = 1, btrim(m ->> 'full_name'), m ->> 'usn', m ->> 'email', m ->> 'phone',
            m ->> 'year_of_study', m ->> 'branch', m ->> 'college', coalesce(m -> 'answers', '{}'::jsonb));
  end loop;

  if n_acts > 0 then
    insert into public.registration_activities (registration_id, activity_id)
    select distinct reg_id, x from unnest(p_activity_ids) x;
  end if;

  insert into public.audit_log (action, entity, entity_id, meta)
  values ('registration.create', 'registration', reg_id::text, jsonb_build_object('form_id', f.id, 'members', n_members));

  return jsonb_build_object('ok', true, 'public_ref', ref);
end;
$$;

revoke all on function public.submit_registration(uuid, uuid, text, jsonb, uuid[], jsonb, int, text) from public, anon, authenticated;
grant execute on function public.submit_registration(uuid, uuid, text, jsonb, uuid[], jsonb, int, text) to service_role;
