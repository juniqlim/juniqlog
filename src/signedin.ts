/**
 * 지난번에 들어와 있었는지 저장소만 보고 안다.
 *
 * 세션을 확인하려면 서버에 다녀와야 하고, 토큰이 만료됐으면 갱신까지
 * 기다린다(폰에서 0.9초). 그동안 화면이 비어 있으면 쓰려고 연 사람은
 * 그 시간을 고스란히 앉아서 기다린다.
 *
 * 그래서 흔적만 보고 앱을 먼저 띄운다. 확인은 뒤에서 하고, 아니었으면
 * 그때 로그인 화면으로 돌린다 — 틀렸을 때 잃는 것은 잠깐 보인 빈 목록뿐이다.
 * 이것으로 무엇을 열지는 않는다. 본문은 키가 있어야 열리고 키는 따로 온다.
 */

/** supabase-js 가 세션을 담는 자리 — sb-<프로젝트>-auth-token */
function isSessionKey(key: string): boolean {
  return key.startsWith('sb-') && key.endsWith('-auth-token')
}

export function wasSignedIn(store: Storage): boolean {
  try {
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i)
      if (key !== null && isSessionKey(key) && (store.getItem(key) ?? '') !== '') return true
    }
    return false
  } catch {
    // 저장소가 막혀 있으면(비공개 모드) 흔적을 볼 길이 없다. 확인을 기다린다
    return false
  }
}
