import { describe, it, expect } from 'vitest'
import { currentTheme, toggle, label, barColor } from '../src/theme'

describe('currentTheme', () => {
  it('고른 적이 없으면 기기 설정을 따른다', () => {
    expect(currentTheme(null, true)).toBe('dark')
    expect(currentTheme(null, false)).toBe('light')
  })

  it('고른 적이 있으면 기기 설정보다 그것이 앞선다', () => {
    expect(currentTheme('light', true)).toBe('light')
    expect(currentTheme('dark', false)).toBe('dark')
  })

  it('알 수 없는 값은 고르지 않은 것으로 본다 — 저장한 것이 상할 수 있다', () => {
    expect(currentTheme('보라색', true)).toBe('dark')
  })
})

describe('toggle', () => {
  it('반대로 넘긴다', () => {
    expect(toggle('dark')).toBe('light')
    expect(toggle('light')).toBe('dark')
  })
})

describe('label', () => {
  it('지금이 아니라 눌렀을 때 될 모습을 적는다', () => {
    expect(label('dark')).toBe('밝게')
    expect(label('light')).toBe('어둡게')
  })
})

describe('barColor', () => {
  it('아이폰 상태 표시줄이 배경과 이어지게 색을 맞춘다', () => {
    expect(barColor('dark')).toBe('#0f1115')
    expect(barColor('light')).toBe('#f6f7f9')
  })
})
