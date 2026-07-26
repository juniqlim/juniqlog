import { describe, it, expect } from 'vitest'
import { saveDraft, loadDraft, type Store } from '../src/draft'

function memory(): Store {
  const map = new Map<string, string>()
  return {
    getItem: k => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v) },
    removeItem: k => { map.delete(k) },
  }
}


describe('초안', () => {
  it('저장한 것을 그대로 돌려준다', () => {
    const store = memory()

    saveDraft('쓰다 만 글', store)

    expect(loadDraft(store)).toBe('쓰다 만 글')
  })

  it('저장한 적 없으면 빈 문자열이다', () => {
    expect(loadDraft(memory())).toBe('')
  })

  it('빈 내용을 저장하면 지운다 — 전송 후 남아 되살아나면 안 된다', () => {
    const store = memory()
    saveDraft('보낼 글', store)

    saveDraft('', store)

    expect(loadDraft(store)).toBe('')
  })

  it('열쇠는 thinkthink:draft — 바뀌면 남긴 글을 못 찾는다', () => {
    const store = memory()

    saveDraft('쓰다 만 글', store)

    expect(store.getItem('thinkthink:draft')).toBe('쓰다 만 글')
  })

  it('저장소가 막혀 있어도 앱을 멈추지 않는다', () => {
    const broken: Store = {
      getItem: () => { throw new Error('접근 불가') },
      setItem: () => { throw new Error('용량 초과') },
      removeItem: () => { throw new Error('접근 불가') },
    }

    expect(() => saveDraft('글', broken)).not.toThrow()
    expect(loadDraft(broken)).toBe('')
  })
})
