create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check (btrim(body) <> ''),
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.entries enable row level security;

drop policy if exists "own entries" on public.entries;
create policy "own entries" on public.entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists entries_user_created
  on public.entries (user_id, created_at desc);
