/**
 * 앱 껍데기(HTML·JS·아이콘)를 캐시한다. 연결이 없어도 앱이 뜬다.
 *
 * 데이터는 캐시하지 않는다. 본문은 암호문이고 키는 /api/key 로만 오는데,
 * 그 키가 기기에 남으면 로그아웃해도 열리는 상태가 된다.
 */

const CACHE = 'thinkthink-shell-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(names.filter(n => n !== CACHE).map(n => caches.delete(n)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', event => {
  const req = event.request
  const url = new URL(req.url)

  if (req.method !== 'GET') return
  if (url.origin !== self.location.origin) return   // Supabase 등 남의 집은 손대지 않는다
  if (url.pathname.startsWith('/api/')) return      // 키는 절대 캐시하지 않는다

  /**
   * HTML 은 담아둔 것을 먼저 내주고, 새 것은 뒤에서 받아 담는다.
   *
   * 네트워크를 먼저 가면 담아둔 게 있어도 왕복(폰에서 0.8초)만큼 흰 화면이다.
   * 대신 배포한 것이 한 번 늦게 보인다 — 다음에 열 때 반영된다.
   * 담아둔 HTML 이 가리키는 자산은 이름에 해시가 붙어 있어 짝이 어긋나지 않는다.
   */
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const fresh = fetch(req).then(res => keep(req, res)).catch(() => null)
      const hit = (await caches.match(req)) ?? (await caches.match('/'))
      if (hit) {
        event.waitUntil(fresh)   // 응답은 이미 갔다. 받아 담는 일만 남는다
        return hit
      }
      return (await fresh) ?? offline()
    })())
    return
  }

  // 자산은 파일명에 해시가 붙어 있어 내용이 바뀌면 주소도 바뀐다. 캐시 우선으로 안전하다
  event.respondWith(
    caches.match(req).then(hit => hit ?? fetch(req).then(res => keep(req, res))),
  )
})

function keep(req, res) {
  if (res.ok) {
    const copy = res.clone()
    caches.open(CACHE).then(c => c.put(req, copy))
  }
  return res
}

function offline() {
  return new Response(
    '<meta charset="utf-8"><body style="background:#0f1115;color:#8b93a3;font:15px -apple-system,sans-serif;text-align:center;padding:20vh 24px">연결이 없어 앱을 불러오지 못했습니다.</body>',
    { headers: { 'content-type': 'text/html; charset=utf-8' } },
  )
}
