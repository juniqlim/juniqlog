import { describe, it, expect } from 'vitest'
import { swipeAction, EDGE, THRESHOLD } from '../src/swipe'

const at = (x: number, y: number) => ({ x, y })

describe('왼쪽 가장자리에서 오른쪽으로 밀면 열린다', () => {
  it('가장자리에서 시작해 문턱을 넘으면 연다', () => {
    expect(swipeAction(at(5, 300), at(5 + THRESHOLD + 1, 300), false)).toBe('open')
  })

  it('가장자리 밖에서 시작하면 열지 않는다', () => {
    expect(swipeAction(at(EDGE + 1, 300), at(EDGE + 1 + THRESHOLD + 1, 300), false)).toBe('none')
  })

  it('문턱에 못 미치면 열지 않는다 — 톡 스친 손가락', () => {
    expect(swipeAction(at(5, 300), at(5 + THRESHOLD - 1, 300), false)).toBe('none')
  })

  it('세로가 더 크면 열지 않는다 — 목록을 굴리는 손짓이다', () => {
    expect(swipeAction(at(5, 300), at(5 + THRESHOLD + 1, 300 - THRESHOLD * 2), false)).toBe('none')
  })

  it('이미 열려 있으면 오른쪽으로 밀어도 그대로 둔다', () => {
    expect(swipeAction(at(5, 300), at(5 + THRESHOLD + 1, 300), true)).toBe('none')
  })
})

describe('열린 채로 왼쪽으로 밀면 닫힌다', () => {
  it('어디서 시작하든 닫는다 — 가장자리를 다시 찾을 필요가 없다', () => {
    expect(swipeAction(at(300, 300), at(300 - THRESHOLD - 1, 300), true)).toBe('close')
  })

  it('닫혀 있으면 왼쪽으로 밀어도 할 일이 없다', () => {
    expect(swipeAction(at(300, 300), at(300 - THRESHOLD - 1, 300), false)).toBe('none')
  })

  it('세로가 더 크면 닫지 않는다', () => {
    expect(swipeAction(at(300, 300), at(300 - THRESHOLD - 1, 300 + THRESHOLD * 2), true)).toBe('none')
  })
})
