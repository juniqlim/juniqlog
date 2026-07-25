/**
 * 여러 파일을 하나로 묶는다 — 폰에서 폴더째 받아가려면 이 방법뿐이다.
 *
 * 줄이지 않고 그대로 담는다(store). 글은 이미 작고, 압축을 넣으면 브라우저마다
 * 되는지 따져야 한다. 파일 앱은 무압축 zip 도 똑같이 풀어준다.
 *
 * 4GB 를 넘길 일이 없으므로 zip64 는 쓰지 않는다.
 */

export interface ZipFile {
  /** 폴더는 '/' 로 나눈다 — 푸는 쪽이 알아서 만든다 */
  name: string
  body: Uint8Array
}

export function zip(files: ZipFile[], at: Date): Uint8Array {
  const { time, date } = dosStamp(at)
  const encoder = new TextEncoder()

  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const name = encoder.encode(file.name)
    const sum = crc32(file.body)

    const local = block(30 + name.byteLength, (view, bytes) => {
      view.setUint32(0, 0x04034b50, true)
      view.setUint16(4, 20, true)         // 풀려면 2.0 이면 된다
      view.setUint16(6, 0x0800, true)     // 이름은 UTF-8 이다
      view.setUint16(8, 0, true)          // 줄이지 않음
      view.setUint16(10, time, true)
      view.setUint16(12, date, true)
      view.setUint32(14, sum, true)
      view.setUint32(18, file.body.byteLength, true)
      view.setUint32(22, file.body.byteLength, true)
      view.setUint16(26, name.byteLength, true)
      bytes.set(name, 30)
    })

    central.push(block(46 + name.byteLength, (view, bytes) => {
      view.setUint32(0, 0x02014b50, true)
      view.setUint16(4, 20, true)
      view.setUint16(6, 20, true)
      view.setUint16(8, 0x0800, true)
      view.setUint16(10, 0, true)
      view.setUint16(12, time, true)
      view.setUint16(14, date, true)
      view.setUint32(16, sum, true)
      view.setUint32(20, file.body.byteLength, true)
      view.setUint32(24, file.body.byteLength, true)
      view.setUint16(28, name.byteLength, true)
      view.setUint32(42, offset, true)    // 이 파일이 시작하는 자리
      bytes.set(name, 46)
    }))

    parts.push(local, file.body)
    offset += local.byteLength + file.body.byteLength
  }

  const centralSize = central.reduce((n, b) => n + b.byteLength, 0)
  const end = block(22, view => {
    view.setUint32(0, 0x06054b50, true)
    view.setUint16(8, files.length, true)
    view.setUint16(10, files.length, true)
    view.setUint32(12, centralSize, true)
    view.setUint32(16, offset, true)      // 목록이 시작하는 자리
  })

  return join([...parts, ...central, end])
}

/**
 * 되읽는다. 우리가 낸 무압축뿐 아니라 줄인 것(deflate)도 푼다 —
 * 파인더나 다른 도구를 거치면 다시 묶여 오기 때문이다.
 */
export async function unzip(bytes: Uint8Array): Promise<ZipFile[]> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const end = findEnd(view)
  if (end < 0) throw new Error('zip 파일이 아닙니다')

  const count = view.getUint16(end + 10, true)
  const decoder = new TextDecoder()
  const files: ZipFile[] = []

  let at = view.getUint32(end + 16, true)
  for (let i = 0; i < count; i++) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new Error('목록이 깨졌습니다')

    const method = view.getUint16(at + 10, true)
    const size = view.getUint32(at + 20, true)
    const nameLen = view.getUint16(at + 28, true)
    const extraLen = view.getUint16(at + 30, true)
    const commentLen = view.getUint16(at + 32, true)
    const head = view.getUint32(at + 42, true)
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLen))

    // 로컬 헤더의 덧붙임 길이는 목록의 것과 다를 수 있다 — 거기서 다시 읽는다
    const from = head + 30 + view.getUint16(head + 26, true) + view.getUint16(head + 28, true)
    const raw = bytes.subarray(from, from + size)

    // 폴더 자리를 표시한 항목은 건너뛴다
    if (!name.endsWith('/')) files.push({ name, body: await inflate(raw, method) })
    at += 46 + nameLen + extraLen + commentLen
  }
  return files
}

/** 끝맺음 기록은 뒤에 있다. 덧말이 붙었을 수 있어 뒤에서부터 찾는다 */
function findEnd(view: DataView): number {
  for (let at = view.byteLength - 22; at >= 0; at--) {
    if (view.getUint32(at, true) === 0x06054b50) return at
  }
  return -1
}

async function inflate(raw: Uint8Array, method: number): Promise<Uint8Array> {
  if (method === 0) return raw.slice()
  if (method !== 8) throw new Error(`풀 수 없는 방식입니다 (${method})`)

  const stream = new Blob([raw as BlobPart]).stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

const TABLE = buildTable()

export function crc32(bytes: Uint8Array): number {
  let acc = 0xFFFFFFFF
  for (const byte of bytes) acc = TABLE[(acc ^ byte) & 0xFF] ^ (acc >>> 8)
  return (acc ^ 0xFFFFFFFF) >>> 0
}

function buildTable(): Uint32Array {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let n = i
    for (let bit = 0; bit < 8; bit++) n = n & 1 ? 0xEDB88320 ^ (n >>> 1) : n >>> 1
    table[i] = n >>> 0
  }
  return table
}

/** zip 은 아직 1980년 기준 날짜를 쓴다 */
function dosStamp(at: Date): { time: number; date: number } {
  return {
    time: (at.getHours() << 11) | (at.getMinutes() << 5) | (at.getSeconds() >> 1),
    date: ((at.getFullYear() - 1980) << 9) | ((at.getMonth() + 1) << 5) | at.getDate(),
  }
}

function block(size: number, fill: (view: DataView, bytes: Uint8Array) => void): Uint8Array {
  const bytes = new Uint8Array(size)
  fill(new DataView(bytes.buffer), bytes)
  return bytes
}

function join(chunks: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0))
  let at = 0
  for (const chunk of chunks) { out.set(chunk, at); at += chunk.byteLength }
  return out
}
