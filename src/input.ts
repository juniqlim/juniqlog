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
