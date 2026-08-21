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

/** 한 건만 옮길 때는 본문만 간다 — 붙일 자리는 대개 언제인지 이미 알고 있다 */
export function copyEntryText(entry: Copyable): string {
  return entry.body
}

/** 트위터가 한 번에 받는 무게 */
export const TWEET_LIMIT = 280

/** 링크는 무엇이든 t.co 주소로 바뀌어 이 길이가 된다 */
const LINK_WEIGHT = 23
const LINK = /https?:\/\/\S+/g

/** 라틴·숫자·기본 부호는 가볍고, 그 밖(한글·한자·이모지)은 두 배다 */
const LIGHT: [number, number][] = [
  [0x0000, 0x10ff], [0x2000, 0x200d], [0x2010, 0x201f], [0x2032, 0x2037],
]

const segments = new Intl.Segmenter()

/**
 * 트위터가 세는 대로 센다 — 남은 자리를 알려면 그쪽 셈을 따라야 한다.
 * 이어 붙인 이모지 한 덩어리는 하나로 보므로 글자가 아니라 자소 단위로 훑는다.
 */
export function tweetLength(text: string): number {
  const links = text.match(LINK) ?? []
  const rest = text.replace(LINK, '')

  let weight = links.length * LINK_WEIGHT
  for (const { segment } of segments.segment(rest.normalize('NFC'))) {
    const code = segment.codePointAt(0)!
    weight += LIGHT.some(([lo, hi]) => code >= lo && code <= hi) ? 1 : 2
  }
  return weight
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
