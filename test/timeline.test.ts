import { describe, it, expect } from 'vitest'
import { timeOf, dateOf, copyText, copyGroupText, groupByDate, visible, byTag, tagsOf } from '../src/timeline'


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


const HOME = 'Asia/Seoul'

describe('copyText', () => {
  it('언제 쓴 글인지 앞에 붙인다', () => {
    const entry = { created_at: '2026-07-24T14:32:07', body: '타코 먹고싶다' }

    expect(copyText(entry, HOME)).toBe('2026. 7. 24. 14:32:07\n타코 먹고싶다')
  })

  it('날짜는 0을 채우지 않고 시각은 채운다', () => {
    const entry = { created_at: '2026-01-05T09:05:07', body: '새해' }

    expect(copyText(entry, HOME)).toBe('2026. 1. 5. 09:05:07\n새해')
  })

  it('여러 줄 본문은 그대로 둔다', () => {
    const entry = { created_at: '2026-07-24T09:05:07', body: '할 일\n- 하나\n- 둘' }

    expect(copyText(entry, HOME)).toBe('2026. 7. 24. 09:05:07\n할 일\n- 하나\n- 둘')
  })

  // 내보내기와 같은 것을 담는다 — 옮겨 붙인 글만 정황이 빠지면 안 된다
  it('태그를 시각 옆에 붙인다', () => {
    const entry = { created_at: '2026-07-24T14:32:07', body: '타코 #일기 #점심', tags: ['일기', '점심'] }

    expect(copyText(entry, HOME)).toBe('2026. 7. 24. 14:32:07 #일기 #점심\n타코 #일기 #점심')
  })

  it('어디서 무엇으로 썼는지 붙인다', () => {
    const entry = {
      created_at: '2026-07-24T14:32:07',
      body: '타코',
      meta: JSON.stringify({ dev: 'iPhone', tz: HOME, loc: { lat: 37.4021, lon: 126.9227 } }),
    }

    expect(copyText(entry, HOME)).toBe('2026. 7. 24. 14:32:07 · iPhone · 37.4021,126.9227\n타코')
  })

  it('집 시간대는 적지 않는다 — 늘 같은 값은 읽는 데 방해만 된다', () => {
    const entry = { created_at: '2026-07-24T14:32:07', body: '타코', meta: JSON.stringify({ tz: HOME }) }

    expect(copyText(entry, HOME)).toBe('2026. 7. 24. 14:32:07\n타코')
  })

  it('다른 시간대에서 쓴 글은 그것을 적는다', () => {
    const entry = { created_at: '2026-07-24T14:32:07', body: '타코', meta: JSON.stringify({ tz: 'Europe/Berlin' }) }

    expect(copyText(entry, HOME)).toBe('2026. 7. 24. 14:32:07 · Europe/Berlin\n타코')
  })

  it('고친 글은 고친 것을 밝힌다', () => {
    const entry = {
      created_at: '2026-07-24T14:32:07',
      updated_at: '2026-07-25T09:00:00',
      body: '타코',
    }

    expect(copyText(entry, HOME)).toContain('(수정 ')
  })

  it('손대지 않은 글에는 수정 표시가 없다', () => {
    const entry = { created_at: '2026-07-24T14:32:07', updated_at: '2026-07-24T14:32:07', body: '타코' }

    expect(copyText(entry, HOME)).toBe('2026. 7. 24. 14:32:07\n타코')
  })

  it('정황이 깨져 있어도 글은 옮겨진다', () => {
    const entry = { created_at: '2026-07-24T14:32:07', body: '타코', meta: '{[망가진' }

    expect(copyText(entry, HOME)).toBe('2026. 7. 24. 14:32:07\n타코')
  })
})


describe('copyGroupText', () => {
  // 잘라 붙여도 각 글이 혼자 읽혀야 하므로 날짜를 글마다 붙인다
  it('글마다 년월일과 시각을 붙여 이어 놓는다', () => {
    const entries = [
      { created_at: '2026-07-24T09:05:07', body: '아침' },
      { created_at: '2026-07-24T14:32:07', body: '점심' },
    ]

    expect(copyGroupText(entries, HOME)).toBe(
      '2026. 7. 24. 09:05:07\n아침\n\n2026. 7. 24. 14:32:07\n점심',
    )
  })

  it('한 건이면 개별 복사와 똑같다', () => {
    const entries = [{ created_at: '2026-07-24T09:05:07', body: '아침' }]

    expect(copyGroupText(entries, HOME)).toBe(copyText(entries[0], HOME))
  })

  it('빈 목록이면 빈 문자열이다', () => {
    expect(copyGroupText([], HOME)).toBe('')
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
