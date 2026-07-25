import { describe, it, expect } from 'vitest'
import { isFresh, encodeFix, type Fix } from '../src/geo'

const fix = (at: number): Fix => ({ lat: 37.4021, lon: 126.9227, acc: 30, at })

const MINUTE = 60_000


describe('isFresh', () => {
  it('받아둔 지 얼마 안 됐으면 그대로 쓴다', () => {
    expect(isFresh(fix(0), 3 * MINUTE, 5 * MINUTE)).toBe(true)
  })

  it('오래된 좌표는 쓰지 않는다 — 엉뚱한 곳이 찍힌다', () => {
    expect(isFresh(fix(0), 9 * MINUTE, 5 * MINUTE)).toBe(false)
  })

  it('받아둔 적 없으면 쓸 수 없다', () => {
    expect(isFresh(null, 0, 5 * MINUTE)).toBe(false)
  })
})


describe('encodeFix', () => {
  it('좌표와 정확도를 남긴다', () => {
    expect(encodeFix(fix(1700000000000))).toBe('{"lat":37.4021,"lon":126.9227,"acc":30}')
  })

  // 소수점 아래 5자리면 1m 남짓이다. 그보다 잘게 남길 이유가 없다
  it('자릿수를 다섯 자리로 줄인다', () => {
    const messy: Fix = { lat: 37.40213456789, lon: 126.92271234, acc: 12.7, at: 0 }

    expect(encodeFix(messy)).toBe('{"lat":37.40213,"lon":126.92271,"acc":13}')
  })
})
