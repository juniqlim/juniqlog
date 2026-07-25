export type PieceType = 'text' | 'tag' | 'link' | 'bold' | 'italic' | 'code' | 'strike'

export interface Piece {
  type: PieceType
  value: string
}

export type LineKind = 'plain' | 'bullet' | 'number'

export interface Line {
  kind: LineKind
  marker: string
  pieces: Piece[]
}

/** 줄 처음이거나 공백 뒤의 #만 태그로 본다 (URL 안의 #은 제외) */
const TAG = /(^|\s)#([0-9A-Za-z가-힣_]+)/gu

/** 앞에 있는 것이 우선 — 굵게가 기울임보다, 코드가 그 무엇보다 먼저 */
const TOKEN = new RegExp([
  '(?<code>`[^`\\n]+`)',
  '(?<bold>\\*\\*[^*\\n]+\\*\\*)',
  '(?<strike>~~[^~\\n]+~~)',
  '(?<italic>\\*[^*\\s\\n][^*\\n]*\\*)',
  '(?<link>https?://[^\\s]+)',
  '(?<tag>(?:^|\\s)#[0-9A-Za-z가-힣_]+)',
].join('|'), 'gu')

const BULLET = /^(\s*)[-*]\s+(.*)$/u
const NUMBER = /^(\s*)(\d+)\.\s+(.*)$/u

/**
 * 손으로 적어 넣는 태그를 거른다.
 *
 * 본문에서 뽑히는 것과 같은 모양만 받는다 — 태그는 사이드바에 그대로 그려지고
 * 암호화도 되지 않는다. 꾸밈글자가 섞이면 그게 화면에서 살아난다.
 */
export function isTag(value: string): boolean {
  return /^#?[0-9A-Za-z가-힣_]+$/u.test(value)
}

/** # 을 붙여 적었어도 알맹이만 남긴다 */
export function bareTag(value: string): string {
  return value.replace(/^#/, '')
}

export function extractTags(body: string): string[] {
  const found: string[] = []
  for (const m of body.matchAll(TAG)) {
    if (!found.includes(m[2])) found.push(m[2])
  }
  return found
}

export function parseBody(body: string): Piece[] {
  const pieces: Piece[] = []
  let at = 0

  const text = (value: string) => { if (value !== '') pieces.push({ type: 'text', value }) }

  for (const m of body.matchAll(TOKEN)) {
    const g = m.groups!
    let start = m.index!
    let end = start + m[0].length

    if (g.tag !== undefined) {
      const lead = m[0].length - m[0].trimStart().length
      start += lead
    }
    text(body.slice(at, start))

    if (g.code !== undefined) pieces.push({ type: 'code', value: g.code.slice(1, -1) })
    else if (g.bold !== undefined) pieces.push({ type: 'bold', value: g.bold.slice(2, -2) })
    else if (g.strike !== undefined) pieces.push({ type: 'strike', value: g.strike.slice(2, -2) })
    else if (g.italic !== undefined) pieces.push({ type: 'italic', value: g.italic.slice(1, -1) })
    else if (g.tag !== undefined) pieces.push({ type: 'tag', value: g.tag.trimStart().slice(1) })
    else if (g.link !== undefined) {
      const url = g.link.replace(/[.,!?;:)\]]+$/u, '')
      pieces.push({ type: 'link', value: url })
      end = start + url.length
    }
    at = end
  }

  text(body.slice(at))
  return pieces
}

export function parseLines(body: string): Line[] {
  return body.split('\n').map(raw => {
    const bullet = raw.match(BULLET)
    if (bullet) return { kind: 'bullet' as const, marker: '•', pieces: parseBody(bullet[2]) }

    const numbered = raw.match(NUMBER)
    if (numbered) return { kind: 'number' as const, marker: numbered[2] + '.', pieces: parseBody(numbered[3]) }

    return { kind: 'plain' as const, marker: '', pieces: parseBody(raw) }
  })
}
