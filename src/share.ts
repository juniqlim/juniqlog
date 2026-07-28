/**
 * 같은 것을 동시에 여러 번 물어오면 한 번만 다녀온다.
 *
 * 부팅 한 번에 Supabase 가 로그인 사실을 세 번 알려온다. 그때마다 열쇠를
 * 받아오면 같은 답을 세 번 받으려고 먼 길을 세 번 간다.
 *
 * 붙잡아 두지는 않는다 — 다녀온 뒤에 물으면 새로 간다. 겹치는 동안만 묶는다.
 * 열쇠가 다르면 나누지 않는다. 세션이 바뀐 순간 옛 답이 새 세션으로 새면 안 된다.
 */
export function share<T>(fn: (key: string) => Promise<T>): (key: string) => Promise<T> {
  let running: { key: string; work: Promise<T> } | null = null

  return key => {
    if (running?.key !== key) {
      const work = fn(key).finally(() => {
        // 그 사이 다른 열쇠로 넘어갔으면 남의 것이다. 건드리지 않는다
        if (running?.work === work) running = null
      })
      running = { key, work }
    }
    return running.work
  }
}
