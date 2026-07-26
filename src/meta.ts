/**
 * 글을 쓴 정황을 함께 남긴다 — 어디서, 어느 시간대에서, 무슨 기기로.
 *
 * 한 덩어리 JSON 으로 묶어 본문과 같은 키로 잠근다. 항목을 늘려도 스키마를
 * 건드릴 일이 없다. created_at·태그와 달리 서버가 걸러줄 일이 없으므로
 * 평문으로 둘 이유가 없다.
 *
 * 날씨는 남기지 않는다. 좌표와 시각이 있으면 나중에 언제든 조회할 수 있고,
 * 지금 넣으면 글 쓸 때마다 외부 API 로 좌표가 나간다.
 */

export interface Fix {
  lat: number
  lon: number
  acc: number
  /** 좌표를 잰 시각 (epoch ms) */
  at: number
}

export interface Position {
  coords: { latitude: number; longitude: number; accuracy: number }
  timestamp: number
}

/**
 * 잰 시각을 그대로 옮긴다.
 *
 * 받은 시각을 적으면 안 된다 — maximumAge 안이면 브라우저가 묵은 좌표를
 * 즉시 돌려주는데, 그것까지 방금 잰 것으로 세면 두 배까지 오래된 자리를 쓴다.
 */
export function fixFrom(p: Position): Fix {
  return { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, at: p.timestamp }
}

export function isFresh(fix: Fix | null, now: number, maxAgeMs: number): boolean {
  if (fix === null) return false
  return now - fix.at <= maxAgeMs
}

export function deviceOf(userAgent: string): string {
  if (/iPhone/.test(userAgent)) return 'iPhone'
  if (/iPad/.test(userAgent)) return 'iPad'
  if (/Android/.test(userAgent)) return 'Android'
  if (/Macintosh/.test(userAgent)) return 'Mac'
  if (/Windows/.test(userAgent)) return 'Windows'
  return '기타'
}

/** 남길 게 하나도 없으면 null — 빈 껍데기를 저장하지 않는다 */
export function buildMeta(
  fix: Fix | null, tz: string, device: string, net: string | null,
): string | null {
  const meta: Record<string, unknown> = {}

  if (fix !== null) {
    meta.loc = { lat: round(fix.lat, 5), lon: round(fix.lon, 5), acc: Math.round(fix.acc) }
  }
  if (tz !== '') meta.tz = tz
  if (device !== '') meta.dev = device
  if (net !== null) meta.net = net

  return Object.keys(meta).length === 0 ? null : JSON.stringify(meta)
}

/**
 * 내보낼 때 쓰는 한 줄 요약 — "iPhone · 37.4021,126.9227"
 * 시간대는 사는 곳과 다를 때만 적는다. 늘 같으면 줄만 길어진다.
 */
export function describeMeta(json: string | null, homeTz: string): string {
  if (json === null) return ''

  let meta: { loc?: { lat: number; lon: number }; tz?: string; dev?: string }
  try {
    meta = JSON.parse(json)
  } catch {
    return ''   // 깨진 값 하나 때문에 내보내기를 멈추지 않는다
  }

  const parts: string[] = []
  if (meta.dev) parts.push(meta.dev)
  if (meta.tz && meta.tz !== homeTz) parts.push(meta.tz)
  if (meta.loc) parts.push(`${meta.loc.lat},${meta.loc.lon}`)

  return parts.join(' · ')
}

function round(n: number, digits: number): number {
  return Number(n.toFixed(digits))
}
