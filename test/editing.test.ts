import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

/** 규칙 하나만 떼어 온다 — 셀렉터부터 닫는 중괄호까지 */
function rule(selector: string): string {
  const at = html.indexOf(selector + ' {')
  expect(at, `${selector} 규칙을 찾지 못했다`).toBeGreaterThan(-1)
  return html.slice(at, html.indexOf('}', at))
}

describe('고치는 칸', () => {
  it('아래에 쓰는 칸은 자란 만큼만 커진다 — 화면을 다 먹지 않는다', () => {
    expect(rule('textarea')).toContain('max-height:160px')
  })

  it('고치는 칸은 글이 길어도 잘리지 않는다', () => {
    // 요소 선택자의 max-height 가 그대로 내려오면 160px 에서 멈춘다
    expect(rule('.editing')).toContain('max-height:none')
  })

})
