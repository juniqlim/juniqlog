export function isSearchable(q: string): boolean {
  return q.trim() !== ''
}

/**
 * 본문이 암호문으로 저장되면서 서버 ILIKE를 쓸 수 없게 됐다.
 * 전량 받아 복호화한 뒤 여기서 찾는다.
 */
export function matches(body: string, q: string): boolean {
  return body.toLowerCase().includes(q.trim().toLowerCase())
}
