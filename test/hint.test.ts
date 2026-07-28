import { describe, it, expect } from 'vitest'
import { needsHint, hintShown, type Store } from '../src/hint'

function memory(seed: Record<string, string> = {}): Store {
  const map = new Map(Object.entries(seed))
  return {
    getItem: k => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v) },
    removeItem: k => { map.delete(k) },
  }
}

/** 저장소가 막힌 브라우저(사파리 비공개 모드, 용량 초과) */
function blocked(): Store {
  return {
    getItem() { throw new Error('막힘') },
    setItem() { throw new Error('막힘') },
    removeItem() { throw new Error('막힘') },
  }
}

describe('처음 온 사람에게만 알려준다', () => {
  it('아무것도 없으면 알려줄 차례다', () => {
    expect(needsHint(memory())).toBe(true)
  })

  it('한 번 닫았으면 다시 꺼내지 않는다', () => {
    const store = memory()

    hintShown(store)

    expect(needsHint(store)).toBe(false)
  })

  it('닫은 사실은 앱을 껐다 켜도 남는다', () => {
    const store = memory()
    hintShown(store)

    // 같은 저장소를 새 세션에서 다시 읽는다
    expect(needsHint(memory(Object.fromEntries([['thinkthink:hint', store.getItem('thinkthink:hint')!]])))).toBe(false)
  })

  it('저장소가 막혀 있으면 알려주지 않는다 — 닫아도 계속 뜨는 편이 더 성가시다', () => {
    expect(needsHint(blocked())).toBe(false)
  })

  it('닫은 것을 못 적어도 앱은 그대로 돈다', () => {
    expect(() => hintShown(blocked())).not.toThrow()
  })
})
