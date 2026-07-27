import { describe, it, expect } from 'vitest'
import { spans, report, type Mark } from '../src/boot'

const m = (name: string, at: number): Mark => ({ name, at })

describe('부팅 — 구간 나누기', () => {
  it('첫 구간은 페이지가 열린 순간부터 잰다', () => {
    expect(spans([m('스크립트', 620)])).toEqual([{ name: '스크립트', ms: 620 }])
  })

  it('그 다음부터는 앞 자국과의 사이를 잰다 — 어디서 쓰였는지가 알고 싶은 것이다', () => {
    const marks = [m('스크립트', 620), m('세션·키', 3600), m('첫 그리기', 4210)]

    expect(spans(marks)).toEqual([
      { name: '스크립트', ms: 620 },
      { name: '세션·키', ms: 2980 },
      { name: '첫 그리기', ms: 610 },
    ])
  })

  it('자국이 없으면 잴 것도 없다', () => {
    expect(spans([])).toEqual([])
  })
})

describe('부팅 — 붙여넣을 한 덩어리', () => {
  const marks = [m('스크립트', 620), m('세션·키', 3600)]

  it('총합을 맨 앞에 둔다 — 먼저 알고 싶은 숫자다', () => {
    expect(report(marks, []).split('\n')[0]).toBe('부팅 3600ms')
  })

  it('구간을 차례로 적는다', () => {
    expect(report(marks, [])).toContain('스크립트 620ms')
    expect(report(marks, [])).toContain('세션·키 2980ms')
  })

  it('오래 걸린 요청부터 적는다 — 범인이 위에 온다', () => {
    const res = [
      { name: 'https://xy.supabase.co/rest/v1/entries?select=*', duration: 480 },
      { name: 'https://think.vercel.app/api/key', duration: 2740 },
    ]

    const lines = report(marks, res).split('\n')

    expect(lines[lines.length - 2]).toBe('think /api/key 2740ms')
    expect(lines[lines.length - 1]).toBe('xy /rest/v1/entries 480ms')
  })

  it('주소는 알아볼 만큼만 남긴다 — 폰 화면은 좁다', () => {
    const res = [{ name: 'https://xy.supabase.co/rest/v1/entries?select=*&order=x', duration: 10 }]

    expect(report([], res)).toContain('xy /rest/v1/entries 10ms')
  })

  it('잰 것이 없으면 없다고 말한다', () => {
    expect(report([], [])).toBe('부팅 0ms')
  })
})
