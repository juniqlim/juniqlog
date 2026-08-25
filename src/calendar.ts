export interface MonthNode {
  month: number
  days: number[]
}

export interface YearNode {
  year: number
  months: MonthNode[]
}

export interface YearMonth {
  year: number
  month: number
}

export interface YearMonthDay extends YearMonth {
  day: number
}

export function today(now: Date): YearMonthDay {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
}

const desc = (a: number, b: number) => b - a

export function treeOf(isos: string[]): YearNode[] {
  const years = new Map<number, Map<number, Set<number>>>()

  for (const iso of isos) {
    const d = new Date(iso)
    const months = years.get(d.getFullYear()) ?? new Map<number, Set<number>>()
    const days = months.get(d.getMonth() + 1) ?? new Set<number>()
    days.add(d.getDate())
    months.set(d.getMonth() + 1, days)
    years.set(d.getFullYear(), months)
  }

  return [...years.entries()]
    .sort(([a], [b]) => desc(a, b))
    .map(([year, months]) => ({
      year,
      months: [...months.entries()]
        .sort(([a], [b]) => desc(a, b))
        .map(([month, days]) => ({ month, days: [...days].sort(desc) })),
    }))
}

export function monthRange(year: number, month: number): { from: string; to: string } {
  return {
    from: new Date(year, month - 1, 1).toISOString(),
    to: new Date(year, month, 1).toISOString(),
  }
}

export function dayRange(year: number, month: number, day: number): { from: string; to: string } {
  return {
    from: new Date(year, month - 1, day).toISOString(),
    to: new Date(year, month - 1, day + 1).toISOString(),
  }
}

export function daysAgo(days: number, now: Date): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

export function latestMonth(tree: YearNode[]): YearMonth | null {
  const newestYear = tree[0]
  if (!newestYear) return null
  return { year: newestYear.year, month: newestYear.months[0].month }
}
