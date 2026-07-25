/**
 * 평문으로 저장된 기존 본문을 암호화한다. 한 번만 돌리면 된다.
 *
 * 되돌릴 수 없다. 먼저 `npm run export` 로 평문 사본을 받아둘 것.
 * 이미 암호화된 행(`v1.`)은 건드리지 않으므로 중간에 끊겨도 다시 돌리면 된다.
 */
import { importKey, encrypt, isEncrypted } from '../src/crypto.ts'

process.loadEnvFile('.env')

const SUPABASE_URL = 'https://zuvifgiiahbypxsvnzvg.supabase.co'

const serviceKey = need('SUPABASE_SERVICE_KEY')
const key = await importKey(need('NOTE_KEY'))

const auth = { apikey: serviceKey, authorization: `Bearer ${serviceKey}` }

interface Row { id: string; body: string }

// 휴지통에 든 것까지 전부 — 나중에 복원했는데 평문이면 곤란하다
const rows: Row[] = await fetch(`${SUPABASE_URL}/rest/v1/entries?select=id,body`, { headers: auth })
  .then(res => {
    if (!res.ok) throw new Error(`조회 실패 ${res.status}: ${res.statusText}`)
    return res.json()
  })

const plain = rows.filter(r => !isEncrypted(r.body))
console.log(`전체 ${rows.length}건 · 평문 ${plain.length}건`)
if (plain.length === 0) { console.log('할 일이 없다'); process.exit(0) }

let done = 0
for (const row of plain) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/entries?id=eq.${row.id}`, {
    method: 'PATCH',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ body: await encrypt(row.body, key) }),
  })
  if (!res.ok) throw new Error(`${row.id} 실패 ${res.status}: ${await res.text()}`)
  done++
}

console.log(`${done}건 암호화 완료`)

function need(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`.env 에 ${name} 이 없다`)
  return v
}
