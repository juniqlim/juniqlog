import { describe, it, expect } from 'vitest'
import { isSubmit, isCancel } from '../src/input'

const key = (key: string, opts: { shiftKey?: boolean; isComposing?: boolean } = {}) =>
  ({ key, shiftKey: opts.shiftKey ?? false, isComposing: opts.isComposing ?? false })


describe('isSubmit', () => {
  it('Enter 면 보낸다', () => {
    expect(isSubmit(key('Enter'))).toBe(true)
  })

  it('Shift+Enter 는 줄바꿈이므로 보내지 않는다', () => {
    expect(isSubmit(key('Enter', { shiftKey: true }))).toBe(false)
  })

  // 조합 중 Enter 는 글자를 확정하려는 것이지 보내려는 게 아니다.
  // 여기서 보내면 확정된 마지막 글자가 빈 입력창에 남아 한 번 더 전송된다.
  it('한글을 조합하는 중이면 보내지 않는다', () => {
    expect(isSubmit(key('Enter', { isComposing: true }))).toBe(false)
  })

  it('다른 키는 보내지 않는다', () => {
    expect(isSubmit(key('a'))).toBe(false)
    expect(isSubmit(key('Escape'))).toBe(false)
  })
})


describe('isCancel', () => {
  it('Escape 면 취소한다', () => {
    expect(isCancel(key('Escape'))).toBe(true)
  })

  it('조합 중 Escape 는 조합을 무르는 것이라 취소하지 않는다', () => {
    expect(isCancel(key('Escape', { isComposing: true }))).toBe(false)
  })

  it('다른 키는 취소하지 않는다', () => {
    expect(isCancel(key('Enter'))).toBe(false)
  })
})
