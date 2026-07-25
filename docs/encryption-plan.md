# 본문 암호화 계획

노트 본문을 브라우저에서 암호화해 저장한다. Supabase는 암호문만 보관한다.

## 무엇을 막는가

**Supabase 쪽 유출**이 대상이다 — 계정 탈취, DB 유출, 백업 저장소를 실수로 공개로 돌리는 것.
이건 내 통제 밖에서 일어난다.

막지 못하는 것도 분명히 해둔다.

- **코드 배포 경로.** 암호화하는 JS를 Vercel이 내려준다. 악의적 코드가 배포되면 암호를 입력받는 순간 샌다.
  Supabase 혼자서는 할 수 없는 일이고 배포는 내가 하니 실질 위험은 낮지만, 웹앱 E2EE의 원리적 한계다.
- **로컬로 내보낸 평문.** `tools/export.mjs`가 푼 마크다운을 Claude Code에 읽히면 그 내용은 Anthropic으로 간다.
  Supabase에 안 보이게 하는 것과는 별개의 판단이다. 내보낼 범위는 export 단계에서 고른다.

## 결정

| 항목 | 결정 | 이유 |
|---|---|---|
| 로그인 | **구글 제거**, 이메일+암호로 통합 | 화면 하나, 암호 하나. 구글은 이름·사진·계정ID까지 `auth.users`에 남긴다 |
| 암호화 범위 | **본문만**. 태그·`created_at`은 평문 | 태그 필터와 날짜 페이징이 서버에 남는다 |
| 암호 입력 | **기기당 1회**, 유도한 키를 IndexedDB에 보관 | 매번 묻지 않는다. 기기를 뺏기면 열린다 |
| 알고리즘 | AES-256-GCM + PBKDF2-SHA256 | 브라우저 WebCrypto와 Node에 모두 내장. 의존성 0 |
| 검색 | 서버 `ilike` 제거 → 전량 받아 브라우저에서 | 서버가 암호문만 보니 선택지가 없다 |

암호를 잃으면 **계정과 데이터를 동시에** 잃는다. 이게 이 설계의 값이다.

## 키 유도

암호 하나에서 두 키를 갈라 뽑는다. 한쪽에서 다른 쪽을 역산할 수 없다.

```
master  = PBKDF2-SHA256(암호, salt=이메일, 600_000회, 32B)
authKey = HKDF-SHA256(master, info="juniqlog:auth") → base64 → Supabase 로그인 비밀번호
encKey  = HKDF-SHA256(master, info="juniqlog:enc")  → AES-GCM 키
```

- 서버가 갖는 건 `bcrypt(authKey)`뿐이다. 여기서 `authKey`도, `encKey`도 나오지 않는다.
- salt를 이메일로 두는 이유: 로그인 전에 클라이언트가 아는 값이면서 사용자마다 다르다.
- 600,000회는 브루트포스 비용을 올리기 위한 것. 해시가 유출돼도 16자 랜덤이면 뚫리지 않는다.

## 저장 형식

`entries.body`에 그대로 넣는다.

```
v1.<base64url(iv[12] ‖ ciphertext‖tag)>
```

- `v1.` 접두어로 평문과 암호문을 구분한다. 마이그레이션 중 섞여 있어도 안전하고, 나중에 형식을 바꿀 여지도 남는다.
- IV는 레코드마다 새로 뽑는다.
- AES-GCM이라 **틀린 키로는 복호화 자체가 실패한다.** 암호 검증에 이걸 쓴다.

## 코드 변경

| 파일 | 내용 |
|---|---|
| `src/crypto.ts` (신규) | `deriveKeys`, `encrypt`, `decrypt`, `isEncrypted` |
| `src/vault.ts` (신규) | 유도한 키를 IndexedDB에 저장·복원 |
| `src/app.ts` | 구글 버튼 제거 → 이메일+암호 화면 / `submit`·`saveEdit`에서 암호화 / `loadEntries`에서 복호화 |
| `src/app.ts` (검색) | `q.ilike('body', …)` 제거. 전량 로드 후 복호화하고 브라우저에서 필터 |
| `tools/export.mjs` (신규) | 전량 받아 복호화 → `notes/YYYY-MM-DD.md` |

`extractTags(body)`는 평문 상태에서 돌린 뒤 그 결과만 평문으로 저장한다. 순서가 바뀌면 태그가 깨진다.

## 마이그레이션

RLS가 `auth.uid()`와 이메일 두 가지로 거는데, **이메일이 그대로고 `user_id`도 유지되므로 데이터를 옮기지 않는다.**
기존 구글 계정에 비밀번호를 추가하는 방식이라 계정도 그대로다.

앱에 1회용 화면을 띄워 브라우저에서 실행한다(service_role 키를 쓰지 않기 위해).

1. Supabase 대시보드에서 Email 로그인(비밀번호) 활성화
2. 지금처럼 **구글로 로그인**
3. 암호 입력 → `authKey`·`encKey` 유도
4. `auth.updateUser({ password: authKey })` — 같은 계정에 비밀번호가 붙는다
5. 평문 본문 전부를 `encKey`로 암호화해 덮어쓴다 (`v1.` 없는 행만)
6. 로그아웃 → 이메일+암호로 다시 로그인해 전부 읽히는지 확인
7. 확인된 뒤에 구글 로그인 UI와 마이그레이션 화면을 제거한다

되돌릴 지점은 6번이다. 여기서 안 읽히면 4번 이전 상태로 돌아갈 수 있어야 하므로,
**2번 직후 `tools/export.mjs`로 평문 사본을 로컬에 먼저 받아둔다.**

## 로컬 활용

```
node tools/export.mjs   # → notes/*.md
```

암호는 `~/.juniqlog-pass`에서 읽는다. Claude Code `SessionStart` 훅에 걸어 세션마다 자동 동기화한다.
`notes/`는 평문이므로 `.gitignore`에 넣는다.

## 검증 순서

1. `test/crypto.test.ts` — 왕복, 틀린 암호 거부, 같은 평문이 매번 다른 암호문, `v1.` 판정
2. Node와 브라우저가 같은 암호문을 여는지 (같은 WebCrypto API라 자명하지만 한 번 확인)
3. 마이그레이션 6번 — 실제로 다시 읽히는지
4. `export.mjs`가 원본과 일치하는 평문을 뱉는지

## 이후

백업 워크플로(`docs/backup-plan.md`)를 붙인다. 본문이 이미 암호문이라 **GPG 단계는 뺀다.**
`created_at`·태그·`auth.users`는 여전히 평문이라 백업 저장소는 private을 유지한다.
