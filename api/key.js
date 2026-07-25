/**
 * 로그인한 사용자의 본문 암호화 키(DEK)를 내준다.
 *
 * 봉투 암호화. 사용자마다 DEK 가 따로 있고, 그것들을 KEK 하나로 감싸
 * user_keys 에 넣어둔다. KEK 는 Vercel 환경변수에만 있어 Supabase 가
 * 통째로 유출돼도 감싼 것만 나간다.
 *
 * 이 경로로 새어봤자 한 사람 몫이다 — 서버는 로그인한 본인의 DEK 만 푼다.
 *
 * 이 파일만 .js 인 이유: 프로젝트가 쓰는 TypeScript 7 은 내부 API 가 바뀌어
 * Vercel 함수 빌더가 읽지 못한다. 함수 하나 때문에 TS 를 낮추지 않는다.
 */

export const config = { runtime: 'edge' }

const SUPABASE_URL = 'https://zuvifgiiahbypxsvnzvg.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dmlmZ2lpYWhieXB4c3ZuenZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NTMwNDQsImV4cCI6MjEwMDQyOTA0NH0.sVexgnQmy0YRcg3bjq0ThHB8sgPLtn1X3SDDyUbeG18'

/** RLS 정책과 같은 조건 — 두 곳이 어긋나면 안 된다 */
const ALLOWED_EMAIL = 'juniq.lim@gmail.com'

const PREFIX = 'v1.'
const IV_BYTES = 12

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })

export default async function handler(req) {
  const kekRaw = process.env.NOTE_KEK
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!kekRaw || !serviceKey) return json({ error: '서버 설정 누락' }, 500)

  const token = req.headers.get('authorization')?.replace(/^Bearer /, '')
  if (!token) return json({ error: '권한 없음' }, 401)

  const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { authorization: `Bearer ${token}`, apikey: SUPABASE_ANON },
  })
  if (!who.ok) return json({ error: '권한 없음' }, 401)

  const user = await who.json()
  if (user.email !== ALLOWED_EMAIL) return json({ error: '권한 없음' }, 403)

  const auth = { apikey: serviceKey, authorization: `Bearer ${serviceKey}` }
  const kek = await importKey(kekRaw)

  const rows = await fetch(
    `${SUPABASE_URL}/rest/v1/user_keys?select=wrapped_dek&user_id=eq.${user.id}`,
    { headers: auth },
  ).then(r => r.json())

  // 이미 있으면 풀어서 준다
  if (rows.length > 0) return json({ key: await decrypt(rows[0].wrapped_dek, kek) })

  // 처음 오는 사용자면 DEK 를 만들어 감싸 둔다
  const dek = toBase64(crypto.getRandomValues(new Uint8Array(32)))
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_keys`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ user_id: user.id, wrapped_dek: await encrypt(dek, kek) }),
  })
  if (!res.ok) return json({ error: '키 생성 실패' }, 500)

  return json({ key: dek })
}

/* ---- src/crypto.ts 와 같은 형식 (v1.<iv‖ciphertext>) ---- */

function importKey(base64) {
  return crypto.subtle.importKey('raw', fromBase64(base64), 'AES-GCM', false, ['encrypt', 'decrypt'])
}

async function encrypt(plain, key) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain))
  const packed = new Uint8Array(iv.length + sealed.byteLength)
  packed.set(iv)
  packed.set(new Uint8Array(sealed), iv.length)
  return PREFIX + toBase64url(packed)
}

async function decrypt(cipher, key) {
  const packed = fromBase64(cipher.slice(PREFIX.length))
  const opened = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: packed.subarray(0, IV_BYTES) }, key, packed.subarray(IV_BYTES),
  )
  return new TextDecoder().decode(opened)
}

function toBase64(bytes) {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function toBase64url(bytes) {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64(s) {
  return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
}
