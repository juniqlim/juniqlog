/**
 * 네이티브 껍데기와 주고받는 자리.
 *
 * iOS 는 홈 화면 웹앱에 위치 권한을 세션마다 다시 묻는다. 애플이 그렇게
 * 정해둔 것이라 웹에서 우회할 길이 없다 — 열 때마다 팝업이 뜨고, 답할
 * 때까지 좌표가 없다.
 *
 * 껍데기 안에서는 앱이 권한을 한 번 받아 CoreLocation 을 계속 물고 있다.
 * 좌표는 밀려 들어와 있으므로 글을 쓸 때 기다릴 일이 없다.
 *
 * 밖(사파리·안드로이드)에서는 아무 일도 하지 않는다. 이 자리가 비어 있으면
 * 앱은 지금까지대로 navigator.geolocation 을 쓴다.
 */

import type { Fix } from './meta'

/** 껍데기가 웹뷰에 심어두는 표식 */
export function insideNative(w: unknown): boolean {
  return (w as { thinkthinkNative?: unknown })?.thinkthinkNative === true
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/**
 * 껍데기가 건넨 좌표를 받아들일지 정한다.
 *
 * 넘어오는 값은 웹뷰 경계를 건너온 것이라 형태를 믿지 않는다.
 * 정확도가 음수면 CoreLocation 이 못 쟀다는 뜻이므로 좌표도 버린다.
 */
export function fixFromNative(raw: unknown): Fix | null {
  if (raw === null || typeof raw !== 'object') return null

  const { lat, lon, acc, at } = raw as Record<string, unknown>
  if (!isNum(lat) || !isNum(lon) || !isNum(acc) || !isNum(at)) return null
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  if (acc < 0) return null

  return { lat, lon, acc, at }
}
