import { describe, it, expect } from 'vitest'
import { searchPattern, isSearchable } from '../src/search'


describe('isSearchable', () => {
  it('공백뿐이면 검색하지 않는다', () => {
    expect(isSearchable('   ')).toBe(false)
  })

  it('글자가 있으면 검색한다', () => {
    expect(isSearchable(' 투자 ')).toBe(true)
  })
})


describe('searchPattern', () => {
  it('앞뒤를 감싸 부분 일치로 만든다', () => {
    expect(searchPattern('투자')).toBe('%투자%')
  })

  it('앞뒤 공백을 버린다', () => {
    expect(searchPattern('  투자  ')).toBe('%투자%')
  })

  it('와일드카드 문자는 글자 그대로 찾는다', () => {
    expect(searchPattern('50%')).toBe('%50\\%%')
    expect(searchPattern('a_b')).toBe('%a\\_b%')
  })
})
