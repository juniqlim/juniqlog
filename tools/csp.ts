/**
 * 무엇을 실행하고 어디로 연결할지 브라우저에게 미리 알린다.
 *
 * 값을 textContent 로 넣는 규율이 언젠가 무너져도, 심어진 스크립트는
 * 실행되지 않고(script-src) 실행되더라도 밖으로 나가지 못한다(connect-src).
 * 이 앱은 브라우저가 복호화 키를 쥐고 있어 두 번째 벽이 필요하다.
 *
 * 로컬과 배포가 같아야 로컬에서 깨지는 것을 본다 — vite 와 vercel 이 함께 쓴다.
 */
const SUPABASE = 'https://zuvifgiiahbypxsvnzvg.supabase.co'
const SUPABASE_WS = 'wss://zuvifgiiahbypxsvnzvg.supabase.co'

export const CSP = [
  `default-src 'self'`,
  `script-src 'self'`,
  // index.html 이 스타일을 안에 품고 있다. 스크립트는 여전히 막히므로 이것만 연다
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data:`,
  `font-src 'self'`,
  `connect-src 'self' ${SUPABASE} ${SUPABASE_WS}`,
  `object-src 'none'`,
  `base-uri 'none'`,
  `frame-ancestors 'none'`,
  `form-action 'none'`,
].join('; ')

/** CSP 만으로 못 막는 것들 — 함께 걸어둔다 */
export const SECURITY_HEADERS: Record<string, string> = {
  'content-security-policy': CSP,
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  // 위치는 우리가 직접 물어본다. 나머지는 이 페이지에서 쓸 일이 없다
  'permissions-policy': 'geolocation=(self), camera=(), microphone=(), payment=()',
}
