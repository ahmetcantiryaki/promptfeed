-- Split the model taxonomy by the media each model generates, so the UI can
-- group models into image vs video (and the Gallery/Video switcher can show
-- the relevant set). Existing taxonomy entries are image generators; the new
-- Seedance / Kling / Veo entries are video generators.
--
--   kind = 'image' | 'video'  (defaults to 'image' so existing rows are
--   untouched and any future scraper insert lands as an image model unless
--   told otherwise).

alter table public.models
  add column if not exists kind text not null default 'image';

alter table public.models
  drop constraint if exists models_kind_check;
alter table public.models
  add constraint models_kind_check check (kind in ('image', 'video'));

-- Seed the video model taxonomy.
insert into public.models (slug, name, kind) values
  ('seedance-2-0', 'Seedance 2.0', 'video'),
  ('kling-o1',     'Kling O1',     'video'),
  ('kling-3-0',    'Kling 3.0',    'video'),
  ('veo-3-1',      'Veo 3.1',      'video')
on conflict (slug) do update
  set name = excluded.name, kind = excluded.kind;
