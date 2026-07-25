import { describe, it, expect } from 'vitest'
import { crc32, zip, unzip } from '../src/zip'

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


describe('unzip', () => {
  const text = (b: Uint8Array) => new TextDecoder().decode(b)

  it('우리가 묶은 것을 그대로 되돌린다', async () => {
    const out = await unzip(zip([
      { name: '2026/07/25.md', body: bytes('걸었다') },
      { name: 'entries.json', body: bytes('[]') },
    ], at))

    expect(out.map(f => f.name)).toEqual(['2026/07/25.md', 'entries.json'])
    expect(text(out[0].body)).toBe('걸었다')
  })

  it('빈 zip 에서는 아무것도 나오지 않는다', async () => {
    expect(await unzip(zip([], at))).toEqual([])
  })

  it('zip 이 아니면 알려준다 — 엉뚱한 파일을 고를 수 있다', async () => {
    await expect(unzip(bytes('그냥 글'))).rejects.toThrow()
  })
})
