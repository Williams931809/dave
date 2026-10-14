-- Run this in Supabase Dashboard > SQL Editor.
-- Create the admin user in Authentication > Users, then insert that user's UUID
-- into public.portfolio_admins. Disable public sign-ups in Auth settings.

create table if not exists public.portfolio_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.portfolio_admins enable row level security;
revoke all on table public.portfolio_admins from anon, authenticated;
grant select on table public.portfolio_admins to authenticated;

drop policy if exists "Admins can read own allowlist row" on public.portfolio_admins;
create policy "Admins can read own allowlist row"
  on public.portfolio_admins
  for select
  to authenticated
  using (user_id = auth.uid());

create table if not exists public.portfolio_work (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 100),
  category text not null check (category in ('film', 'event', 'social', 'artist')),
  description text not null default '' check (char_length(description) <= 300),
  file_path text not null unique,
  file_name text not null,
  media_type text not null check (media_type like 'image/%' or media_type like 'video/%'),
  published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.portfolio_work enable row level security;
revoke all on table public.portfolio_work from anon, authenticated;
grant select on table public.portfolio_work to anon, authenticated;
grant insert, update, delete on table public.portfolio_work to authenticated;

drop policy if exists "Anyone can view published portfolio work" on public.portfolio_work;
create policy "Anyone can view published portfolio work"
  on public.portfolio_work
  for select
  to anon, authenticated
  using (published = true);

drop policy if exists "Admins can manage portfolio work" on public.portfolio_work;
create policy "Admins can manage portfolio work"
  on public.portfolio_work
  for all
  to authenticated
  using (exists (select 1 from public.portfolio_admins where user_id = auth.uid()))
  with check (exists (select 1 from public.portfolio_admins where user_id = auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit)
values ('portfolio-work', 'portfolio-work', true, 104857600)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

drop policy if exists "Portfolio media is publicly viewable" on storage.objects;
drop policy if exists "Admins can view portfolio media objects" on storage.objects;
create policy "Admins can view portfolio media objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'portfolio-work'
    and exists (select 1 from public.portfolio_admins where user_id = auth.uid())
  );

drop policy if exists "Admins can upload portfolio media" on storage.objects;
create policy "Admins can upload portfolio media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'portfolio-work'
    and exists (select 1 from public.portfolio_admins where user_id = auth.uid())
  );

drop policy if exists "Admins can delete portfolio media" on storage.objects;
create policy "Admins can delete portfolio media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'portfolio-work'
    and exists (select 1 from public.portfolio_admins where user_id = auth.uid())
  );
