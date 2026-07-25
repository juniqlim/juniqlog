import type { LogEntry } from './timeline'
import type { Exported } from './export'

/**
 * 내보낸 사본을 되읽는다.
 *
 * 읽는 것은 entries.json 뿐이다 — 마크다운은 정황이 한 줄로 줄어든 사본이라
 * 되돌릴 게 없다. zip 을 받는 이유도 그 안의 JSON 을 꺼내기 위해서다.
 *
 * 이미 있는 것은 넣지 않는다. 같은 순간에 쓴 같은 글이면 같은 글로 본다 —
 * id 는 기기나 계정이 바뀌면 달라져서 믿을 수 없다.
 */

export interface Plan {
  fresh: Exported[]
  /** 이미 있어서 넘긴 수 */
  skipped: number
}

export function readEntries(json: string): Exported[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('읽을 수 없는 파일입니다')
  }
  if (!Array.isArray(parsed)) throw new Error('내보낸 목록이 아닙니다')

  return parsed.filter(isEntry).map(row => ({
    id: String(row.id ?? ''),
    at: row.at,
    edited: typeof row.edited === 'string' ? row.edited : null,
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    body: row.body,
    meta: row.meta ?? null,
  }))
}

export function plan(existing: LogEntry[], incoming: Exported[]): Plan {
  const seen = new Set(existing.map(e => key(e.created_at, e.body)))

  const fresh: Exported[] = []
  for (const item of incoming) {
    const k = key(item.at, item.body)
    if (seen.has(k)) continue
    seen.add(k)                 // 파일 안에서 겹치는 것도 한 번만
    fresh.push(item)
  }
  return { fresh, skipped: incoming.length - fresh.length }
}

/** 정황은 JSON 한 덩어리로 저장한다 — 파일에서는 풀린 채로 온다 */
export function metaText(meta: unknown): string | null {
  if (meta === null || meta === undefined) return null
  return typeof meta === 'string' ? meta : JSON.stringify(meta)
}

/** 같은 순간에 쓴 같은 글 — 사람이 같은 글을 두 번 쓸 수는 있어도 같은 순간에는 못 쓴다 */
function key(at: string, body: string): string {
  return `${new Date(at).getTime()}\n${body}`
}

function isEntry(row: unknown): row is { at: string; body: string } & Record<string, any> {
  if (typeof row !== 'object' || row === null) return false
  const { at, body } = row as Record<string, unknown>
  return typeof at === 'string' && at !== '' && typeof body === 'string' && body !== ''
}
