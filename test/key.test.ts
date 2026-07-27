import { describe, it, expect } from 'vitest'
import { claimsOf } from '../api/key.js'

/** 서명 자리는 아무 값이나 둔다 — 여기서 보지 않는다는 것이 요점이다 */
function token(payload: object, signature = 'sig'): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `header.${body}.${signature}`
}

describe('토큰에 적힌 신원', () => {
  it('누구라고 적혀 있는지 읽는다 — 조회를 미리 걸 자리다', () => {
    const t = token({ sub: '11111111-2222-3333-4444-555555555555', email: 'a@b.c' })

    expect(claimsOf(t)?.sub).toBe('11111111-2222-3333-4444-555555555555')
  })

  it('서명이 엉터리여도 읽어낸다 — 믿는 것은 여기가 아니라 Supabase 의 대답이다', () => {
    const t = token({ sub: 'u1' }, '망가진서명')

    expect(claimsOf(t)?.sub).toBe('u1')
  })

  it('base64url 의 - 와 _ 도 제대로 읽는다', () => {
    const t = token({ sub: 'u1', note: '???>>>' })

    expect(claimsOf(t)?.note).toBe('???>>>')
  })

  it('한글이 들어 있어도 깨지지 않는다', () => {
    expect(claimsOf(token({ sub: 'u1', name: '임준' }))?.name).toBe('임준')
  })

  it('토큰 꼴이 아니면 아무것도 없다 — 힌트가 없으면 없는 대로 간다', () => {
    expect(claimsOf('그냥문자열')).toBeNull()
    expect(claimsOf('a.b')).toBeNull()
    expect(claimsOf('')).toBeNull()
  })

  it('가운데가 JSON 이 아니어도 터지지 않는다', () => {
    expect(claimsOf('header.!!!.sig')).toBeNull()
  })
})
