import { describe, it, expect } from 'vitest'
import { isFresh, buildMeta, deviceOf, type Fix } from '../src/meta'

const fix = (at: number): Fix => ({ lat: 37.4021, lon: 126.9227, acc: 30, at })

const MINUTE = 60_000


describe('isFresh', () => {
  it('받아둔 지 얼마 안 됐으면 그대로 쓴다', () => {
    expect(isFresh(fix(0), 3 * MINUTE, 5 * MINUTE)).toBe(true)
  })

  it('오래된 좌표는 쓰지 않는다 — 그 사이 움직였을 수 있다', () => {
    expect(isFresh(fix(0), 9 * MINUTE, 5 * MINUTE)).toBe(false)
  })

  it('받아둔 적 없으면 쓸 수 없다', () => {
    expect(isFresh(null, 0, 5 * MINUTE)).toBe(false)
  })
})


describe('deviceOf', () => {
  it('아이폰을 알아본다', () => {
    expect(deviceOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('iPhone')
  })

  it('아이패드를 알아본다', () => {
    expect(deviceOf('Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)')).toBe('iPad')
  })

  it('맥을 알아본다', () => {
    expect(deviceOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('Mac')
  })

  it('안드로이드를 알아본다', () => {
    expect(deviceOf('Mozilla/5.0 (Linux; Android 15; Pixel 9)')).toBe('Android')
  })

  it('모르는 기기는 그렇다고 둔다 — 억지로 맞히지 않는다', () => {
    expect(deviceOf('Mozilla/5.0 (X11; Linux x86_64)')).toBe('기타')
  })
})


describe('buildMeta', () => {
  it('좌표·타임존·기기를 한 덩어리로 묶는다', () => {
    const meta = buildMeta(fix(0), 'Asia/Seoul', 'iPhone', 'wifi')

    expect(JSON.parse(meta!)).toEqual({
      loc: { lat: 37.4021, lon: 126.9227, acc: 30 },
      tz: 'Asia/Seoul',
      dev: 'iPhone',
      net: 'wifi',
    })
  })

  // 소수점 아래 다섯 자리면 1m 남짓이다. 그보다 잘게 남길 이유가 없다
  it('좌표 자릿수를 다섯 자리로 줄인다', () => {
    const messy: Fix = { lat: 37.40213456789, lon: 126.92271234, acc: 12.7, at: 0 }

    expect(JSON.parse(buildMeta(messy, 'Asia/Seoul', 'Mac', null)!).loc)
      .toEqual({ lat: 37.40213, lon: 126.92271, acc: 13 })
  })

  it('위치를 못 받았어도 나머지는 남긴다', () => {
    expect(JSON.parse(buildMeta(null, 'Asia/Seoul', 'Mac', null)!))
      .toEqual({ tz: 'Asia/Seoul', dev: 'Mac' })
  })

  it('네트워크를 모르는 브라우저면 그 항목만 뺀다', () => {
    expect(JSON.parse(buildMeta(null, 'Asia/Seoul', 'iPhone', null)!).net).toBeUndefined()
  })

  it('남길 게 하나도 없으면 아무것도 만들지 않는다', () => {
    expect(buildMeta(null, '', '', null)).toBe(null)
  })
})
