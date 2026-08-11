/**
 * 글 한 편의 길이 상한.
 *
 * 쓰는 사람이 나뿐일 때는 필요 없었다. 아무나 들어와 쓰게 되면
 * 한 사람이 밀어넣는 양이 곧 남의 자리를 먹는다.
 *
 * 만 자는 원고지 오십 매다 — 생각 한 편으로 모자랄 일은 없다.
 * DB 에도 같은 제한이 걸려 있다. 브라우저를 건너뛰어도 거기서 막힌다.
 */
export const BODY_MAX = 10000

export function tooLong(body: string): boolean {
  return body.length > BODY_MAX
}

export interface Entry {
  id: string
  body: string
  createdAt: Date
  tags: string[]
}

export function createEntry(body: string, now: Date, tags: string[] = []): Entry {
  if (body.trim() === '') {
    throw new Error('빈 로그는 만들 수 없다')
  }

  return {
    id: crypto.randomUUID(),
    body,
    createdAt: now,
    tags: [...tags],
  }
}

export function addTag<T extends { tags: string[] }>(entry: T, tag: string): T {
  if (entry.tags.includes(tag)) {
    return entry
  }

  return {
    ...entry,
    tags: [...entry.tags, tag],
  }
}
