/**
 * 본문 암호화. AES-256-GCM.
 *
 * 키는 Supabase가 아니라 Vercel 환경변수에 산다 (`/api/key`로 받아온다).
 * 그래서 Supabase가 통째로 유출돼도 본문은 열리지 않는다.
 */

const PREFIX = 'v1.'
const IV_BYTES = 12

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** 이미 암호화된 본문인가 — 마이그레이션 중 평문과 섞여 있어도 구분된다 */
export function isEncrypted(body: string): boolean {
  return body.startsWith(PREFIX)
}

export function importKey(base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', fromBase64(base64), 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function encrypt(plain: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plain))

  const packed = new Uint8Array(iv.length + sealed.byteLength)
  packed.set(iv)
  packed.set(new Uint8Array(sealed), iv.length)

  return PREFIX + toBase64url(packed)
}

export async function decrypt(cipher: string, key: CryptoKey): Promise<string> {
  if (!isEncrypted(cipher)) throw new Error('암호문이 아니다')

  const packed = fromBase64(cipher.slice(PREFIX.length))
  if (packed.length <= IV_BYTES) throw new Error('암호문이 너무 짧다')

  // GCM이라 키가 틀리거나 한 바이트라도 바뀌면 여기서 던진다
  const opened = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: packed.subarray(0, IV_BYTES) }, key, packed.subarray(IV_BYTES),
  )

  return decoder.decode(opened)
}

/* ---- base64url ---- */
function toBase64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0))
}
