/**
 * 처음 온 사람에게만 Enter 로 남긴다는 것을 알려준다.
 *
 * 입력창 안내에 적어두면 폰에서 잘린다. 그렇다고 늘 띄워두면 매번 눈에 밟힌다.
 * 한 번 보여주고 닫으면 다시 꺼내지 않는다.
 *
 * 기기에 남긴다 — 이건 서버가 알 일이 아니고, 새 기기에서는 한 번 더 보는 것이 맞다.
 */

export interface Store {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const KEY = 'thinkthink:hint'

export function needsHint(store: Store): boolean {
  try {
    return store.getItem(KEY) === null
  } catch {
    // 저장소가 막혀 있으면 닫은 것도 기억하지 못한다. 매번 뜨는 편이 더 성가시다
    return false
  }
}

export function hintShown(store: Store): void {
  try {
    store.setItem(KEY, '1')
  } catch {
    // 못 적어도 이번 세션 동안은 닫힌 채로 남는다
  }
}
