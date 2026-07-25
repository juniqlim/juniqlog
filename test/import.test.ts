import { describe, it, expect } from 'vitest'
import { readEntries, plan, metaText } from '../src/import'
import type { Exported } from '../src/export'
import type { LogEntry } from '../src/timeline'

const at = (h: number) => new Date(2026, 6, 25, h, 0).toISOString()

const item = (over: Partial<Exported> = {}): Exported => ({
  id: 'a', at: at(14), edited: null, tags: [], body: '걸었다', meta: null, ...over,
})

const row = (over: Partial<LogEntry> = {}): LogEntry => ({
  id: 'a', body: '걸었다', created_at: at(14), updated_at: at(14),
  tags: [], deleted_at: null, meta: null, ...over,
})


describe('readEntries', () => {
  it('내보낸 JSON 을 그대로 되읽는다', () => {
    const got = readEntries(JSON.stringify([item({ body: '걸었다', tags: ['산책'] })]))
    expect(got).toEqual([expect.objectContaining({ body: '걸었다', tags: ['산책'] })])
  })

  it('JSON 이 아니면 알려준다', () => {
    expect(() => readEntries('그냥 글')).toThrow()
  })

  it('목록이 아니면 알려준다 — 엉뚱한 JSON 을 고를 수 있다', () => {
    expect(() => readEntries('{"a":1}')).toThrow()
  })

  it('시각이나 본문이 없는 것은 버린다 — 넣어봐야 되읽을 수 없다', () => {
    const got = readEntries(JSON.stringify([item(), { at: at(15) }, { body: '언제인지 모름' }]))
    expect(got).toHaveLength(1)
  })

  it('빈 목록도 목록이다', () => {
    expect(readEntries('[]')).toEqual([])
  })
})


describe('metaText', () => {
  it('풀린 정황을 다시 한 덩어리로 묶는다', () => {
    expect(metaText({ dev: 'iPhone' })).toBe('{"dev":"iPhone"}')
  })

  it('남길 게 없으면 없는 채로 둔다', () => {
    expect(metaText(null)).toBe(null)
    expect(metaText(undefined)).toBe(null)
  })
})


describe('plan', () => {
  it('없던 것만 넣는다', () => {
    const { fresh, skipped } = plan([row()], [item(), item({ at: at(15), body: '새 글' })])
    expect(fresh.map(e => e.body)).toEqual(['새 글'])
    expect(skipped).toBe(1)
  })

  it('같은 시각이라도 글이 다르면 다른 글이다', () => {
    const { fresh } = plan([row()], [item({ body: '다른 글' })])
    expect(fresh).toHaveLength(1)
  })

  it('같은 글이라도 시각이 다르면 다른 글이다', () => {
    const { fresh } = plan([row()], [item({ at: at(15) })])
    expect(fresh).toHaveLength(1)
  })

  it('id 는 보지 않는다 — 기기가 바뀌면 달라진다', () => {
    const { fresh, skipped } = plan([row({ id: '옛것' })], [item({ id: '새것' })])
    expect(fresh).toEqual([])
    expect(skipped).toBe(1)
  })

  it('파일 안에서 겹치는 것도 한 번만 넣는다', () => {
    const { fresh, skipped } = plan([], [item(), item()])
    expect(fresh).toHaveLength(1)
    expect(skipped).toBe(1)
  })

  it('빈 저장소에는 전부 들어간다', () => {
    expect(plan([], [item(), item({ at: at(15) })]).fresh).toHaveLength(2)
  })
})
