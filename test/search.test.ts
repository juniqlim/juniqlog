import { describe, it, expect } from 'vitest'
import { matches, isSearchable } from '../src/search'


describe('isSearchable', () => {
  it('공백뿐이면 검색하지 않는다', () => {
    expect(isSearchable('   ')).toBe(false)
  })

  it('글자가 있으면 검색한다', () => {
    expect(isSearchable(' 투자 ')).toBe(true)
  })
})


describe('matches', () => {
  it('본문 어디에 있든 찾는다', () => {
    expect(matches('오늘 투자 공부를 했다', '투자')).toBe(true)
  })

  it('없으면 못 찾는다', () => {
    expect(matches('오늘 산책했다', '투자')).toBe(false)
  })

  it('대소문자를 가리지 않는다', () => {
    expect(matches('Vercel 배포', 'vercel')).toBe(true)
    expect(matches('vercel 배포', 'VERCEL')).toBe(true)
  })

  it('검색어 앞뒤 공백은 버린다', () => {
    expect(matches('오늘 투자 공부', '  투자  ')).toBe(true)
  })

  it('%와 _ 는 와일드카드가 아니라 글자다', () => {
    expect(matches('수익률 50% 달성', '50%')).toBe(true)
    expect(matches('수익률 50 달성', '5_')).toBe(false)
  })
})
