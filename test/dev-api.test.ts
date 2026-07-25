import { describe, it, expect } from 'vitest'
import { routeOf, parseEnv } from '../tools/dev-api'

describe('routeOf', () => {
  it('api 경로는 같은 이름의 함수 파일로 간다', () => {
    expect(routeOf('/api/key')).toBe('key')
  })

  it('질의 문자열은 경로가 아니다', () => {
    expect(routeOf('/api/key?force=1')).toBe('key')
  })

  it('끝의 빗금은 없는 것과 같다', () => {
    expect(routeOf('/api/key/')).toBe('key')
  })

  it('이름이 겹쳐 보여도 다른 경로다', () => {
    expect(routeOf('/api/keychain')).toBe('keychain')
  })

  it('api 밖은 넘기지 않는다 — 화면은 vite 몫이다', () => {
    expect(routeOf('/')).toBeNull()
    expect(routeOf('/src/app.ts')).toBeNull()
    expect(routeOf('/apikey')).toBeNull()
  })

  it('더 깊은 경로는 다루지 않는다', () => {
    expect(routeOf('/api/a/b')).toBeNull()
  })

  it('빈 이름은 함수가 아니다', () => {
    expect(routeOf('/api/')).toBeNull()
    expect(routeOf('/api')).toBeNull()
  })

  it('상위로 거슬러 오르는 이름은 막는다', () => {
    expect(routeOf('/api/..%2f..%2fetc%2fpasswd')).toBeNull()
    expect(routeOf('/api/.env')).toBeNull()
  })
})

describe('parseEnv', () => {
  it('KEY=값 을 읽는다', () => {
    expect(parseEnv('A=1\nB=two')).toEqual({ A: '1', B: 'two' })
  })

  it('주석과 빈 줄은 건너뛴다', () => {
    expect(parseEnv('# 설명\n\nA=1\n')).toEqual({ A: '1' })
  })

  it('감싼 따옴표는 벗긴다', () => {
    expect(parseEnv(`A="1"\nB='2'`)).toEqual({ A: '1', B: '2' })
  })

  it('값 안의 등호는 값의 일부다 — 토큰이 잘리면 안 된다', () => {
    expect(parseEnv('JWT=aa.bb=cc')).toEqual({ JWT: 'aa.bb=cc' })
  })

  it('값이 비어도 키는 남는다', () => {
    expect(parseEnv('A=')).toEqual({ A: '' })
  })
})
