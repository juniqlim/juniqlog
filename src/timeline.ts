export interface LogEntry {
  id: string
  body: string
  created_at: string
  tags: string[]
  deleted_at: string | null
}

export interface DateGroup {
  date: string
  entries: LogEntry[]
}

const pad = (n: number) => String(n).padStart(2, '0')
const DAYS = ['일', '월', '화', '수', '목', '금', '토']

export function timeOf(iso: string): string {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function dateOf(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}. ${pad(d.getMonth() + 1)}. ${pad(d.getDate())}. (${DAYS[d.getDay()]})`
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
