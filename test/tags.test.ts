import { describe, it, expect } from 'vitest'
import { extractTags, splitByTags } from '../src/tags'


describe('extractTags', () => {
  it('본문에서 #태그를 뽑는다', () => {
    expect(extractTags('애플 판 돈으로 TSMC 샀다 #투자 #TSMC')).toEqual(['투자', 'TSMC'])
  })

  it('문장 중간에 있어도 뽑는다', () => {
    expect(extractTags('오늘 #투자 관련 생각을 했다')).toEqual(['투자'])
  })

  it('같은 태그는 한 번만 뽑는다', () => {
    expect(extractTags('#투자 어쩌고 #투자')).toEqual(['투자'])
  })

  it('URL 안의 #은 태그가 아니다', () => {
    expect(extractTags('https://example.com/page#top 참고')).toEqual([])
  })

  it('# 뒤에 글자가 없으면 무시한다', () => {
    expect(extractTags('그냥 # 이렇게')).toEqual([])
  })

  it('태그가 없으면 빈 목록', () => {
    expect(extractTags('평범한 로그')).toEqual([])
  })
})


describe('splitByTags', () => {
  it('본문을 글자와 태그 조각으로 나눈다', () => {
    expect(splitByTags('오늘 #투자 했다')).toEqual([
      { type: 'text', value: '오늘 ' },
      { type: 'tag', value: '투자' },
      { type: 'text', value: ' 했다' },
    ])
  })

  it('태그가 없으면 통째로 글자다', () => {
    expect(splitByTags('평범한 로그')).toEqual([
      { type: 'text', value: '평범한 로그' },
    ])
  })

  it('줄바꿈을 보존한다', () => {
    expect(splitByTags('첫 줄\n#태그')).toEqual([
      { type: 'text', value: '첫 줄\n' },
      { type: 'tag', value: '태그' },
    ])
  })
})
