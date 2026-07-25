/** 우리 zip 을 남의 도구가 푸는지 본다 — 규격을 지켰다는 증거는 이것뿐이다 */
import { describe, it, expect, afterAll } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { zip, unzip } from '../src/zip'

const dir = mkdtempSync(join(tmpdir(), 'zip-'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))

const bytes = (s: string) => new TextEncoder().encode(s)

const archive = zip([
  { name: '2026/07/25.md', body: bytes('# 2026-07-25\n\n걸었다\n') },
  { name: '2026/08/01.md', body: bytes('# 2026-08-01\n\n한글도 그대로\n') },
], new Date(2026, 6, 25, 14, 30))

const path = join(dir, 'notes.zip')
writeFileSync(path, archive)

describe('unzip', () => {
  it('망가지지 않았다고 한다', () => {
    expect(execFileSync('unzip', ['-t', path], { encoding: 'utf8' })).toContain('No errors')
  })

  it('폴더 트리를 그대로 만든다', () => {
    execFileSync('unzip', ['-o', '-q', path, '-d', join(dir, 'out')])
    expect(readFileSync(join(dir, 'out/2026/07/25.md'), 'utf8')).toContain('걸었다')
  })

  it('한글 본문이 살아 있다', () => {
    expect(readFileSync(join(dir, 'out/2026/08/01.md'), 'utf8')).toContain('한글도 그대로')
  })
})

/** 파인더나 다른 도구를 거쳐 오면 줄여서(deflate) 묶여 있다 */
describe('남이 묶은 것 되읽기', () => {
  it('줄인 것도 푼다', async () => {
    const src = join(dir, 'src')
    mkdirSync(join(src, '2026/07'), { recursive: true })
    writeFileSync(join(src, '2026/07/25.md'), '# 2026-07-25 (토)\n\n걸었다\n'.repeat(50))
    execFileSync('zip', ['-r', '-q', join(dir, 'made.zip'), '.'], { cwd: src })

    const files = await unzip(new Uint8Array(readFileSync(join(dir, 'made.zip'))))
    const md = files.find(f => f.name === '2026/07/25.md')!
    expect(new TextDecoder().decode(md.body)).toContain('걸었다')
  })
})
