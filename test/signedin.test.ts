import { describe, it, expect } from 'vitest'
import { wasSignedIn } from '../src/signedin'

/** localStorage 를 흉내낸다 — 키 목록을 훑는 일까지 포함해서 */
function store(entries: Record<string, string>): Storage {
  const keys = Object.keys(entries)
  return {
    length: keys.length,
    key: (i: number) => keys[i] ?? null,
    getItem: (k: string) => entries[k] ?? null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  } as Storage
}

describe('wasSignedIn', () => {
  it('지난번 세션이 담겨 있으면 들어와 있었다고 본다', () => {
    expect(wasSignedIn(store({ 'sb-zuvifgiiahbypxsvnzvg-auth-token': '{"access_token":"x"}' }))).toBe(true)
  })

  it('저장소가 비어 있으면 아니다', () => {
    expect(wasSignedIn(store({}))).toBe(false)
  })

  it('남의 키만 있으면 아니다 — 큐나 테마까지 세지 않는다', () => {
    expect(wasSignedIn(store({ 'thinkthink:queue': '[]', 'thinkthink:theme': 'dark' }))).toBe(false)
  })

  it('빈 값은 흔적으로 치지 않는다 — 지우다 만 자리다', () => {
    expect(wasSignedIn(store({ 'sb-zuvifgiiahbypxsvnzvg-auth-token': '' }))).toBe(false)
  })

  it('저장소가 막혀 있으면 아니라고 본다 — 앱은 로그인 화면부터 뜬다', () => {
    const blocked = {
      length: 1,
      key: () => { throw new Error('막힘') },
      getItem: () => { throw new Error('막힘') },
      setItem: () => {}, removeItem: () => {}, clear: () => {},
    } as unknown as Storage
    expect(wasSignedIn(blocked)).toBe(false)
  })
})
