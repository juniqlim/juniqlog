import { describe, it, expect } from 'vitest'
import { buildBackup, readBackup } from '../src/backup'
import { zip } from '../src/zip'
import type { LogEntry } from '../src/timeline'

const row = (over: Partial<LogEntry> = {}): LogEntry => ({
  id: 'a',
  body: '걸었다',
  created_at: new Date(2026, 6, 25, 14, 30).toISOString(),
  updated_at: new Date(2026, 6, 25, 14, 30).toISOString(),
  tags: [],
  deleted_at: null,
  meta: null,
  ...over,
})

const at = new Date(2026, 6, 26, 9, 0)
const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes)

describe('buildBackup', () => {
  it('언제 뽑은 사본인지 이름에 남긴다', () => {
    expect(buildBackup([row()], 'Asia/Seoul', at).name).toBe('thinkthink-2026-07-26.zip')
  })

  it('읽을 마크다운과 되돌릴 JSON 을 함께 담는다', () => {
    const body = text(buildBackup([row()], 'Asia/Seoul', at).bytes)
    expect(body).toContain('2026/07/25.md')
    expect(body).toContain('entries.json')
  })

  it('본문이 그 안에 있다', () => {
    expect(text(buildBackup([row()], 'Asia/Seoul', at).bytes)).toContain('걸었다')
  })

  it('한 건도 없어도 파일은 나온다 — 눌렀는데 아무 일도 없으면 고장으로 보인다', () => {
    const backup = buildBackup([], 'Asia/Seoul', at)
    expect(backup.bytes.byteLength).toBeGreaterThan(0)
    expect(text(backup.bytes)).toContain('entries.json')
  })
})


describe('readBackup', () => {
  it('내보낸 zip 을 그대로 되읽는다', async () => {
    const backup = buildBackup([row({ tags: ['산책'] })], 'Asia/Seoul', at)
    const got = await readBackup(backup.bytes)

    expect(got).toHaveLength(1)
    expect(got[0].body).toBe('걸었다')
    expect(got[0].tags).toEqual(['산책'])
  })

  it('정황도 함께 돌아온다', async () => {
    const backup = buildBackup([row({ meta: '{"dev":"iPhone"}' })], 'Asia/Seoul', at)
    expect((await readBackup(backup.bytes))[0].meta).toEqual({ dev: 'iPhone' })
  })

  it('JSON 파일 하나만 골라도 된다 — zip 을 풀어 온 사람도 있다', async () => {
    const json = new TextEncoder().encode(JSON.stringify([
      { at: row().created_at, body: '걸었다', tags: [] },
    ]))
    expect(await readBackup(json)).toHaveLength(1)
  })

  it('JSON 이 없는 zip 은 알려준다 — 마크다운만으로는 되읽을 게 없다', async () => {
    const onlyMarkdown = zip([
      { name: '2026/07/25.md', body: new TextEncoder().encode('# 2026-07-25 (토)') },
    ], at)
    await expect(readBackup(onlyMarkdown)).rejects.toThrow()
  })

  it('엉뚱한 파일은 알려준다', async () => {
    await expect(readBackup(new TextEncoder().encode('그냥 글'))).rejects.toThrow()
  })
})
