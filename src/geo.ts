/**
 * 글을 쓸 때 어디였는지 함께 남긴다.
 *
 * 전송 시점에 위치를 요청하면 실내나 지하에서 몇 초씩 걸린다. 그래서 미리
 * 받아둔 좌표를 즉시 붙이고, 없거나 오래됐으면 위치 없이 저장한다.
 * 글이 늦게 올라가는 것보다 위치가 비는 편이 낫다.
 */

export interface Fix {
  lat: number
  lon: number
  acc: number
  /** 받아둔 시각 (epoch ms) */
  at: number
}

export function isFresh(fix: Fix | null, now: number, maxAgeMs: number): boolean {
  if (fix === null) return false
  return now - fix.at <= maxAgeMs
}

/** 소수점 다섯 자리면 1m 남짓 — 그보다 잘게 남길 이유가 없다 */
export function encodeFix(fix: Fix): string {
  return JSON.stringify({
    lat: round(fix.lat, 5),
    lon: round(fix.lon, 5),
    acc: Math.round(fix.acc),
  })
}

function round(n: number, digits: number): number {
  return Number(n.toFixed(digits))
}
