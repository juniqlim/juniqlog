import { describe, it, expect } from 'vitest'
import { share } from '../src/share'

/** 마음대로 끝낼 수 있는 일. 겹치는 동안 무슨 일이 있었는지 세어 둔다 */
function pending() {
  let done: (v: string) => void = () => {}
  let fail: (e: unknown) => void = () => {}
  let calls = 0

  const fn = (key: string) => {
    calls++
    return new Promise<string>((resolve, reject) => {
      done = v => resolve(`${key}:${v}`)
      fail = reject
    })
  }

  return { fn, finish: (v: string) => done(v), breaks: (e: unknown) => fail(e), count: () => calls }
}

describe('겹치는 동안은 한 번만 다녀온다', () => {
  it('도는 사이에 또 물어도 다녀오는 것은 하나다', async () => {
    const p = pending()
    const ask = share(p.fn)

    const [a, b, c] = [ask('t1'), ask('t1'), ask('t1')]
    p.finish('키')

    expect(await Promise.all([a, b, c])).toEqual(['t1:키', 't1:키', 't1:키'])
    expect(p.count()).toBe(1)
  })

  it('끝난 뒤에 물으면 새로 다녀온다 — 붙잡아 두는 것이 아니다', async () => {
    const p = pending()
    const ask = share(p.fn)

    const first = ask('t1')
    p.finish('키')
    await first
    void ask('t1')

    expect(p.count()).toBe(2)
  })

  it('열쇠가 다르면 나눠 갖지 않는다 — 세션이 바뀌면 남의 것이 된다', () => {
    const p = pending()
    const ask = share(p.fn)

    void ask('t1')
    void ask('t2')

    expect(p.count()).toBe(2)
  })

  it('실패는 남기지 않는다 — 한 번 넘어졌다고 다음까지 막지 않는다', async () => {
    const p = pending()
    const ask = share(p.fn)

    const first = ask('t1')
    p.breaks(new Error('연결 실패'))
    await expect(first).rejects.toThrow('연결 실패')
    void ask('t1')

    expect(p.count()).toBe(2)
  })
})
