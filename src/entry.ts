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
