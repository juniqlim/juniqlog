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

-- 글을 쓴 정황. 본문과 같은 DEK 로 암호화해서 넣는다.
--   {"loc":{"lat":..,"lon":..,"acc":..},"tz":"Asia/Seoul","dev":"iPhone","net":"wifi"}
-- 한 덩어리로 두면 항목을 늘려도 스키마를 건드릴 일이 없다.
-- 서버가 걸러줄 일이 없어 평문으로 둘 이유도 없다 — 검색은 어차피 브라우저에서 한다.
alter table public.entries
  add column if not exists meta text;

create index if not exists entries_user_created
  on public.entries (user_id, created_at desc);

-- 본문을 여는 키(DEK)를 사용자마다 하나씩. KEK 로 감싼 채로 둔다.
-- KEK 는 Vercel 환경변수(NOTE_KEK)에만 있어서, 이 테이블이 통째로
-- 유출돼도 여는 열쇠가 여기엔 없다.
create table if not exists public.user_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  wrapped_dek text not null,
  created_at timestamptz not null default now()
);

-- 브라우저는 이 테이블을 건드릴 일이 없다. /api/key 가 service_role 로만 읽는다.
alter table public.user_keys enable row level security;
revoke all on public.user_keys from anon, authenticated;
