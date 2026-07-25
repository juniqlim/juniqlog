import { describe, it, expect } from 'vitest'
import { timeOf, dateOf, copyText, groupByDate, visible, byTag, tagsOf } from '../src/timeline'


describe('tagsOf', () => {
  it('태그를 세어 많이 쓴 순으로 낸다', () => {
    const rows = [{ tags: ['투자', '일상'] }, { tags: ['투자'] }, { tags: [] }]

    expect(tagsOf(rows)).toEqual([
      { tag: '투자', count: 2 },
      { tag: '일상', count: 1 },
    ])
  })

  it('같은 수면 이름순으로 낸다', () => {
    const rows = [{ tags: ['b'] }, { tags: ['a'] }]

    expect(tagsOf(rows)).toEqual([
      { tag: 'a', count: 1 },
      { tag: 'b', count: 1 },
    ])
  })

  it('태그가 없으면 빈 목록', () => {
    expect(tagsOf([])).toEqual([])
  })
})


describe('timeOf', () => {
  it('시분초를 두 자리로 보여준다', () => {
    expect(timeOf('2026-07-24T09:05:07')).toBe('09:05:07')
  })
})


describe('dateOf', () => {
  it('년월일과 요일을 보여준다', () => {
    expect(dateOf('2026-07-24T14:32:07')).toBe('2026. 07. 24. (금)')
  })
})


describe('copyText', () => {
  it('언제 쓴 글인지 앞에 붙인다', () => {
    const entry = { created_at: '2026-07-24T14:32:07', body: '타코 먹고싶다' }

    expect(copyText(entry)).toBe('2026. 7. 24. 14:32:07\n타코 먹고싶다')
  })

  it('날짜는 0을 채우지 않고 시각은 채운다', () => {
    const entry = { created_at: '2026-01-05T09:05:07', body: '새해' }

    expect(copyText(entry)).toBe('2026. 1. 5. 09:05:07\n새해')
  })

  it('여러 줄 본문은 그대로 둔다', () => {
    const entry = { created_at: '2026-07-24T09:05:07', body: '할 일\n- 하나\n- 둘' }

    expect(copyText(entry)).toBe('2026. 7. 24. 09:05:07\n할 일\n- 하나\n- 둘')
  })
})


describe('visible', () => {
  it('삭제된 로그를 제외한다', () => {
    const list = [
      { id: '1', body: '살아있음', created_at: '2026-07-24T10:00:00', tags: [], deleted_at: null },
      { id: '2', body: '지워짐', created_at: '2026-07-24T11:00:00', tags: [], deleted_at: '2026-07-24T12:00:00' },
    ]

    expect(visible(list).map(e => e.id)).toEqual(['1'])
  })
})


describe('byTag', () => {
  const list = [
    { id: '1', body: 'a', created_at: '2026-07-24T10:00:00', tags: ['투자'], deleted_at: null },
    { id: '2', body: 'b', created_at: '2026-07-24T11:00:00', tags: ['일상'], deleted_at: null },
  ]

  it('태그가 없으면 전부 보여준다', () => {
    expect(byTag(list, null).map(e => e.id)).toEqual(['1', '2'])
  })

  it('태그가 있으면 그 태그만 추린다', () => {
    expect(byTag(list, '투자').map(e => e.id)).toEqual(['1'])
  })
})


describe('groupByDate', () => {
  it('같은 날짜끼리 묶는다', () => {
    const list = [
      { id: '1', body: 'a', created_at: '2026-07-24T14:00:00', tags: [], deleted_at: null },
      { id: '2', body: 'b', created_at: '2026-07-24T09:00:00', tags: [], deleted_at: null },
      { id: '3', body: 'c', created_at: '2026-07-23T09:00:00', tags: [], deleted_at: null },
    ]

    const groups = groupByDate(list)

    expect(groups.map(g => g.date)).toEqual(['2026. 07. 24. (금)', '2026. 07. 23. (목)'])
    expect(groups[0].entries.map(e => e.id)).toEqual(['1', '2'])
    expect(groups[1].entries.map(e => e.id)).toEqual(['3'])
  })

  it('오래된 것부터 오면 그 순서 그대로 묶는다', () => {
    const list = [
      { id: '1', body: 'a', created_at: '2026-07-23T09:00:00', tags: [], deleted_at: null },
      { id: '2', body: 'b', created_at: '2026-07-24T09:00:00', tags: [], deleted_at: null },
      { id: '3', body: 'c', created_at: '2026-07-24T14:00:00', tags: [], deleted_at: null },
    ]

    const groups = groupByDate(list)

    expect(groups.map(g => g.date)).toEqual(['2026. 07. 23. (목)', '2026. 07. 24. (금)'])
    expect(groups[1].entries.map(e => e.id)).toEqual(['2', '3'])
  })

  it('빈 목록은 빈 그룹을 낸다', () => {
    expect(groupByDate([])).toEqual([])
  })
})
