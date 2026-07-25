/**
 * 전량 받아 복호화해 notes/ 로 떨군다.
 *
 * Supabase 가 사라져도 내용은 노트북에 남는다 — 이게 실질적인 백업이다.
 * 브라우저와 같은 src/crypto.ts 를 쓴다. 복제하면 언젠가 어긋난다.
 *
 *   node tools/export.ts            월별 마크다운 (사람이 읽기 좋다)
 *   node tools/export.ts --json     한 파일 JSON (집계·통계에 좋다)
 *   node tools/export.ts --all      둘 다
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { importKey, decrypt, isEncrypted } from '../src/crypto.ts'
import { describeMeta } from '../src/meta.ts'

process.loadEnvFile('.env')

const SUPABASE_URL = 'https://zuvifgiiahbypxsvnzvg.supabase.co'
const OUT_DIR = 'notes'
const HOME_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone

const wantJson = process.argv.includes('--json') || process.argv.includes('--all')
const wantMarkdown = !process.argv.includes('--json') || process.argv.includes('--all')

const serviceKey = need('SUPABASE_SERVICE_KEY')
const auth = { apikey: serviceKey, authorization: `Bearer ${serviceKey}` }

// 본문을 여는 키(DEK)는 KEK 로 감싸여 user_keys 에 있다
const kek = await importKey(need('NOTE_KEK'))
const wrapped: { wrapped_dek: string }[] = await fetch(
  `${SUPABASE_URL}/rest/v1/user_keys?select=wrapped_dek`, { headers: auth },
).then(res => res.json())
if (wrapped.length === 0) throw new Error('user_keys 에 감싼 키가 없다')
const key = await importKey(await decrypt(wrapped[0].wrapped_dek, kek))

interface Row {
  id: string
  body: string
  tags: string[]
  created_at: string
  updated_at: string
  meta: string | null
}

const rows: Row[] = await fetch(
  `${SUPABASE_URL}/rest/v1/entries`
  + `?select=id,body,tags,created_at,updated_at,meta&deleted_at=is.null&order=created_at.asc`,
  { headers: auth },
).then(res => {
  if (!res.ok) throw new Error(`조회 실패 ${res.status}: ${res.statusText}`)
  return res.json()
})

const opened = []
let failed = 0

for (const row of rows) {
  const body = await open(row.body)
  if (body === null) { failed++; continue }

  opened.push({
    id: row.id,
    at: row.created_at,
    edited: row.updated_at > row.created_at ? row.updated_at : null,
    tags: row.tags,
    body,
    meta: row.meta === null ? null : JSON.parse(await open(row.meta) ?? 'null'),
  })
}

mkdirSync(OUT_DIR, { recursive: true })
if (wantMarkdown) writeMarkdown()
if (wantJson) {
  writeFileSync(`${OUT_DIR}/entries.json`, JSON.stringify(opened, null, 2))
  console.log(`${OUT_DIR}/entries.json`)
}
if (failed > 0) console.error(`⚠️  ${failed}건은 복호화하지 못했다`)

function writeMarkdown() {
  const byMonth = new Map<string, string[]>()

  for (const e of opened) {
    const at = new Date(e.at)
    const month = `${at.getFullYear()}-${pad(at.getMonth() + 1)}`

    const bits = [
      `## ${pad(at.getDate())}일 ${pad(at.getHours())}:${pad(at.getMinutes())}`,
      ...e.tags.map(t => '#' + t),
    ]
    const context = describeMeta(e.meta === null ? null : JSON.stringify(e.meta), HOME_TZ)
    if (context !== '') bits.push('·', context)
    if (e.edited !== null) bits.push(`(수정 ${new Date(e.edited).toLocaleString('ko-KR')})`)

    byMonth.set(month, [...(byMonth.get(month) ?? []), `${bits.join(' ')}\n\n${e.body}\n`])
  }

  for (const [month, blocks] of byMonth) {
    writeFileSync(`${OUT_DIR}/${month}.md`, `# ${month}\n\n${blocks.join('\n')}`)
  }
  console.log(`${opened.length}건 → ${byMonth.size}개 마크다운 (${OUT_DIR}/)`)
}

async function open(value: string): Promise<string | null> {
  if (!isEncrypted(value)) return value   // 마이그레이션 전 평문
  try {
    return await decrypt(value, key)
  } catch {
    return null
  }
}

function need(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`.env 에 ${name} 이 없다`)
  return v
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
