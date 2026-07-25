/**
 * 본문 암호화 키를 내준다.
 *
 * 키가 Supabase 밖에 있다는 게 이 설계의 전부다. Supabase가 유출돼도
 * 암호문만 나가고 여는 열쇠는 여기(Vercel 환경변수)에 남는다.
 *
 * 로그인한 본인에게만 준다. 토큰 검증은 Supabase에 되물어 확인한다.
 */

export const config = { runtime: 'edge' }

const SUPABASE_URL = 'https://zuvifgiiahbypxsvnzvg.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dmlmZ2lpYWhieXB4c3ZuenZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NTMwNDQsImV4cCI6MjEwMDQyOTA0NH0.sVexgnQmy0YRcg3bjq0ThHB8sgPLtn1X3SDDyUbeG18'

/** RLS 정책과 같은 조건 — 두 곳이 어긋나면 안 된다 */
const ALLOWED_EMAIL = 'juniq.lim@gmail.com'

const deny = (status: number) =>
  new Response(JSON.stringify({ error: '권한 없음' }), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })

export default async function handler(req: Request): Promise<Response> {
  const key = process.env.NOTE_KEY
  if (!key) return new Response(JSON.stringify({ error: 'NOTE_KEY 미설정' }), { status: 500 })

  const token = req.headers.get('authorization')?.replace(/^Bearer /, '')
  if (!token) return deny(401)

  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { authorization: `Bearer ${token}`, apikey: SUPABASE_ANON },
  })
  if (!res.ok) return deny(401)

  const user = await res.json() as { email?: string }
  if (user.email !== ALLOWED_EMAIL) return deny(403)

  return new Response(JSON.stringify({ key }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}
