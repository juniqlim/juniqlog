/**
 * 밝게 볼지 어둡게 볼지.
 *
 * 색은 CSS 의 light-dark() 가 쥐고 있다 — 여기서는 어느 쪽을 쓸지만 정한다.
 * 고른 적이 없으면 기기 설정을 따르고, 고르면 그것이 앞선다.
 *
 * CSP 가 인라인 스크립트를 막아 첫 페인트 전에 색을 칠할 수 없다.
 * color-scheme 만 넘기면 브라우저가 알아서 칠하므로 깜빡이지 않는다.
 */

export type Theme = 'light' | 'dark'

export const KEY = 'theme'

export function currentTheme(saved: string | null, prefersDark: boolean): Theme {
  if (saved === 'light' || saved === 'dark') return saved
  return prefersDark ? 'dark' : 'light'
}

export function toggle(now: Theme): Theme {
  return now === 'dark' ? 'light' : 'dark'
}

/**
 * 지금이 아니라 눌렀을 때 될 모습을 보인다 — 버튼은 무엇이 일어날지를 말해야 한다.
 * 글자 대신 그림인 것은 머리말이 좁아서다. 제목이 한가운데 있으려면 양옆이 가벼워야 한다.
 */
export function label(now: Theme): string {
  return now === 'dark' ? '☀️' : '🌙'
}

/** 아이폰 상태 표시줄 색. 배경과 어긋나면 위쪽에 띠가 생긴다 */
export function barColor(now: Theme): string {
  return now === 'dark' ? '#0f1115' : '#f6f7f9'
}
