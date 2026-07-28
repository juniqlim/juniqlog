/**
 * 키 입력 판정.
 *
 * 한글처럼 조합해서 쓰는 입력기에서는 Enter 가 두 가지 뜻을 갖는다 —
 * 조합 중이면 "이 글자로 확정", 아니면 "보내기". 이걸 구분하지 않으면
 * 확정된 마지막 글자가 빈 입력창에 남아 한 번 더 전송된다.
 */

export interface KeyPress {
  key: string
  shiftKey: boolean
  isComposing: boolean
}

export function isSubmit(e: KeyPress): boolean {
  return e.key === 'Enter' && !e.shiftKey && !e.isComposing
}

export function isCancel(e: KeyPress): boolean {
  return e.key === 'Escape' && !e.isComposing
}

/**
 * 고치다 말고 수정창을 벗어날 때 — 남길 것인가 닫을 것인가.
 *
 * 나가는 길에 고친 것을 잃으면 안 된다. 그래서 기본은 남기기다.
 * 손대지 않았거나 다 지웠으면 남길 것이 없으니 닫기만 한다.
 * 버리려면 Escape 가 따로 있다 — 그쪽이 버리겠다는 뜻이다.
 */
export function onLeave(current: string, original: string): 'save' | 'close' {
  if (current.trim() === '' || current === original) return 'close'
  return 'save'
}
