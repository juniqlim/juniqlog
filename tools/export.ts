/**
 * 전량 받아 복호화해 notes/YYYY-MM.md 로 떨군다.
 *
 * Supabase가 사라져도 내용은 노트북에 남는다 — 이게 실질적인 백업이다.
 * 브라우저와 같은 src/crypto.ts를 쓴다. 복제하면 언젠가 어긋난다.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { importKey, decrypt, isEncrypted } from '../src/crypto.ts'

process.loadEnvFile('.env')

const SUPABASE_URL = 'https://zuvifgiiahbypxsvnzvg.supabase.co'
const OUT_DIR = 'notes'

const serviceKey = need('SUPABASE_SERVICE_KEY')
const key = await importKey(need('NOTE_KEY'))

interface Row { id: string; body: string; tags: string[]; created_at: string }

const rows: Row[] = await fetch(
  `${SUPABASE_URL}/rest/v1/entries?select=id,body,tags,created_at&deleted_at=is.null&order=created_at.asc`,
  { headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` } },
).then(res => {
  if (!res.ok) throw new Error(`조회 실패 ${res.status}: ${res.statusText}`)
  return res.json()
})

const byMonth = new Map<string, string[]>()
let failed = 0

for (const row of rows) {
  const at = new Date(row.created_at)
  const body = await open(row.body)
  if (body === null) { failed++; continue }

  const month = `${at.getFullYear()}-${pad(at.getMonth() + 1)}`
  const head = `## ${pad(at.getDate())}일 ${pad(at.getHours())}:${pad(at.getMinutes())}`
  const tags = row.tags.length ? ` ${row.tags.map(t => '#' + t).join(' ')}` : ''

  byMonth.set(month, [...(byMonth.get(month) ?? []), `${head}${tags}\n\n${body}\n`])
}

mkdirSync(OUT_DIR, { recursive: true })
for (const [month, blocks] of byMonth) {
  writeFileSync(`${OUT_DIR}/${month}.md`, `# ${month}\n\n${blocks.join('\n')}`)
}

console.log(`${rows.length}건 → ${byMonth.size}개 파일 (${OUT_DIR}/)`)
if (failed > 0) console.error(`⚠️  ${failed}건은 복호화하지 못했다`)

async function open(body: string): Promise<string | null> {
  if (!isEncrypted(body)) return body   // 마이그레이션 전 평문
  try {
    return await decrypt(body, key)
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
