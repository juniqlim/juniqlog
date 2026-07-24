create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check (btrim(body) <> ''),
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.entries enable row level security;

-- 내 계정이면서, 허용된 이메일일 때만 접근 (두 조건 모두)
drop policy if exists "own entries" on public.entries;
create policy "own entries" on public.entries for all
  using (
    auth.uid() = user_id
    and auth.jwt() ->> 'email' = 'juniq.lim@gmail.com'
  )
  with check (
    auth.uid() = user_id
    and auth.jwt() ->> 'email' = 'juniq.lim@gmail.com'
  );

-- 소프트 삭제: null이면 살아있는 로그
alter table public.entries
  add column if not exists deleted_at timestamptz;

create index if not exists entries_user_created
  on public.entries (user_id, created_at desc);
