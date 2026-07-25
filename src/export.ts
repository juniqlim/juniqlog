// 확장자를 적는 이유: tools/export.ts 가 vite 없이 node 로 이 파일을 부른다
import { DAYS, type LogEntry } from './timeline.ts'
import { describeMeta } from './meta.ts'

/**
 * 내보낼 모양을 정한다. 어디로 떨구는지는 부르는 쪽 사정이다 —
 * 노트북은 폴더에, 폰은 zip 하나에 담는다.
 *
 * 마크다운은 사람이 읽는 용이라 정황을 한 줄로 줄여 머리말에 붙이고,
 * JSON 은 집계·통계용이라 남긴 것을 그대로 둔다. 마크다운에서 좌표를
 * 다시 파싱하는 것보다 이쪽이 쓰기 쉽다.
 */

export interface Exported {
  id: string
  at: string
  /** 고치지 않았으면 null */
  edited: string | null
  tags: string[]
  body: string
  meta: unknown | null
}

export function toExported(rows: LogEntry[]): Exported[] {
  return rows.map(row => ({
    id: row.id,
    at: row.created_at,
    edited: row.updated_at > row.created_at ? row.updated_at : null,
    tags: row.tags,
    body: row.body,
    meta: parse(row.meta),
  }))
}

/** '2026/07/25.md' → 그 날 쓴 글 전부. 년·월 폴더는 푸는 쪽이 만든다 */
export function filesByDay(items: Exported[], homeTz: string): Map<string, string> {
  const days = new Map<string, Exported[]>()

  for (const item of [...items].sort((a, b) => (a.at < b.at ? -1 : 1))) {
    const at = new Date(item.at)
    const name = `${at.getFullYear()}/${pad(at.getMonth() + 1)}/${pad(at.getDate())}.md`
    days.set(name, [...(days.get(name) ?? []), item])
  }

  const files = new Map<string, string>()
  for (const [name, list] of days) {
    const at = new Date(list[0].at)
    const head = `# ${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
      + ` (${DAYS[at.getDay()]})`
    files.set(name, `${head}\n\n${list.map(item => block(item, homeTz)).join('\n')}`)
  }
  return files
}

export function toJson(items: Exported[]): string {
  return JSON.stringify(items, null, 2)
}

/** 언제 뽑은 사본인지 파일 이름만 봐도 알게 */
export function fileStamp(at: Date): string {
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
}

function block(item: Exported, homeTz: string): string {
  const at = new Date(item.at)
  const bits = [
    `## ${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`,
    ...item.tags.map(t => '#' + t),
  ]

  const context = describeMeta(item.meta === null ? null : JSON.stringify(item.meta), homeTz)
  if (context !== '') bits.push('·', context)
  if (item.edited !== null) bits.push(`(수정 ${new Date(item.edited).toLocaleString('ko-KR')})`)

  return `${bits.join(' ')}\n\n${item.body}\n`
}

/** 깨진 값 하나 때문에 내보내기를 멈추지 않는다 */
function parse(json: string | null): unknown | null {
  if (json === null) return null
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
