import { randomUUID } from 'node:crypto'

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
    id: randomUUID(),
    body,
    createdAt: now,
    tags: [...tags],
  }
}

export function addTag(entry: Entry, tag: string): Entry {
  if (entry.tags.includes(tag)) {
    return entry
  }

  return {
    ...entry,
    tags: [...entry.tags, tag],
  }
}
