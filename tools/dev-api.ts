/**
 * 로컬에서도 api/ 의 함수가 돌게 한다.
 *
 * 배포는 Vercel 이 api/ 를 엔드포인트로 삼지만, vite 는 화면만 띄운다.
 * 그래서 `vercel dev` 없이는 /api/key 가 404 고, 키를 못 받은 앱은
 * 로그인 화면으로 되돌아간다. 이 플러그인이 그 간극만 메운다.
 *
 * 함수 코드는 그대로 둔다 — 웹 표준(Request/Response)만 쓰므로
 * Vercel 에서 돌던 것을 여기서도 그냥 부른다.
 */
import { readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'

/** /api/<이름> 만 함수로 본다. 그 밖은 vite 몫이라 null 로 흘려보낸다 */
export function routeOf(url: string): string | null {
  const path = url.split('?')[0].replace(/\/+$/, '')
  const rest = path.startsWith('/api/') ? path.slice(5) : null
  if (!rest) return null
  // 파일 이름이 될 값이다 — 경로를 벗어나거나 숨은 파일을 가리키면 받지 않는다
  return /^[A-Za-z0-9_-]+$/.test(rest) ? rest : null
}

/** KEY=값 만 읽는다. 따옴표는 벗기고, 주석과 빈 줄은 건너뛴다 */
export function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line)
    if (!m) continue
    out[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, '$2')
  }
  return out
}

function loadEnv(files: string[]): void {
  for (const file of files) {
    let text: string
    try { text = readFileSync(file, 'utf8') } catch { continue }
    // 먼저 실린 값이 이긴다 — .env.local 이 .env 를 덮지 않도록
    for (const [k, v] of Object.entries(parseEnv(text))) process.env[k] ??= v
  }
}

async function toRequest(req: IncomingMessage): Promise<Request> {
  const headers = new Headers()
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') headers.set(k, v)
  }
  const method = req.method ?? 'GET'
  const body = method === 'GET' || method === 'HEAD'
    ? undefined
    : Buffer.concat(await Array.fromAsync(req))
  return new Request(`http://localhost${req.url}`, { method, headers, body })
}

async function send(res: ServerResponse, out: Response): Promise<void> {
  res.statusCode = out.status
  out.headers.forEach((v, k) => res.setHeader(k, v))
  res.end(Buffer.from(await out.arrayBuffer()))
}

export function devApi(root: string) {
  loadEnv([`${root}/.env.local`, `${root}/.env`])

  return {
    name: 'dev-api',
    apply: 'serve' as const,
    configureServer(server: { middlewares: { use: (fn: unknown) => void } }) {
      server.middlewares.use(async (
        req: IncomingMessage,
        res: ServerResponse,
        next: (e?: unknown) => void,
      ) => {
        const name = req.url ? routeOf(req.url) : null
        if (!name) return next()
        try {
          const mod = await import(`${root}/api/${name}.js`)
          await send(res, await mod.default(await toRequest(req)))
        } catch (e) {
          console.error(`[dev-api] /api/${name}`, e)
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(e) }))
        }
      })
    },
  }
}
