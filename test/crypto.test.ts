import { describe, it, expect } from 'vitest'
import { importKey, encrypt, decrypt, isEncrypted } from '../src/crypto'

const KEY_A = 'nQ8vX2pLm5tR7wYzC4dHjK6sN9bF1gA3eU0iO8yT2xM='
const KEY_B = 'Zk3mP9qW1eR5tY7uI0oA2sD4fG6hJ8lX0cV2bN4mQ6w='

const keyA = await importKey(KEY_A)
const keyB = await importKey(KEY_B)


describe('isEncrypted', () => {
  it('v1. 로 시작하면 암호문이다', () => {
    expect(isEncrypted('v1.abcdef')).toBe(true)
  })

  it('평문은 아니다', () => {
    expect(isEncrypted('오늘 점심 먹음')).toBe(false)
    expect(isEncrypted('')).toBe(false)
  })

  it('본문이 v1 로 시작해도 점이 없으면 평문이다', () => {
    expect(isEncrypted('v1 배포함')).toBe(false)
  })
})


describe('encrypt / decrypt', () => {
  it('암호화한 것을 그대로 되돌린다', async () => {
    const plain = '오늘 배포했다\n- 백업 워크플로\n- #회고'

    expect(await decrypt(await encrypt(plain, keyA), keyA)).toBe(plain)
  })

  it('빈 문자열도 왕복한다', async () => {
    expect(await decrypt(await encrypt('', keyA), keyA)).toBe('')
  })

  it('암호문임을 표시한다', async () => {
    expect(isEncrypted(await encrypt('아무거나', keyA))).toBe(true)
  })

  it('같은 평문이라도 매번 다른 암호문이 된다', async () => {
    const plain = '같은 내용'

    expect(await encrypt(plain, keyA)).not.toBe(await encrypt(plain, keyA))
  })

  it('다른 키로는 못 연다', async () => {
    const cipher = await encrypt('비밀', keyA)

    await expect(decrypt(cipher, keyB)).rejects.toThrow()
  })

  // 마지막 글자는 건드리지 않는다 — base64 끝자리는 일부 비트만 쓰여서
  // 글자를 바꿔도 같은 바이트가 나올 수 있다
  it('한 글자만 바뀌어도 거부한다', async () => {
    const cipher = await encrypt('비밀', keyA)
    const i = Math.floor(cipher.length / 2)
    const broken = cipher.slice(0, i) + (cipher[i] === 'A' ? 'B' : 'A') + cipher.slice(i + 1)

    await expect(decrypt(broken, keyA)).rejects.toThrow()
  })

  it('암호문이 아닌 것을 풀려 하면 거부한다', async () => {
    await expect(decrypt('그냥 평문', keyA)).rejects.toThrow()
  })
})
