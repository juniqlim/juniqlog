import { describe, it, expect } from 'vitest'
import { toExported, filesByDay, toJson, fileStamp } from '../src/export'
import type { LogEntry } from '../src/timeline'

/** 로컬 시각으로 만든다 — 내보낸 글도 로컬 시각을 쓰므로 타임존과 무관하게 맞는다 */
const at = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(y, m - 1, d, h, min).toISOString()

const row = (over: Partial<LogEntry> = {}): LogEntry => ({
  id: 'a',
  body: '본문',
  created_at: at(2026, 7, 25, 14, 30),
  updated_at: at(2026, 7, 25, 14, 30),
  tags: [],
  deleted_at: null,
  meta: null,
  ...over,
})


describe('toExported', () => {
  it('고치지 않았으면 edited 는 비어 있다', () => {
    expect(toExported([row()])[0].edited).toBe(null)
  })

  it('고쳤으면 고친 시각을 담는다', () => {
    const later = at(2026, 7, 26, 9, 0)
    expect(toExported([row({ updated_at: later })])[0].edited).toBe(later)
  })

  it('정황은 풀어서 담는다 — 받는 쪽이 다시 파싱하지 않게', () => {
    const meta = JSON.stringify({ dev: 'iPhone', loc: { lat: 37.4, lon: 126.9 } })
    expect(toExported([row({ meta })])[0].meta).toEqual({
      dev: 'iPhone', loc: { lat: 37.4, lon: 126.9 },
    })
  })

  it('깨진 정황 하나 때문에 내보내기를 멈추지 않는다', () => {
    expect(toExported([row({ meta: '{망가진' })])[0].meta).toBe(null)
  })
})


describe('filesByDay', () => {
  it('년·월 폴더 아래 하루를 한 파일로 둔다', () => {
    const files = filesByDay(toExported([
      row({ id: 'a', created_at: at(2026, 7, 25) }),
      row({ id: 'b', created_at: at(2026, 8, 1) }),
    ]), 'Asia/Seoul')

    expect([...files.keys()]).toEqual(['2026/07/25.md', '2026/08/01.md'])
  })

  it('같은 날은 한 파일에 시간 순으로 모은다', () => {
    const files = filesByDay(toExported([
      row({ id: 'a', created_at: at(2026, 7, 25, 9, 0), body: '아침' }),
      row({ id: 'b', created_at: at(2026, 7, 25, 21, 0), body: '저녁' }),
    ]), 'Asia/Seoul')

    const text = files.get('2026/07/25.md')!
    expect(files.size).toBe(1)
    expect(text.indexOf('아침')).toBeLessThan(text.indexOf('저녁'))
  })

  it('머리말에 날짜와 요일을 적는다 — 파일 하나만 열어도 언제인지 안다', () => {
    const files = filesByDay(toExported([row()]), 'Asia/Seoul')
    expect(files.get('2026/07/25.md')!.startsWith('# 2026-07-25 (토)')).toBe(true)
  })

  it('글마다 시각과 태그를 적는다', () => {
    const files = filesByDay(toExported([
      row({ tags: ['일기', '산책'], body: '걸었다' }),
    ]), 'Asia/Seoul')

    expect(files.get('2026/07/25.md')).toBe('# 2026-07-25 (토)\n\n## 14:30:00 #일기 #산책\n\n걸었다\n')
  })

  it('정황이 있으면 머리말에 한 줄로 붙인다', () => {
    const meta = JSON.stringify({ dev: 'iPhone', loc: { lat: 37.4, lon: 126.9 } })
    const files = filesByDay(toExported([row({ meta })]), 'Asia/Seoul')

    expect(files.get('2026/07/25.md')).toContain('## 14:30:00 · iPhone · 37.4,126.9')
  })

  it('사는 곳과 같은 시간대는 적지 않는다 — 늘 같으면 줄만 길어진다', () => {
    const here = JSON.stringify({ dev: 'iPhone', tz: 'Asia/Seoul' })
    const away = JSON.stringify({ dev: 'iPhone', tz: 'Europe/Paris' })

    expect(filesByDay(toExported([row({ meta: here })]), 'Asia/Seoul').get('2026/07/25.md'))
      .not.toContain('Asia/Seoul')
    expect(filesByDay(toExported([row({ meta: away })]), 'Asia/Seoul').get('2026/07/25.md'))
      .toContain('Europe/Paris')
  })

  it('한 건도 없으면 파일도 없다', () => {
    expect(filesByDay([], 'Asia/Seoul').size).toBe(0)
  })
})


describe('toJson', () => {
  it('그대로 읽히는 평문이다', () => {
    const json = JSON.parse(toJson(toExported([row({ body: '비밀 아님' })])))
    expect(json[0].body).toBe('비밀 아님')
    expect(json[0].at).toBe(at(2026, 7, 25, 14, 30))
  })
})


describe('fileStamp', () => {
  it('받는 쪽에서 언제 뽑은 사본인지 알아보게 날짜를 붙인다', () => {
    expect(fileStamp(new Date(2026, 6, 25))).toBe('2026-07-25')
  })
})
