alter table public.site_settings
  add column if not exists social_visibility jsonb not null default '{}'::jsonb;

comment on column public.site_settings.social_visibility is
  'Per-platform publication preferences. Missing keys are visible; saved social links are preserved.';
