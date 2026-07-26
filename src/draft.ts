/**
 * 쓰다 만 글을 브라우저에 남겨둔다.
 *
 * 전송이 실패하면 입력창에 그대로 두지만, 그 사이 탭이 닫히거나 브라우저가
 * 죽으면 그것마저 사라진다. 초안은 그 경우를 위한 그물이다.
 */

export interface Store {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const KEY = 'thinkthink:draft'

/** 저장소가 막혀 있어도(사파리 비공개 모드, 용량 초과) 앱은 계속 돌아야 한다 */
export function saveDraft(body: string, store: Store): void {
  try {
    if (body === '') store.removeItem(KEY)
    else store.setItem(KEY, body)
  } catch {
    // 초안은 편의 기능이다. 못 남겨도 글쓰기를 막지 않는다
  }
}

export function loadDraft(store: Store): string {
  try {
    return store.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}
