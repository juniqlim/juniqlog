import { describe, it, expect } from 'vitest'
import { crc32, zip } from '../src/zip'

const bytes = (s: string) => new TextEncoder().encode(s)
const at = new Date(2026, 6, 25, 14, 30)

describe('crc32', () => {
  it('규격이 정한 값과 같다', () => {
    expect(crc32(bytes('123456789'))).toBe(0xCBF43926)
  })

  it('빈 것은 0', () => {
    expect(crc32(new Uint8Array(0))).toBe(0)
  })
})


describe('zip', () => {
  it('zip 임을 알리는 표식으로 시작한다', () => {
    const out = zip([{ name: 'a.md', body: bytes('hi') }], at)
    expect([...out.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04])
  })

  it('끝맺음 기록으로 닫는다 — 푸는 쪽이 여기부터 읽는다', () => {
    const out = zip([{ name: 'a.md', body: bytes('hi') }], at)
    expect([...out.slice(-22, -18)]).toEqual([0x50, 0x4b, 0x05, 0x06])
  })

  it('넣은 개수를 끝맺음에 적는다', () => {
    const out = zip([
      { name: 'a.md', body: bytes('one') },
      { name: 'b.md', body: bytes('two') },
    ], at)
    const view = new DataView(out.buffer, out.byteLength - 22)
    expect(view.getUint16(10, true)).toBe(2)
  })

  it('본문을 그대로 담는다 — 줄이지 않는다', () => {
    const out = zip([{ name: 'a.md', body: bytes('한글도 그대로') }], at)
    expect(new TextDecoder().decode(out)).toContain('한글도 그대로')
  })

  it('한 건도 없어도 열리는 zip 을 낸다', () => {
    const out = zip([], at)
    expect(out.byteLength).toBe(22)
    expect([...out.slice(0, 4)]).toEqual([0x50, 0x4b, 0x05, 0x06])
  })
})
