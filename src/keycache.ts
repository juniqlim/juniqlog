/**
 * 받아온 DEK 를 기기에 이레 담아둔다 — 부팅마다 /api/key 왕복(폰에서 2.5초)을 없앤다.
 *
 * localStorage 가 아니라 IndexedDB 다. 꺼낼 수 없는(extractable: false) CryptoKey 를
 * 그대로 넣을 수 있는 곳은 여기뿐이다 — 스크립트는 이 키로 잠그고 열 뿐,
 * 원본 바이트는 읽지 못한다.
 *
 * 키를 기기에 두어도 서버가 끊는 길은 그대로다. 글이 서버에만 있어서,
 * 세션을 철회하면 키가 있어도 열 것이 없다. 이레 기한은 안전장치가 아니라 위생이다.
 */

export const KEY_TTL = 7 * 24 * 60 * 60 * 1000

export function alive(at: number, now: number): boolean {
  return now - at <= KEY_TTL
}

const DB = 'thinkthink'
const STORE = 'keys'
const ID = 'dek'

interface Stored {
  key: CryptoKey
  /** 서버에서 받아온 시각 (epoch ms) */
  at: number
}

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE) }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function run<T>(mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(d => new Promise<T>((resolve, reject) => {
    const tx = d.transaction(STORE, mode)
    const req = op(tx.objectStore(STORE))
    tx.oncomplete = () => { d.close(); resolve(req.result) }
    tx.onerror = () => { d.close(); reject(tx.error) }
  }))
}

/** 저장소가 막혀 있어도(비공개 모드, 용량 초과) 캐시가 없는 셈 치고 서버로 간다 */
export async function loadKey(now: number): Promise<CryptoKey | null> {
  try {
    const row = await run('readonly', s => s.get(ID)) as Stored | undefined
    if (!row || !alive(row.at, now)) return null
    return row.key
  } catch {
    return null
  }
}

export async function saveKey(key: CryptoKey, now: number): Promise<void> {
  try {
    await run('readwrite', s => s.put({ key, at: now } satisfies Stored, ID))
  } catch {
    // 캐시는 편의다. 못 담아도 다음 부팅이 조금 느릴 뿐이다
  }
}

export async function clearKey(): Promise<void> {
  try {
    await run('readwrite', s => s.delete(ID))
  } catch {
    // 지울 수 없으면 이미 없는 것과 같다
  }
}
