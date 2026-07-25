import type { LogEntry } from './timeline'
import { toExported, filesByDay, toJson, fileStamp, type Exported } from './export'
import { zip, unzip, type ZipFile } from './zip'
import { readEntries } from './import'

/**
 * 폰에서 통째로 받아가는 길.
 *
 * 노트북에는 `node tools/export.ts` 가 폴더로 떨구지만 폰에는 터미널이 없다.
 * 파일 하나로 묶어 공유시트에 넘기면 iCloud 든 어디든 사용자가 정한다.
 *
 * 마크다운은 사람이 읽는 용, JSON 은 되돌리는 용 — 둘 다 넣는다.
 * 마크다운만 두면 정황이 한 줄로 줄어든 사본만 남아 다시 못 읽어들인다.
 */

export interface Backup {
  name: string
  bytes: Uint8Array
}

export function buildBackup(rows: LogEntry[], homeTz: string, at: Date): Backup {
  const items = toExported(rows)
  const encoder = new TextEncoder()

  const files: ZipFile[] = [...filesByDay(items, homeTz)]
    .map(([name, text]) => ({ name, body: encoder.encode(text) }))
  files.push({ name: 'entries.json', body: encoder.encode(toJson(items)) })

  return { name: `thinkthink-${fileStamp(at)}.zip`, bytes: zip(files, at) }
}

/**
 * 되읽는다. zip 이면 그 안의 entries.json 을 꺼낸다 —
 * 마크다운은 정황이 한 줄로 줄어든 사본이라 되돌릴 게 없다.
 */
export async function readBackup(bytes: Uint8Array): Promise<Exported[]> {
  if (!isZip(bytes)) return readEntries(new TextDecoder().decode(bytes))

  const found = (await unzip(bytes)).find(f => f.name.endsWith('entries.json'))
  if (found === undefined) throw new Error('이 zip 에는 entries.json 이 없습니다')
  return readEntries(new TextDecoder().decode(found.body))
}

/** 'PK' 로 시작한다. 빈 zip 은 끝맺음 기록만 있어 세 번째 바이트가 다르다 */
function isZip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b
}

/**
 * 공유시트가 있으면 그쪽으로 — '파일에 저장'으로 iCloud 어디든 넣을 수 있다.
 * 없으면 그냥 내려받는다.
 */
export async function deliver(backup: Backup): Promise<void> {
  const blob = new Blob([backup.bytes as BlobPart], { type: 'application/zip' })
  const file = new File([blob], backup.name, { type: 'application/zip' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return   // 사용자가 닫았다
      // 공유가 막혀 있으면 내려받기로 넘어간다
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = backup.name
  a.click()
  URL.revokeObjectURL(url)
}
