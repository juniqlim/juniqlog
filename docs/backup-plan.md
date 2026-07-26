# 자동 백업 계획 (진행중)

DB 데이터를 주기적으로 덤프 → 압축·암호화 → 프라이빗 repo에 커밋한다.

## 왜

- Supabase 무료 플랜은 **백업이 없다.** 테이블을 날리면 복구 수단이 없다.
- 무료 플랜은 1주일 비활동 시 프로젝트가 pause된다. 매일 붙으면 이것도 같이 막힌다.
- 손으로 누르는 내보내기는 백업이 아니다. 자동이어야 한다.
- **암호화하는 이유**: private repo는 *남에게* 안 보이는 것이지 *GitHub에게* 안 보이는 게 아니다. 올리기 전에 암호화하면 GitHub이 보관하는 건 암호문뿐이다.

## 검증 완료 (로컬에서 실제로 확인함)

| 단계 | 결과 |
|---|---|
| pooler 연결 | ✓ IPv4로 붙음 → Actions 러너에서도 가능 |
| `pg_dump` | ✓ 전체 행 덤프, 4.5KB |
| 압축+암호화 | ✓ 4,534B → 2,173B (AES256 + zlib) |
| 틀린 암호 | ✓ 거부 (`Bad session key`) |
| 복호화 | ✓ 원본과 **완전 일치** |

### 확인된 접속 조건

- **직접 연결(`db.<ref>.supabase.co`)은 IPv6 전용** → 로컬도 GitHub Actions도 못 붙는다. **pooler를 써야 한다.**
- pooler 호스트: `aws-1-ap-northeast-2.pooler.supabase.com:5432`
  (`aws-0-...`는 `tenant/user not found`로 실패. 호스트 접두어가 `aws-1`인 게 핵심)
- 사용자명 형식: `postgres.<PROJECT_REF>`
- **서버 Postgres 17.6** → `pg_dump`도 **17 이상**이어야 한다. 16으로는 버전 불일치로 거부된다.
- 로컬에 `postgresql-client`가 없어 `postgres:17-alpine` 도커 이미지로 우회했다 (sudo 불필요).

### 검증에 쓴 명령

```bash
# 덤프
docker run --rm -e PGPASSWORD="$SUPABASE_DB_PASSWORD" postgres:17-alpine \
  pg_dump -h aws-1-ap-northeast-2.pooler.supabase.com \
          -U "postgres.$SUPABASE_PROJECT_REF" -d postgres \
          --no-owner --no-privileges -t public.entries > dump.sql

# 압축+암호화
gpg --batch --yes --pinentry-mode loopback --passphrase "$BACKUP_PASS" \
    --symmetric --cipher-algo AES256 --compress-algo zlib -o dump.sql.gpg dump.sql

# 복원
gpg --batch --pinentry-mode loopback --passphrase "$BACKUP_PASS" -d dump.sql.gpg > restored.sql
```

## 남은 작업

1. **백업 암호 정하기** ← 여기서 멈춤. 아래 "결정 필요" 참고
2. 프라이빗 repo `thinkthink-backup` 생성 (이 repo는 **PUBLIC**이라 백업을 여기 두면 안 된다)
3. 백업 repo에 Actions Secrets 등록: `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`, `BACKUP_PASS`
   - **public인 이 repo에는 아무것도 넣지 않는다.** 워크플로도 백업 repo에서 돌린다.
4. 워크플로 작성 (`.github/workflows/backup.yml`)
   - cron **6시간마다**, `workflow_dispatch`도 열어둘 것
   - `postgresql-client-17` 설치 → `pg_dump` → `gpg -c` → 커밋·푸시
   - **평문 해시를 따로 저장해 변경 시에만 커밋한다.** gpg는 salt가 매번 달라서 내용이 같아도 암호문이 달라진다. 그냥 두면 6시간마다 무의미한 커밋이 쌓인다.
5. `workflow_dispatch`로 1회 수동 실행 → 덤프 파일이 실제로 올라오는지 확인
6. `RESTORE.md` 작성 — 사고 났을 때 따라할 복원 절차. 백업은 복원해봐야 백업이다.

## 결정 필요

**백업 암호를 어떻게 정할지.** 이 암호를 잃으면 백업 전체가 영구히 못 열린다.

- **A안 (추천)**: 랜덤 생성 → `~/.thinkthink-backup-pass` (권한 600)에 저장하고 GitHub Secret에 등록.
  화면·대화 로그 어디에도 안 남는다. 파일을 열어 비밀번호 관리자로 옮긴 뒤 파일을 지운다.
- **B안**: 직접 정하고 `gh secret set`으로 직접 등록.

## 나중에 볼 것 (이번 작업과 별개)

순서는 **백업 → PWA → 본문 암호화 + 오프라인**이다. 캐시가 언제 날아갈지 모르는 상태에서
오프라인 지원부터 붙이면 아직 서버로 못 보낸 글이 그대로 유실된다.

### PWA (홈 화면에 추가)

`manifest.json` + 아이콘 + `<link rel="manifest">` 세 개면 된다. 지금은 셋 다 없어서
홈 화면에 추가해봤자 북마크나 다름없다.

- **홈 화면 앱은 사파리와 저장소가 분리된다.** 홈 화면 아이콘으로 처음 열면 캐시를 새로 받는다.
- 그 대신 **ITP 7일 삭제에서 면제**된다.

### 본문 암호화

지금 `entries.body`는 평문이라 **Supabase는 내용을 다 볼 수 있다.**

암호화하면 서버가 암호문만 보므로 **검색을 서버에서 못 한다.**
→ 전량 받아서 브라우저에서 복호화 후 검색해야 한다. 그런데 이건 이 규모에선 문제가 아니다.

- 로그 1건 ≈ 200B → **1만 건이라야 2MB.** 하루 20건씩 써도 1년 반 걸린다.
- IndexedDB에 캐시하고 이후엔 새 것만 받으면 된다. 검색은 네트워크 왕복이 없어져 **오히려 빨라진다.**
- **오프라인 지원이 공짜로 따라온다.** 데이터가 어차피 로컬에 다 있으니까.

진짜 비용:

- 새 기기 첫 진입이 느리다 (전량 받아 복호화).
- **`created_at`은 평문으로 둬야** 날짜 그룹·페이징이 서버에서 된다. *언제 썼는지*는 Supabase가 본다. 내용은 못 보고.
- **암호 분실 = 전부 소실.** 백업 암호와 같은 성질이다.
- 절충안: **본문만 암호화하고 태그는 평문.** 태그 필터가 서버에서 살아남는다. 대신 태그명은 노출된다.

### 사파리 ITP — 캐시는 지워진다

**Safari는 7일간 방문이 없으면 IndexedDB·localStorage를 통째로 비운다.**

- 캐시일 뿐이라 유실은 아니다. 원본 암호문은 서버에 있으니 다시 받아 풀면 된다. 잃는 건 첫 로딩 몇 초.
- 매일 쓰는 앱이면 7일 조건에 사실상 안 걸린다. PWA로 만들면 아예 면제된다.
- **진짜 위험은 오프라인 지원 쪽이다.** 아직 서버로 못 보낸 글이 로컬에만 있는 상태에서 ITP가 청소하면
  **그건 진짜로 사라진다.** 설계로 막아야 한다.

### 오프라인 지원

로컬 캐시 후 동기화. 본문 암호화를 하면 대부분 따라오므로 같이 다룬다.
