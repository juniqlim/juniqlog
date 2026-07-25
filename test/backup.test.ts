import { describe, it, expect } from 'vitest'
import { buildBackup } from '../src/backup'
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
    expect(buildBackup([row()], 'Asia/Seoul', at).name).toBe('juniqlog-2026-07-26.zip')
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
