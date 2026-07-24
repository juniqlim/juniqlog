import { describe, it, expect } from 'vitest'
import { monthsOf, monthRange, latestMonth } from '../src/calendar'


describe('monthsOf', () => {
  it('연도별로 묶고 월을 오름차순으로 낸다', () => {
    const isos = [
      '2025-03-10T09:00:00',
      '2024-12-01T09:00:00',
      '2025-01-05T09:00:00',
    ]

    expect(monthsOf(isos)).toEqual([
      { year: 2024, months: [12] },
      { year: 2025, months: [1, 3] },
    ])
  })

  it('같은 달이 여러 번 나와도 한 번만 낸다', () => {
    const isos = ['2026-07-01T09:00:00', '2026-07-24T18:00:00']

    expect(monthsOf(isos)).toEqual([{ year: 2026, months: [7] }])
  })

  it('빈 목록은 빈 트리를 낸다', () => {
    expect(monthsOf([])).toEqual([])
  })
})


describe('monthRange', () => {
  it('그 달의 시작과 다음 달 시작을 낸다', () => {
    const { from, to } = monthRange(2026, 7)

    expect(from).toBe(new Date(2026, 6, 1).toISOString())
    expect(to).toBe(new Date(2026, 7, 1).toISOString())
  })

  it('12월은 다음 해 1월로 넘어간다', () => {
    const { to } = monthRange(2026, 12)

    expect(to).toBe(new Date(2027, 0, 1).toISOString())
  })
})


describe('latestMonth', () => {
  it('가장 최근 연월을 고른다', () => {
    const tree = [
      { year: 2024, months: [12] },
      { year: 2026, months: [1, 7] },
    ]

    expect(latestMonth(tree)).toEqual({ year: 2026, month: 7 })
  })

  it('비어 있으면 null을 낸다', () => {
    expect(latestMonth([])).toBeNull()
  })
})
