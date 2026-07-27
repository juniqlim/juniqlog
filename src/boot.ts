/**
 * 앱이 뜨기까지 어디서 시간을 쓰는지 잰다.
 *
 * 폰에는 열어볼 콘솔도 개발자 도구도 없다. 그래서 잰 것을 화면에 띄우고
 * 붙여넣을 수 있게 한다. 원인을 찾고 나면 지워도 되는 자리다.
 */

export interface Mark {
  name: string
  /** 페이지가 열린 순간(performance.timeOrigin)부터 흐른 ms */
  at: number
}

export interface Resource {
  name: string
  duration: number
}

/** 자국 사이의 간격. 총합이 아니라 간격이라야 어디서 걸렸는지 보인다 */
export function spans(marks: Mark[]): { name: string; ms: number }[] {
  let prev = 0
  return marks.map(mark => {
    const ms = Math.round(mark.at - prev)
    prev = mark.at
    return { name: mark.name, ms }
  })
}

/** 주소 전체는 폰 화면에 들어가지 않는다. 어디였는지 알아볼 만큼만 남긴다 */
function label(url: string): string {
  try {
    const u = new URL(url)
    return `${u.host.split('.')[0]} ${u.pathname}`
  } catch {
    return url
  }
}

/** 오래 걸린 요청만 본다 — 짧은 것을 세느라 긴 것을 놓치지 않게 */
const TOP = 6

export function report(marks: Mark[], resources: Resource[]): string {
  const total = Math.round(marks[marks.length - 1]?.at ?? 0)
  const lines = [`부팅 ${total}ms`, ...spans(marks).map(s => `${s.name} ${s.ms}ms`)]

  const slowest = [...resources]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, TOP)
    .map(r => `${label(r.name)} ${Math.round(r.duration)}ms`)

  return [...lines, ...slowest].join('\n')
}
