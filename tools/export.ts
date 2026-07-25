/**
 * 전량 받아 복호화해 notes/ 로 떨군다.
 *
 * Supabase 가 사라져도 내용은 노트북에 남는다 — 이게 실질적인 백업이다.
 * 브라우저와 같은 src/crypto.ts, 같은 src/export.ts 를 쓴다.
 * 복제하면 언젠가 어긋난다.
 *
 *   node tools/export.ts            notes/2026/07/25.md (사람이 읽기 좋다)
 *   node tools/export.ts --json     notes/entries.json (집계·통계에 좋다)
 *   node tools/export.ts --all      둘 다
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { importKey, decrypt, isEncrypted } from '../src/crypto.ts'
import { toExported, filesByDay, toJson } from '../src/export.ts'
import type { LogEntry } from '../src/timeline.ts'

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

const rows: LogEntry[] = await fetch(
  `${SUPABASE_URL}/rest/v1/entries`
  + `?select=id,body,tags,created_at,updated_at,meta&deleted_at=is.null&order=created_at.asc`,
  { headers: auth },
).then(res => {
  if (!res.ok) throw new Error(`조회 실패 ${res.status}: ${res.statusText}`)
  return res.json()
})

const opened: LogEntry[] = []
let failed = 0

for (const row of rows) {
  const body = await open(row.body)
  if (body === null) { failed++; continue }
  opened.push({ ...row, body, meta: row.meta === null ? null : await open(row.meta) })
}

const items = toExported(opened)

mkdirSync(OUT_DIR, { recursive: true })
if (wantMarkdown) {
  const files = filesByDay(items, HOME_TZ)
  for (const [name, text] of files) {
    const path = `${OUT_DIR}/${name}`
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, text)
  }
  console.log(`${items.length}건 → ${files.size}개 마크다운 (${OUT_DIR}/)`)
}
if (wantJson) {
  writeFileSync(`${OUT_DIR}/entries.json`, toJson(items))
  console.log(`${OUT_DIR}/entries.json`)
}
if (failed > 0) console.error(`⚠️  ${failed}건은 복호화하지 못했다`)

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
