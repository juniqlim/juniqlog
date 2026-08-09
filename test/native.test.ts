import { describe, it, expect } from 'vitest'
import { insideNative, fixFromNative } from '../src/native'

describe('insideNative', () => {
  it('껍데기가 자기를 알리면 안이다', () => {
    expect(insideNative({ thinkthinkNative: true })).toBe(true)
  })

  it('사파리에서는 아니다', () => {
    expect(insideNative({})).toBe(false)
  })

  it('참이 아닌 값은 인정하지 않는다 — 남이 흉내내도 좌표는 오지 않는다', () => {
    expect(insideNative({ thinkthinkNative: 'yes' })).toBe(false)
  })
})

describe('fixFromNative', () => {
  const at = 1_754_712_777_000

  it('네이티브가 준 좌표를 그대로 옮긴다', () => {
    expect(fixFromNative({ lat: 37.39293, lon: 126.93565, acc: 12.4, at }))
      .toEqual({ lat: 37.39293, lon: 126.93565, acc: 12.4, at })
  })

  it('잰 시각이 없으면 받지 않는다 — 언제 것인지 모르면 신선도를 셀 수 없다', () => {
    expect(fixFromNative({ lat: 37.4, lon: 126.9, acc: 10 })).toBeNull()
  })

  it('숫자가 아닌 값은 버린다', () => {
    expect(fixFromNative({ lat: '37.4', lon: 126.9, acc: 10, at })).toBeNull()
  })

  it('땅 위에 없는 좌표는 버린다', () => {
    expect(fixFromNative({ lat: 91, lon: 126.9, acc: 10, at })).toBeNull()
    expect(fixFromNative({ lat: 37.4, lon: 181, acc: 10, at })).toBeNull()
  })

  it('정확도가 음수면 버린다 — CoreLocation 은 그것으로 못 잰 것을 알린다', () => {
    expect(fixFromNative({ lat: 37.4, lon: 126.9, acc: -1, at })).toBeNull()
  })

  it('정확도가 없어도 버린다 — 얼마나 믿을지 모르는 좌표는 쓰지 않는다', () => {
    expect(fixFromNative({ lat: 37.4, lon: 126.9, at })).toBeNull()
  })

  it('덩어리가 아니면 버린다', () => {
    expect(fixFromNative(null)).toBeNull()
    expect(fixFromNative('37.4,126.9')).toBeNull()
  })
})
