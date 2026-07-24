import { describe, it, expect } from 'vitest'
import { createEntry, addTag } from '../src/entry'


describe('createEntry', () => {
  it('텍스트와 시각으로 로그를 만든다', () => {
    const now = new Date('2026-07-24T14:32:07')

    const entry = createEntry('TSMC 매수함', now)

    expect(entry.body).toBe('TSMC 매수함')
    expect(entry.createdAt).toEqual(now)
    expect(entry.id).toBeTruthy()
  })

  it('줄바꿈을 그대로 보존한다', () => {
    const entry = createEntry('첫 줄\n둘째 줄', new Date())

    expect(entry.body).toBe('첫 줄\n둘째 줄')
  })

  it('빈 로그는 만들 수 없다', () => {
    expect(() => createEntry('   ', new Date())).toThrow()
  })

  it('태그 없이 만들면 태그가 비어 있다', () => {
    const entry = createEntry('메모', new Date())

    expect(entry.tags).toEqual([])
  })

  it('만들 때 태그를 달 수 있다', () => {
    const entry = createEntry('TSMC 매수함', new Date(), ['투자', 'TSMC'])

    expect(entry.tags).toEqual(['투자', 'TSMC'])
  })
})


describe('addTag', () => {
  it('사후에 태그를 붙인다', () => {
    const entry = createEntry('TSMC 매수함', new Date())

    const tagged = addTag(entry, '투자')

    expect(tagged.tags).toEqual(['투자'])
  })

  it('같은 태그는 중복되지 않는다', () => {
    const entry = createEntry('메모', new Date(), ['투자'])

    const tagged = addTag(entry, '투자')

    expect(tagged.tags).toEqual(['투자'])
  })
})
