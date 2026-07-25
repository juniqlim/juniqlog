# 본문 암호화 계획

노트 본문을 암호화해 저장한다. **키는 Supabase 밖(Vercel)에 둔다.**

## 무엇을 막는가

**Supabase 쪽 유출**이다 — 계정 탈취, DB 유출, 백업 저장소를 실수로 공개로 돌리는 것.
암호문만 있고 키가 없으므로 읽히지 않는다.

막지 못하는 것.

- **Vercel과 Supabase가 동시에 털리는 경우.** 키와 데이터가 한 손에 들어간다.
- **앱 운영자.** 여기선 내가 운영자이자 유일한 사용자라 문제가 되지 않는다.
- **로컬로 내보낸 평문.** `notes/*.md`를 Claude Code에 읽히면 그 내용은 Anthropic으로 간다.

## 왜 이 방식인가

세 가지를 동시에 원했다 — 비번을 잊어도 데이터를 잃지 않을 것, 사용자가 복구 키를 관리하지 않을 것,
그러면서 암호화될 것.

키를 비번에서 뽑으면(E2EE) 첫 번째가 깨진다. 비번을 잊는 건 곧 키를 잃는 것이고, 서버가 도우려면
서버가 키를 가져야 하는데 그러면 서버가 읽을 수 있다. 1Password·Bitwarden·애플 고급 데이터 보호가
전부 복구 키나 복구 연락처를 요구하는 이유다. 마법은 없다.

그래서 **서버가 키를 갖되, 그 서버를 Supabase가 아닌 곳으로 고른다.** 로그인·비번 재설정은
Supabase 기본 흐름 그대로 쓰고 키는 건드리지 않는다. 사용자가 관리할 비밀이 하나도 없다.

## 설계

```
entries.body = "v1." + base64url(iv[12] ‖ AES-256-GCM(평문, KEY))
KEY = Vercel 환경변수 NOTE_KEY (32바이트, base64)
```

브라우저가 KEY를 얻는 경로:

1. Supabase에 로그인 → JWT를 받는다 (지금과 동일, 구글 로그인 유지)
2. `GET /api/key` 에 그 JWT를 실어 보낸다
3. Vercel 함수가 JWT를 검증하고 이메일이 허용된 값인지 본 뒤 KEY를 돌려준다
4. 브라우저가 KEY를 메모리에 두고 암복호화한다

- JWT 검증은 Supabase JWT 시크릿으로 한다. RLS와 같은 수준의 방어선이다.
- KEY를 IndexedDB에 캐시하지 않는다. 토큰만 있으면 언제든 다시 받을 수 있어 캐시할 이유가 없고,
  기기에 남기지 않는 편이 낫다.
- `v1.` 접두어로 평문과 암호문을 구분한다. 마이그레이션 중 섞여 있어도 안전하다.
- AES-GCM이라 변조되면 복호화가 실패한다.

암호화 대상은 **본문만**이다. `created_at`과 `tags`는 평문으로 남겨 날짜 페이징과 태그 필터를
서버에 남긴다. Supabase는 *언제 썼고 무슨 태그를 다는지*는 본다.

## 코드 변경

| 파일 | 내용 |
|---|---|
| `api/key.ts` (신규) | JWT 검증 후 `NOTE_KEY` 반환. Vercel 서버리스 함수 |
| `src/crypto.ts` (신규) | `encrypt`, `decrypt`, `isEncrypted` — WebCrypto |
| `src/app.ts` | 로그인 후 KEY 수령 / `submit`·`saveEdit`에서 암호화 / `loadEntries`에서 복호화 |
| `src/app.ts` (검색) | `q.ilike('body', …)` 제거. 전량 로드 후 복호화하고 브라우저에서 필터 |
| `tools/export.mjs` (신규) | 전량 받아 복호화 → `notes/YYYY-MM-DD.md` |

`extractTags(body)`는 평문에서 돌린 뒤 결과만 저장한다. 순서가 바뀌면 태그가 깨진다.

검색이 유일하게 느려지는 곳인데, 로그 1건이 약 200B라 1만 건이라야 2MB다. 지금은 4.5KB다.

## 마이그레이션

로그인 방식도 계정도 그대로다. 본문만 바꾼다.

1. `openssl rand -base64 32`로 KEY를 만들어 Vercel 환경변수 `NOTE_KEY`에 넣는다 (로컬 `.env`에도)
2. `tools/export.mjs`로 **평문 사본을 먼저 받아둔다** — 되돌릴 지점이다
3. `tools/migrate.mjs` 실행 — `v1.` 없는 행만 암호화해 덮어쓴다
4. 앱에서 전부 읽히는지 확인
5. 새 글 작성·수정·검색·태그가 도는지 확인

## 로컬 활용

```
node tools/export.mjs   # → notes/*.md
```

KEY는 `.env`에서 읽는다. Claude Code `SessionStart` 훅에 걸어 세션마다 자동 동기화한다.
`notes/`와 `.env`는 `.gitignore`에 넣는다.

**이 로컬 사본이 실질적인 백업이다.** Supabase가 통째로 사라져도 내용은 노트북에 남는다.

## 검증 순서

1. `test/crypto.test.ts` — 왕복, 변조 거부, 같은 평문이 매번 다른 암호문, `v1.` 판정
2. `/api/key` — 토큰 없이 부르면 401, 유효한 토큰이면 200
3. 마이그레이션 4번 — 실제로 다시 읽히는지
4. `export.mjs` 결과가 2번에서 받아둔 평문 사본과 일치하는지

## 이후

백업 워크플로(`docs/backup-plan.md`)를 붙인다. 본문이 이미 암호문이라 **GPG 단계는 뺀다.**
`created_at`·태그·`auth.users`는 평문이라 백업 저장소는 private을 유지한다.
