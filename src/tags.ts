export interface Piece {
  type: 'text' | 'tag'
  value: string
}

/** 줄 처음이거나 공백 뒤의 #만 태그로 본다 (URL 안의 #은 제외) */
const TAG = /(^|\s)#([0-9A-Za-z가-힣_]+)/gu

export function extractTags(body: string): string[] {
  const found: string[] = []
  for (const m of body.matchAll(TAG)) {
    if (!found.includes(m[2])) found.push(m[2])
  }
  return found
}

export function splitByTags(body: string): Piece[] {
  const pieces: Piece[] = []
  let at = 0

  for (const m of body.matchAll(TAG)) {
    const lead = m[1]
    const start = m.index! + lead.length
    const before = body.slice(at, start)
    if (before !== '') pieces.push({ type: 'text', value: before })
    pieces.push({ type: 'tag', value: m[2] })
    at = start + 1 + m[2].length
  }

  const rest = body.slice(at)
  if (rest !== '') pieces.push({ type: 'text', value: rest })
  return pieces
}
