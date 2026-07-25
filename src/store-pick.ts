import type { Store } from './store'
import { memoryStore } from './store-memory'
import { supabaseStore } from './store-supabase'

/**
 * 어느 저장소를 쓸지 여기서만 정한다.
 *
 * 로컬은 바깥 없이 떠야 한다 — 개발 서버는 메모리로 뜬다.
 * 실제 데이터를 보려면 `.env.local` 에 VITE_STORE=supabase 를 둔다.
 */
export function pickStore(): Store {
  const want = import.meta.env.VITE_STORE
  if (want === 'memory') return memoryStore()
  if (want === 'supabase') return supabaseStore()
  return import.meta.env.DEV ? memoryStore() : supabaseStore()
}
