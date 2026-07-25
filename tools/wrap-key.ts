/**
 * 지금 쓰는 NOTE_KEY 를 그 사용자의 DEK 로 승격시키고, 새 KEK 로 감싸 저장한다.
 *
 * 본문은 한 건도 다시 암호화하지 않는다 — 본문을 잠근 키가 그대로 DEK 가 되므로.
 * 한 번만 돌리면 된다.
 */
import { importKey, encrypt } from '../src/crypto.ts'

process.loadEnvFile('.env')

const SUPABASE_URL = 'https://zuvifgiiahbypxsvnzvg.supabase.co'

const serviceKey = need('SUPABASE_SERVICE_KEY')
const dek = need('NOTE_KEY')          // 지금 본문을 잠그고 있는 키
const kek = await importKey(need('NOTE_KEK'))

const auth = { apikey: serviceKey, authorization: `Bearer ${serviceKey}` }

// 노트를 가진 사용자들 — 지금은 한 명이지만 여럿이어도 그대로 돈다
const rows: { user_id: string }[] = await fetch(
  `${SUPABASE_URL}/rest/v1/entries?select=user_id`, { headers: auth },
).then(res => {
  if (!res.ok) throw new Error(`조회 실패 ${res.status}`)
  return res.json()
})

const userIds = [...new Set(rows.map(r => r.user_id))]
console.log(`사용자 ${userIds.length}명`)

for (const user_id of userIds) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_keys`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json', prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ user_id, wrapped_dek: await encrypt(dek, kek) }),
  })
  if (!res.ok) throw new Error(`${user_id} 실패 ${res.status}: ${await res.text()}`)
  console.log(`${user_id} 감쌈`)
}

function need(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`.env 에 ${name} 이 없다`)
  return v
}
