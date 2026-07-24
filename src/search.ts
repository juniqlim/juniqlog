export function isSearchable(q: string): boolean {
  return q.trim() !== ''
}

/** %, _ 는 SQL 와일드카드라 그대로 두면 엉뚱한 결과가 나온다 */
export function searchPattern(q: string): string {
  const escaped = q.trim().replace(/[\\%_]/gu, c => '\\' + c)
  return `%${escaped}%`
}
