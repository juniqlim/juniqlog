import { describe, it, expect } from 'vitest'
import { alive, KEY_TTL } from '../src/keycache'

describe('키 캐시 — 이레살이', () => {
  it('이레 안이면 산 키다 — 서버에 다시 가지 않는다', () => {
    expect(alive(0, KEY_TTL)).toBe(true)
  })

  it('이레가 지나면 버린다 — 안전장치가 아니라 위생이다', () => {
    expect(alive(0, KEY_TTL + 1)).toBe(false)
  })
})
