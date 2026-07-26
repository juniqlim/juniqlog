// 확장자를 적는 이유: tools/export.ts 가 vite 없이 node 로 이 파일을 부른다
import { describeMeta } from './meta.ts'

export interface LogEntry {
  id: string
  body: string
  created_at: string
  /** 고치지 않았으면 created_at 과 같다. DB 트리거가 찍는다 */
  updated_at: string
  tags: string[]
  deleted_at: string | null
  /** 정황(위치·타임존·기기) JSON. 남길 게 없었으면 null. 저장소 밖에서는 평문이다 */
  meta: string | null
}

export interface DateGroup {
  date: string
  entries: LogEntry[]
}

const pad = (n: number) => String(n).padStart(2, '0')
export const DAYS = ['일', '월', '화', '수', '목', '금', '토']

export function timeOf(iso: string): string {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function dateOf(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}. ${pad(d.getMonth() + 1)}. ${pad(d.getDate())}. (${DAYS[d.getDay()]})`
}

/** 한국 로케일 표기(2026. 7. 25.) — 화면의 목록 머리말과 달리 0을 채우지 않는다 */
function plainDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`
}

export interface Copyable {
  created_at: string
  body: string
  updated_at?: string
  tags?: string[]
  meta?: string | null
}

/**
 * 글 위에 붙는 한 줄 — 언제 어디서 무엇으로 썼는가.
 * 복사도 내보내기도 이것을 쓴다. 같은 글이 두 군데서 다르게 읽히면 안 된다.
 */
export function copyHead(entry: Copyable, homeTz: string): string {
  const bits = [
    `${plainDate(entry.created_at)} ${timeOf(entry.created_at)}`,
    ...(entry.tags ?? []).map(t => '#' + t),
  ]

  const context = describeMeta(entry.meta ?? null, homeTz)
  if (context !== '') bits.push('·', context)
  if (entry.updated_at !== undefined && entry.updated_at > entry.created_at) {
    bits.push(`(수정 ${new Date(entry.updated_at).toLocaleString('ko-KR')})`)
  }

  return bits.join(' ')
}

/** 밖으로 옮겨 붙일 때는 언제 어디서 쓴 글인지가 함께 가야 한다 */
export function copyText(entry: Copyable, homeTz: string): string {
  return `${copyHead(entry, homeTz)}\n${entry.body}`
}

/**
 * 하루치를 한 번에.
 * 날짜를 맨 위에 한 번만 쓰지 않는다 — 잘라 붙였을 때 각 글이 혼자 읽혀야 한다.
 */
export function copyGroupText(entries: Copyable[], homeTz: string): string {
  return entries.map(e => copyText(e, homeTz)).join('\n\n')
}

export function visible(entries: LogEntry[]): LogEntry[] {
  return entries.filter(e => e.deleted_at === null)
}

export function byTag(entries: LogEntry[], tag: string | null): LogEntry[] {
  if (tag === null) return entries
  return entries.filter(e => e.tags.includes(tag))
}

export interface TagCount {
  tag: string
  count: number
}

export function tagsOf(rows: { tags: string[] }[]): TagCount[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    for (const tag of row.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

export function groupByDate(entries: LogEntry[]): DateGroup[] {
  const groups: DateGroup[] = []
  for (const entry of entries) {
    const date = dateOf(entry.created_at)
    const last = groups[groups.length - 1]
    if (last && last.date === date) last.entries.push(entry)
    else groups.push({ date, entries: [entry] })
  }
  return groups
}
