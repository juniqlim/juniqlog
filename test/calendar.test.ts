import { describe, it, expect } from 'vitest'
import { treeOf, monthRange, dayRange, latestMonth, daysAgo } from '../src/calendar'


describe('daysAgo', () => {
  it('기준 시각에서 그만큼 뺀 시각을 낸다', () => {
    const now = new Date('2026-07-24T10:00:00Z')

    expect(daysAgo(7, now)).toBe(new Date('2026-07-17T10:00:00Z').toISOString())
  })

  it('달을 넘어가도 맞는다', () => {
    const now = new Date('2026-08-03T00:00:00Z')

    expect(daysAgo(7, now)).toBe(new Date('2026-07-27T00:00:00Z').toISOString())
  })
})


describe('treeOf', () => {
  it('연 > 월 > 일로 묶는다', () => {
    const isos = [
      '2025-03-10T09:00:00',
      '2024-12-01T09:00:00',
      '2025-01-05T09:00:00',
      '2025-03-02T22:00:00',
    ]

    expect(treeOf(isos)).toEqual([
      { year: 2024, months: [{ month: 12, days: [1] }] },
      { year: 2025, months: [{ month: 1, days: [5] }, { month: 3, days: [2, 10] }] },
    ])
  })

  it('같은 날이 여러 번 나와도 한 번만 낸다', () => {
    const isos = ['2026-07-24T09:00:00', '2026-07-24T18:00:00']

    expect(treeOf(isos)).toEqual([
      { year: 2026, months: [{ month: 7, days: [24] }] },
    ])
  })

  it('빈 목록은 빈 트리를 낸다', () => {
    expect(treeOf([])).toEqual([])
  })
})


describe('monthRange', () => {
  it('그 달의 시작과 다음 달 시작을 낸다', () => {
    const { from, to } = monthRange(2026, 7)

    expect(from).toBe(new Date(2026, 6, 1).toISOString())
    expect(to).toBe(new Date(2026, 7, 1).toISOString())
  })

  it('12월은 다음 해 1월로 넘어간다', () => {
    expect(monthRange(2026, 12).to).toBe(new Date(2027, 0, 1).toISOString())
  })
})


describe('dayRange', () => {
  it('그 날의 시작과 다음 날 시작을 낸다', () => {
    const { from, to } = dayRange(2026, 7, 24)

    expect(from).toBe(new Date(2026, 6, 24).toISOString())
    expect(to).toBe(new Date(2026, 6, 25).toISOString())
  })

  it('말일은 다음 달로 넘어간다', () => {
    expect(dayRange(2026, 7, 31).to).toBe(new Date(2026, 7, 1).toISOString())
  })
})


describe('latestMonth', () => {
  it('가장 최근 연월을 고른다', () => {
    const tree = [
      { year: 2024, months: [{ month: 12, days: [1] }] },
      { year: 2026, months: [{ month: 1, days: [5] }, { month: 7, days: [24] }] },
    ]

    expect(latestMonth(tree)).toEqual({ year: 2026, month: 7 })
  })

  it('비어 있으면 null을 낸다', () => {
    expect(latestMonth([])).toBeNull()
  })
})
