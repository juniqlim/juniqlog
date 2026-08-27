/**
 * 손가락으로 좌메뉴를 여닫는다.
 *
 * 폰에서는 ☰ 가 화면 맨 위 왼쪽에 있어 한 손으로 쥐면 엄지가 닿지 않는다.
 * 가장자리에서 밀어 여는 손짓은 폰을 쥔 자리 그대로 쓴다.
 *
 * 열 때는 왼쪽 가장자리에서 시작한 것만 받는다 — 글을 읽다 손이 스친 것과
 * 메뉴를 부르는 손짓을 가르는 값이 시작점이다.
 * 닫을 때는 어디서 시작하든 받는다 — 이미 메뉴가 눈앞에 있으니 헷갈릴 것이 없고,
 * 가장자리를 다시 더듬게 하는 것은 성가시다.
 *
 * 세로가 더 크면 목록을 굴리는 손짓이다. 넘긴다.
 *
 * 아이폰에서 맨 왼쪽 몇 px 는 사파리의 뒤로 가기가 먼저 가져간다.
 * 홈 화면에서 띄운 앱은 되돌아갈 곳이 없어 그 손짓이 비어 있고, 그 자리를 우리가 받는다.
 */

export interface Point { x: number; y: number }
export type Action = 'open' | 'close' | 'none'

/** 여는 손짓으로 쳐주는 시작 자리 — 화면 왼쪽 끝에서 이만큼 */
export const EDGE = 40
/** 손짓으로 쳐주는 가로 길이 */
export const THRESHOLD = 50

export function swipeAction(start: Point, end: Point, opened: boolean): Action {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (Math.abs(dx) < THRESHOLD) return 'none'
  if (Math.abs(dx) <= Math.abs(dy)) return 'none'
  if (dx > 0) return !opened && start.x <= EDGE ? 'open' : 'none'
  return opened ? 'close' : 'none'
}
