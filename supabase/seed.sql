-- Safe seed data. Real facts only, from the user and the poster. No people, no personal data.
insert into public.site_settings (key, value, is_public) values
  ('site_name', '"RO-BIO"', true),
  ('tagline', '"Unauthorised innovation in progress!"', true),   -- placeholder from the user (D-20)
  ('instagram_url', '"https://www.instagram.com/ro_bio_hub/"', true),
  ('started_on', '"2026-05-20"', true),
  ('member_count', '35', true);                                   -- "about 35 for now", admins update it

with e as (
  insert into public.events (slug, title, kind, status, starts_on, previous_starts_on, venue)
  values ('bot-forge', 'Bot Forge', 'competition', 'published', '2026-10-28', '2026-06-25',
          'Mysore University School of Engineering, Manasa Gangotri Campus, Mysore-570006')
  returning id
), a as (
  insert into public.event_activities (event_id, slug, title, kind, sort_order)
  select e.id, v.slug, v.title, v.kind, v.ord from e, (values
    ('line-follower', 'Line Follower', 'competition', 1), ('robot-race', 'Robot Race', 'competition', 2),
    ('bot-expo', 'Bot Expo', 'expo', 3), ('robo-sumo', 'Robo Sumo', 'competition', 4),
    ('shark-tank', 'Shark Tank', 'competition', 5)) as v (slug, title, kind, ord)
)
-- Blank rules (Q-06). The page shows "registration details coming soon" until an admin fills them in.
insert into public.registration_forms (event_id, state) select id, 'coming_soon' from e;
