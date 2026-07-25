import { createClient, type Session } from '@supabase/supabase-js'
import { addTag as withTag } from './entry'
import { timeOf, dateOf, groupByDate, tagsOf, type LogEntry, type TagCount } from './timeline'
import { treeOf, monthRange, dayRange, today, daysAgo, type YearNode } from './calendar'

/** 휴지통은 최근 이 기간만 보여준다 (데이터는 지우지 않는다) */
const TRASH_DAYS = 7
import { extractTags, parseLines, type Piece } from './tags'
import { isSearchable, matches } from './search'
import { isSubmit, isCancel } from './input'
import { saveDraft, loadDraft } from './draft'
import { importKey, encrypt, decrypt, isEncrypted } from './crypto'

const SUPABASE_URL = 'https://zuvifgiiahbypxsvnzvg.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dmlmZ2lpYWhieXB4c3ZuenZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NTMwNDQsImV4cCI6MjEwMDQyOTA0NH0.sVexgnQmy0YRcg3bjq0ThHB8sgPLtn1X3SDDyUbeG18'

const sb = createClient(SUPABASE_URL, SUPABASE_ANON)

/** 무엇을 보고 있는가 — 달 단위 또는 태그 단위 */
type View =
  | { kind: 'month'; year: number; month: number }
  | { kind: 'day'; year: number; month: number; day: number }
  | { kind: 'tag'; tag: string }
  | { kind: 'search'; q: string }
  | { kind: 'trash' }

const TABS = [
  { id: 'date', label: '날짜' },
  { id: 'tag', label: '태그' },
  { id: 'search', label: '검색' },
] as const
type TabId = (typeof TABS)[number]['id']

let entries: LogEntry[] = []
let tree: YearNode[] = []
let tags: TagCount[] = []
let view: View | null = null
let tab: TabId = 'date'
let trashCount = 0
let openYears = new Set<number>()
let openMonths = new Set<string>()
let channel: ReturnType<typeof sb.channel> | null = null
let noteKey: CryptoKey | null = null

const $ = (id: string) => document.getElementById(id)!

/* ---- 본문 암호화 ---- */

/** 키는 Supabase가 아니라 Vercel에 있다. 로그인한 본인에게만 내준다 */
async function fetchKey(token: string): Promise<CryptoKey> {
  const res = await fetch('/api/key', { headers: { authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`키를 받지 못했다 (${res.status})`)
  const { key } = await res.json() as { key: string }
  return importKey(key)
}

const seal = (body: string) => encrypt(body, noteKey!)

/** 한 건이 깨져도 나머지는 보여준다 — 조용히 사라지는 것보다 낫다 */
async function unseal(rows: LogEntry[]): Promise<LogEntry[]> {
  return Promise.all(rows.map(async e => {
    if (!isEncrypted(e.body)) return e   // 마이그레이션 전 평문
    try {
      return { ...e, body: await decrypt(e.body, noteKey!) }
    } catch {
      return { ...e, body: '⚠️ 복호화하지 못했습니다' }
    }
  }))
}

/* ---- realtime ---- */
function subscribe(token: string) {
  if (channel) return
  sb.realtime.setAuth(token)
  channel = sb.channel('entries-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, () => refresh())
    .subscribe()
}

function unsubscribe() {
  if (!channel) return
  sb.removeChannel(channel)
  channel = null
}

/* ---- auth ---- */
const showAuth = () => { $('auth').hidden = false; $('app').hidden = true }
const showApp = () => { $('auth').hidden = true; $('app').hidden = false }

async function refreshAuth() {
  const { data: { session } } = await sb.auth.getSession()
  if (!session) { noteKey = null; unsubscribe(); showAuth(); return }

  const token = (session as Session).access_token
  try {
    noteKey = await fetchKey(token)
  } catch (e) {
    // 키가 없으면 본문을 읽을 수도 쓸 수도 없다. 반쯤 열린 앱을 보여주지 않는다
    console.error(e)
    $('authmsg').textContent = '암호화 키를 받지 못했습니다. 새로고침해 보세요.'
    unsubscribe(); showAuth(); return
  }
  showApp(); await refresh(); subscribe(token)
}
sb.auth.onAuthStateChange(() => { refreshAuth() })

$('google').onclick = async () => {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: location.origin + location.pathname },
  })
  if (error) $('authmsg').textContent = '오류: ' + error.message
}

$('login').onclick = async () => {
  const email = ($('email') as HTMLInputElement).value.trim()
  if (!email) return
  $('authmsg').textContent = '전송 중…'
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin + location.pathname },
  })
  $('authmsg').textContent = error ? '오류: ' + error.message : '메일함을 확인해 링크를 누르세요.'
}

$('logout').onclick = async () => { await sb.auth.signOut() }

/* ---- data ---- */
function todayView(): View {
  return { kind: 'day', ...today(new Date()) }
}

const isToday = (v: View) =>
  v.kind === 'day' && JSON.stringify(v) === JSON.stringify(todayView())

/** 사이드바 재료(전체 날짜·태그)를 다시 읽는다 */
async function loadIndex() {
  const { data, error } = await sb.from('entries')
    .select('created_at, tags').is('deleted_at', null)
  if (error) { console.error(error); return }
  const { count } = await sb.from('entries')
    .select('id', { count: 'exact', head: true })
    .gte('deleted_at', daysAgo(TRASH_DAYS, new Date()))
  trashCount = count ?? 0

  const rows = data ?? []
  tree = treeOf(rows.map(r => r.created_at as string))
  tags = tagsOf(rows.map(r => ({ tags: (r.tags ?? []) as string[] })))
  if (!view) view = todayView()
  if (view.kind === 'month' || view.kind === 'day') openYears.add(view.year)
  if (view.kind === 'day') openMonths.add(`${view.year}-${view.month}`)
}

async function loadEntries() {
  if (!view) view = thisMonth()

  if (view.kind === 'trash') {
    const { data, error } = await sb.from('entries')
      .select('*')
      .gte('deleted_at', daysAgo(TRASH_DAYS, new Date()))
      .order('deleted_at', { ascending: false })
    if (error) { console.error(error); return }
    entries = await unseal((data ?? []) as LogEntry[])
    return
  }

  let q = sb.from('entries').select('*').is('deleted_at', null)
  if (view.kind === 'month') {
    const { from, to } = monthRange(view.year, view.month)
    q = q.gte('created_at', from).lt('created_at', to)
  } else if (view.kind === 'day') {
    const { from, to } = dayRange(view.year, view.month, view.day)
    q = q.gte('created_at', from).lt('created_at', to)
  } else if (view.kind === 'tag') {
    q = q.contains('tags', [view.tag])
  }
  // 검색은 거르지 않고 전량 받는다 — 서버가 보는 건 암호문뿐이라 ILIKE를 쓸 수 없다

  const { data, error } = await q.order('created_at', { ascending: true })
  if (error) { console.error(error); return }

  const rows = await unseal((data ?? []) as LogEntry[])
  entries = view.kind === 'search' ? rows.filter(e => matches(e.body, view.q)) : rows
}

async function refresh() {
  await loadIndex()
  await loadEntries()
  renderAll()
  scrollToLatest()
}

function scrollToLatest() {
  window.scrollTo({ top: document.body.scrollHeight })
}

let sending = false

async function submit() {
  const ta = $('input') as HTMLTextAreaElement
  const body = ta.value
  if (body.trim() === '' || sending) return

  // 서버가 받은 것을 확인하기 전에는 입력창을 비우지 않는다.
  // 먼저 비웠다가 전송이 실패하면 글이 그대로 사라진다.
  sending = true
  try {
    // 태그는 평문에서 뽑아 평문으로 저장한다 (서버 태그 필터를 살리기 위해)
    const { error } = await sb.from('entries')
      .insert({ body: await seal(body), tags: extractTags(body) })
    if (error) throw new Error(error.message)
  } catch (e) {
    // 네트워크가 끊기면 insert 는 예외를 던진다. 잡지 않으면 알림도 없이 사라진다
    console.error(e)
    alert(`저장하지 못했습니다. 글은 그대로 두었습니다.\n\n${(e as Error).message}`)
    return
  } finally {
    sending = false
  }

  ta.value = ''; ta.style.height = '42px'
  saveDraft('', localStorage)
  view = todayView()
  await refresh()
}

async function addTag(entry: LogEntry, tag: string) {
  const tagged = withTag(entry, tag)
  if (tagged.tags.length === entry.tags.length) return
  const { error } = await sb.from('entries').update({ tags: tagged.tags }).eq('id', entry.id)
  if (error) { console.error(error); return }
  await refresh()
}

async function saveEdit(entry: LogEntry, body: string) {
  if (body.trim() === '' || body === entry.body) return
  try {
    const { error } = await sb.from('entries')
      .update({ body: await seal(body), tags: extractTags(body) }).eq('id', entry.id)
    if (error) throw new Error(error.message)
  } catch (e) {
    // 실패해도 수정창은 그대로 둔다 — 고친 내용을 잃지 않는다
    console.error(e)
    alert(`수정하지 못했습니다. 고친 내용은 그대로 두었습니다.\n\n${(e as Error).message}`)
    return
  }
  await refresh()
}

async function restoreEntry(entry: LogEntry) {
  const { error } = await sb.from('entries')
    .update({ deleted_at: null }).eq('id', entry.id)
  if (error) { console.error(error); return }
  await refresh()
}

async function purgeEntry(entry: LogEntry) {
  if (!confirm('완전히 지웁니다. 되돌릴 수 없습니다.')) return
  const { error } = await sb.from('entries').delete().eq('id', entry.id)
  if (error) { console.error(error); return }
  await refresh()
}

async function removeEntry(entry: LogEntry) {
  if (!confirm('이 로그를 지울까요? (데이터는 남습니다)')) return
  const { error } = await sb.from('entries')
    .update({ deleted_at: new Date().toISOString() }).eq('id', entry.id)
  if (error) { console.error(error); return }
  await refresh()
}

/* ---- sidebar ---- */
const openSidebar = (on: boolean) => {
  $('sidebar').hidden = !on
  $('backdrop').hidden = !on
}

$('menu').onclick = () => { renderSidebar(); openSidebar(true) }
$('backdrop').onclick = () => openSidebar(false)

function pick(next: View) {
  view = next
  openSidebar(false)
  refresh()
}

function renderSidebar() {
  const el = $('sidebar')
  el.innerHTML = ''

  const bar = document.createElement('div')
  bar.className = 'tabs'
  for (const t of TABS) {
    const b = document.createElement('button')
    b.className = 'tab' + (tab === t.id ? ' on' : '')
    b.textContent = t.label
    b.onclick = () => { tab = t.id; renderSidebar() }
    bar.appendChild(b)
  }
  el.appendChild(bar)

  const list = document.createElement('div')
  if (tab === 'date') renderDateTree(list)
  else if (tab === 'tag') renderTagList(list)
  else renderSearchBox(list)
  el.appendChild(list)

  const trash = document.createElement('button')
  trash.className = 'trash' + (view?.kind === 'trash' ? ' on' : '')
  trash.innerHTML = `<span>휴지통</span><span class="cnt">${trashCount}</span>`
  trash.onclick = () => pick({ kind: 'trash' })
  el.appendChild(trash)
}

function renderSearchBox(box: HTMLElement) {
  const input = document.createElement('input')
  input.className = 'find'
  input.placeholder = '검색어'
  input.value = view?.kind === 'search' ? view.q : ''
  input.onkeydown = e => {
    if (!isSubmit(e)) return
    const q = input.value
    if (isSearchable(q)) pick({ kind: 'search', q })
  }
  box.appendChild(input)

  const hint = document.createElement('div')
  hint.className = 'empty'
  hint.textContent = '전체 기간에서 본문을 찾습니다'
  box.appendChild(hint)
  setTimeout(() => input.focus(), 0)
}

function renderDateTree(box: HTMLElement) {
  if (tree.length === 0) { box.innerHTML = '<div class="empty">아직 로그가 없습니다</div>'; return }

  const pad = (n: number) => String(n).padStart(2, '0')

  for (const node of tree) {
    const yearOpen = openYears.has(node.year)
    const y = document.createElement('button')
    y.className = 'yr'
    y.innerHTML = `<span class="caret">${yearOpen ? '⌄' : '›'}</span><span>${node.year}</span>`
    y.onclick = () => {
      yearOpen ? openYears.delete(node.year) : openYears.add(node.year)
      renderSidebar()
    }
    box.appendChild(y)
    if (!yearOpen) continue

    for (const mn of node.months) {
      const key = `${node.year}-${mn.month}`
      const monthOpen = openMonths.has(key)
      const on = view?.kind === 'month' && view.year === node.year && view.month === mn.month

      const m = document.createElement('div')
      m.className = 'row mo' + (on ? ' on' : '')
      const caret = document.createElement('button')
      caret.className = 'caret btn'
      caret.textContent = monthOpen ? '⌄' : '›'
      caret.onclick = () => {
        monthOpen ? openMonths.delete(key) : openMonths.add(key)
        renderSidebar()
      }
      const label = document.createElement('button')
      label.className = 'label'
      label.textContent = pad(mn.month)
      label.onclick = () => pick({ kind: 'month', year: node.year, month: mn.month })
      m.append(caret, label)
      box.appendChild(m)
      if (!monthOpen) continue

      for (const d of mn.days) {
        const dayOn = view?.kind === 'day'
          && view.year === node.year && view.month === mn.month && view.day === d
        const b = document.createElement('button')
        b.className = 'dy' + (dayOn ? ' on' : '')
        b.textContent = pad(d)
        b.onclick = () => pick({ kind: 'day', year: node.year, month: mn.month, day: d })
        box.appendChild(b)
      }
    }
  }
}

function renderTagList(box: HTMLElement) {
  if (tags.length === 0) { box.innerHTML = '<div class="empty">아직 태그가 없습니다</div>'; return }

  for (const { tag, count } of tags) {
    const on = view?.kind === 'tag' && view.tag === tag
    const b = document.createElement('button')
    b.className = 'yr' + (on ? ' on' : '')
    b.innerHTML = `<span class="caret">#</span><span>${tag}</span><span class="cnt">${count}</span>`
    b.onclick = () => pick({ kind: 'tag', tag })
    box.appendChild(b)
  }
}

/** 조각을 DOM으로 — innerHTML을 쓰지 않아 본문이 HTML로 해석될 여지가 없다 */
function pieceNode(piece: Piece): Node {
  if (piece.type === 'text') return document.createTextNode(piece.value)

  if (piece.type === 'link') {
    const a = document.createElement('a')
    a.className = 'link'; a.href = piece.value; a.textContent = piece.value
    a.target = '_blank'; a.rel = 'noopener noreferrer'
    return a
  }

  const tag = { bold: 'strong', italic: 'em', code: 'code', strike: 's', tag: 'span' }[piece.type]
  const el = document.createElement(tag)
  if (piece.type === 'tag') { el.className = 'intag'; el.textContent = '#' + piece.value }
  else el.textContent = piece.value
  return el
}

/** 본문 자리에서 바로 고친다 — Enter 저장, Esc 취소 */
function startEdit(box: HTMLElement, entry: LogEntry) {
  box.textContent = ''
  const ta = document.createElement('textarea')
  ta.className = 'editing'
  ta.value = entry.body
  box.appendChild(ta)

  const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px' }
  ta.addEventListener('input', fit)
  fit(); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length)

  const cancel = () => { box.textContent = ''; renderBody(box, entry.body) }
  ta.onkeydown = e => {
    if (isCancel(e)) { e.preventDefault(); cancel() }
    if (isSubmit(e)) { e.preventDefault(); saveEdit(entry, ta.value) }
  }
}

function renderBody(box: HTMLElement, body: string) {
  for (const line of parseLines(body)) {
    const row = document.createElement('div')
    row.className = 'ln ' + line.kind
    if (line.marker !== '') {
      const mk = document.createElement('span')
      mk.className = 'marker'; mk.textContent = line.marker
      row.appendChild(mk)
    }
    const content = document.createElement('span')
    for (const piece of line.pieces) content.appendChild(pieceNode(piece))
    row.appendChild(content)
    box.appendChild(row)
  }
}

/* ---- timeline ---- */
function renderAll() {
  renderSidebar()
  renderHeading()
  renderTimeline()
}

function renderHeading() {
  const fb = $('filter')
  if (!view) { fb.hidden = true; return }
  fb.hidden = false
  const pad = (n: number) => String(n).padStart(2, '0')

  fb.textContent = ''
  const label = document.createElement('span')
  if (view.kind === 'trash') label.textContent = `휴지통 · 최근 ${TRASH_DAYS}일 · ${entries.length}건`
  else if (view.kind === 'search') label.textContent = `검색 “${view.q}” · ${entries.length}건`
  else if (view.kind === 'tag') label.innerHTML = `태그 <b>#${view.tag}</b> 모아보기`
  else if (view.kind === 'day')
    label.innerHTML = `<b>${dateOf(new Date(view.year, view.month - 1, view.day).toISOString())}</b>`
  else label.innerHTML = `<b>${view.year}. ${pad(view.month)}</b>`
  fb.appendChild(label)

  if (isToday(view)) return
  fb.append(' · ')
  const back = document.createElement('a')
  back.textContent = '오늘'
  back.onclick = () => pick(todayView())
  fb.appendChild(back)
}

function renderTimeline() {
  const tl = $('timeline')
  tl.innerHTML = ''
  if (entries.length === 0) {
    const msg = view?.kind === 'trash' ? '휴지통이 비었습니다'
      : view?.kind === 'search' ? '찾는 로그가 없습니다'
      : view?.kind === 'tag' ? '이 태그의 로그가 없습니다'
      : '이 기간에 로그가 없습니다'
    tl.innerHTML = `<div class="empty">${msg}</div>`
    return
  }

  const inTrash = view?.kind === 'trash'
  // 하루치만 보고 있으면 머리말이 이미 그 날짜다 — 두 번 쓰지 않는다
  const showDates = view?.kind !== 'day'

  for (const group of groupByDate(entries)) {
    if (showDates) {
      const head = document.createElement('div')
      head.className = 'datehead'; head.textContent = group.date
      tl.appendChild(head)
    }

    for (const e of group.entries) {
      const el = document.createElement('div')
      el.className = 'entry'
      el.innerHTML = `<div class="head">
          <span class="meta"><span class="time">${timeOf(e.created_at)}</span></span>
          <span class="actions">${inTrash
            ? `<button class="act back" title="복원">↩</button>
               <button class="act purge" title="완전 삭제">×</button>`
            : `<button class="act edit" title="수정">✎</button>
               <button class="act tag" title="태그 달기">＃</button>
               <button class="act del" title="삭제">×</button>`}
          </span>
        </div>
        <div class="body"></div>`
      if (inTrash) {
        el.querySelector<HTMLElement>('.back')!.onclick = () => restoreEntry(e)
        el.querySelector<HTMLElement>('.purge')!.onclick = () => purgeEntry(e)
      } else {
        el.querySelector<HTMLElement>('.del')!.onclick = () => removeEntry(e)
        el.querySelector<HTMLElement>('.tag')!.onclick = () => {
          const t = prompt('태그')?.trim()
          if (t) addTag(e, t)
        }
      }

      // 태그 칩은 시분초 옆에 (본문 아래 줄을 쓰지 않도록)
      const meta = el.querySelector('.meta')!
      for (const t of e.tags) {
        const chip = document.createElement('span')
        chip.className = 'chip'; chip.textContent = '#' + t
        chip.onclick = () => pick({ kind: 'tag', tag: t })
        meta.appendChild(chip)
      }

      const box = el.querySelector<HTMLElement>('.body')!
      renderBody(box, e.body)
      if (!inTrash) el.querySelector<HTMLElement>('.edit')!.onclick = () => startEdit(box, e)
      tl.appendChild(el)
    }
  }
}

/* ---- input UX ---- */
$('send').onclick = submit
const ta = $('input') as HTMLTextAreaElement
ta.addEventListener('keydown', e => {
  if (isSubmit(e)) { e.preventDefault(); submit() }
})
const fitInput = () => {
  ta.style.height = '42px'
  ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
}
ta.addEventListener('input', () => {
  fitInput()
  saveDraft(ta.value, localStorage)
})

// 쓰다 만 글은 앱을 껐다 켜도, 며칠 뒤에도 그대로 있다
ta.value = loadDraft(localStorage)
if (ta.value !== '') fitInput()
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !$('app').hidden) refresh()
})

// 앱 껍데기를 캐시해 연결이 없어도 뜨게 한다. 개발 중에는 방해만 되므로 걸지 않는다
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(e => console.error('SW 등록 실패', e))
}

refreshAuth()
