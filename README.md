# juniqlog

생각을 남긴다.  
생각을 기록한다.  
생각을 생각한다.

생각을 남기는 개인 로그. 본문은 암호화해 보관한다.

## 차기 이름 후보

`juniqlog` 는 내 아이디를 붙인 이름이라 무엇을 하는 물건인지 말해주지 않는다.

이 앱은 로깅이면서 나와의 대화다. 그 둘을 다 담으려 한다.
이미 임자가 없을 것, 소리에 맛이 있을 것, 이름만 듣고 무엇인지 떠오를 것.

**thinkthink** — 화면에 걸어두고 써보는 중이다. 부제는 `think about thinking`.
확정은 아니라 저장소와 패키지 이름은 `juniqlog` 로 둔다.
`src/draft.ts` 의 임시 저장 열쇠도 그대로다 — 바꾸면 쓰다 만 글이 사라진다.

이름은 짧게, 뜻은 부제로 나눈다. 머리말 셋째 줄이 그대로 영어가 된 셈이다.
`think and think` 는 "거듭 생각한다"라 다른 말이고, 문법을 벗어난 `thinkthink`
는 거듭으로도 생각의 생각으로도 읽혀 오히려 이름에 이롭다. `wikiwiki` 도
문법이 아니라 강조였다.

대문자를 끼우지 않는다. `ThinkThink` 는 대문자가 두 낱말의 경계를 드러내
"think + think" 라고 설명해버린다. 붙여 쓰면 한 덩어리 소리가 된다.
도메인·URL·패키지는 어차피 소문자라 어디서나 같은 모습이 된다.
`WikiWikiWeb` 이 대문자였던 것은 미감이 아니라 그 위키의 링크 문법이
CamelCase 를 요구해서였고, 일반명사가 되자 곧 `wiki` 로 굳었다.

겹치는 것 — 일본 Wonderfy 의 아동 교육 게임 `Think!Think!` 가 있다
(안드로이드 패키지가 `com.hanamarulab.thinkthinkapp`). 표기도 분야도 달라
정면으로 부딪히지는 않는다.

도메인 — `.com` `.net` `.org` `.io` 는 등록돼 있고 **`.app` 과 `.dev` 는
비어 있다** (2026-07-25 확인). 웹앱에 `.app` 이 맞으니 이름과 성격이 한 줄로 이어진다.

### 나머지 후보

- **loglog** — log + dialog. 기록이면서 말이다. dialogue 의 `-log` 는 그리스어
  logos(말)이고 기록의 log 는 항해 통나무에서 온 다른 말이지만, 겹쳐 읽히는 게
  재미다. 뜻은 설명을 들어야 읽힌다. `loglog.app` 도 비어 있다
- **onthink** — think about thinking 을 한 낱말로. `on` 은 "…에 대하여"(On Liberty),
  `think on` 은 곰곰이 생각한다는 관용구다. 소리는 thinkthink 만 못하다
- **thinkling** — think + inkling. 소리가 가장 곱지만 뜻이 "생각의 씨앗"에서 멈춘다
- **inklog** — ink + log. 잉크로 남긴 기록. 짧고 뜻이 바로 선다
- **solilog** — soliloquy + log. 나와의 대화를 정확히 가리킨다
- **monolog** · **dialog** — 혼잣말과 대화. 있는 낱말이라 신선하지 않다
- **no'ono'o** — 하와이어로 곰곰이 생각하다. `no'o` 를 겹친 반복형이라 thinkthink 의
  하와이어판이다. 아포스트로피가 도메인과 입력에서 걸린다. 뜻과 철자는 확인이 필요하다
- **thinkout** — 생각을 꺼낸다. "끝까지 생각하다"로도 읽힌다
- **mull** · **inkling** · **jot** · **cairn** · **keep** — 흔한 낱말이라 이미 임자가 있다.
  keep 은 Google, jot 은 스타일러스와 커피, inkling 은 교재 회사, cairn 은 아웃도어 쪽
- **thinkrecorder** · **quicklog** — 하는 일을 그대로 적었다. 이름보다 설명이라 로고로 서기 어렵다.
  커닝햄도 `QuickWeb` 을 밋밋해서 버리고 하와이어 `wiki wiki`(빨리빨리)를 데려왔다

## 로컬에서 띄우기

```
npm install
npm run dev
```

`http://localhost:5173` — 화면과 `api/` 의 함수가 함께 뜬다.

`vercel dev` 도 vercel CLI 도 필요 없다. `tools/dev-api.ts` 가 vite 개발 서버에서
`api/*.js` 를 그대로 태우고 `.env.local` 을 읽는다. 배포 경로는 건드리지 않는다.

## 테스트

```
npm test
```

세 겹으로 나눈다. 겹끼리 섞지 않는다.

1. **단위** — 의존이 없다. `src/` 의 순수 모듈만 부른다. 거의 전부가 여기 있다.
2. **통합** — 여러 조각을 함께 돌리되 **외부에는 나가지 않는다.** 가짜 저장소를
   쓰거나(`store-memory`), 우리가 만든 것을 남의 도구에 물려본다
   (`zip.integration.test.ts` 는 실제 `unzip` 을 부른다). 파일을 따로 둔다.
3. **외부 연결 확인** — 실제 Supabase 에 닿는지 본다. 인터넷이 끊겼다고 테스트가
   무너지면 안 되므로 평소 `npm test` 에서는 뺀다. 아직 없다.

## 의존을 대하는 방침

순수 함수로 쪼개놓고 정작 앱은 못 돌린다면 모순이다.
**로컬은 바깥 없이 떠야 한다.**

- vercel CLI 의존 — 없앴다 (`tools/dev-api.ts`)
- Supabase 의존 — 격리했다. `src/store.ts` 라는 약속만 두고 뒤를 갈아끼운다.
  개발 서버는 메모리 저장소로 뜬다. 실제 데이터를 보려면 `.env.local` 에
  `VITE_STORE=supabase`.

## 구조

- `src/` — 순수 모듈. 시간·태그·검색·달력·암호화·내보내기. 테스트가 여기 붙어 있다
- `src/store.ts` — 저장소와의 약속. 밖에서는 평문만 오간다
- `src/store-memory.ts` · `src/store-supabase.ts` — 그 약속의 두 가지 뒤
- `src/app.ts` — 화면. 뒤가 무엇인지 모른다
- `api/key.js` — 본문 암호화 키를 내주는 우리 함수 (아래)
- `tools/` — 개발·이전용 도구. 배포물에 들어가지 않는다

## 내보내기와 가져오기

Supabase 가 사라져도 내용은 손에 남아야 한다.

노트북에서는 폴더로 떨군다. `notes/` 는 복호화한 평문이라 커밋하지 않는다.

```
npm run export           notes/2026/07/25.md — 사람이 읽는 용
npm run export -- --json notes/entries.json — 집계·통계용
npm run export -- --all  둘 다
```

폰에는 터미널이 없으니 사이드바에 **내보내기** 를 둔다. 전량을 zip 하나로
묶어 공유시트에 넘긴다 — iCloud 든 어디든 둘 곳은 고르는 사람이 정한다.
안에는 같은 날짜 폴더와 `entries.json` 이 함께 들어간다.

**가져오기** 는 그 zip 이나 `entries.json` 을 받는다. 마크다운은 읽지 않는다 —
정황이 한 줄로 줄어든 사본이라 되돌릴 게 없다. 이미 있는 것은 넣지 않는다.
같은 순간에 쓴 같은 글이면 같은 글로 본다. id 는 기기가 바뀌면 달라져 믿을 수 없다.

## 밝게 · 어둡게

색은 `index.html` 의 `light-dark()` 안에 한 번만 적는다. 팔레트를 둘로 나눠
쓰면 한쪽만 고치는 날이 온다. 고르기 전에는 기기 설정을 따르고, 사이드바에서
고르면 그것이 앞선다.

## 본문 암호화

봉투 암호화다. 열쇠를 자물쇠 옆에 두지 않으려고 서버 함수 하나를 둔다.

- 본문은 **DEK** 로 암호화해 저장한다
- 그 DEK 도 **KEK** 로 감싸 Supabase(`user_keys`) 에 둔다
- KEK 는 Supabase 밖에만 있다 (환경변수 `NOTE_KEK`)

그래서 Supabase 가 통째로 새도 나가는 것은 암호문과 감싸진 DEK 뿐이다.
`api/key.js` 는 로그인한 본인임을 확인하고 그 사람의 DEK 만 풀어 내준다.
브라우저가 이 일을 대신할 수 없는 이유는, 브라우저 코드는 누구나 열어보기 때문이다.
