export interface YearNode {
  year: number
  months: number[]
}

export interface YearMonth {
  year: number
  month: number
}

export function monthsOf(isos: string[]): YearNode[] {
  const seen = new Map<number, Set<number>>()
  for (const iso of isos) {
    const d = new Date(iso)
    const months = seen.get(d.getFullYear()) ?? new Set<number>()
    months.add(d.getMonth() + 1)
    seen.set(d.getFullYear(), months)
  }

  return [...seen.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, months]) => ({ year, months: [...months].sort((a, b) => a - b) }))
}

export function monthRange(year: number, month: number): { from: string; to: string } {
  return {
    from: new Date(year, month - 1, 1).toISOString(),
    to: new Date(year, month, 1).toISOString(),
  }
}

export function latestMonth(tree: YearNode[]): YearMonth | null {
  const last = tree[tree.length - 1]
  if (!last) return null
  return { year: last.year, month: last.months[last.months.length - 1] }
}
