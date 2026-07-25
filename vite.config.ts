import { defineConfig } from 'vite'
import { devApi } from './tools/dev-api'
import { SECURITY_HEADERS } from './tools/csp'

export default defineConfig({
  plugins: [devApi(import.meta.dirname)],
  // 배포와 같은 벽을 세운다 — 정책이 화면을 깨뜨리면 로컬에서 먼저 보인다
  server: { headers: SECURITY_HEADERS },
})
