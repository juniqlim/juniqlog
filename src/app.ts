import { createClient, type Session } from '@supabase/supabase-js'
import { addTag as withTag } from './entry'
import { timeOf, groupByDate, tagsOf, type LogEntry, type TagCount } from './timeline'
import { monthsOf, monthRange, latestMonth, type YearNode, type YearMonth } from './calendar'

const SUPABASE_URL = 'https://zuvifgiiahbypxsvnzvg.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dmlmZ2lpYWhieXB4c3ZuenZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NTMwNDQsImV4cCI6MjEwMDQyOTA0NH0.sVexgnQmy0YRcg3bjq0ThHB8sgPLtn1X3SDDyUbeG18'

const sb = createClient(SUPABASE_URL, SUPABASE_ANON)

/** 무엇을 보고 있는가 — 달 단위 또는 태그 단위 */
type View = { kind: 'month'; year: number; month: number } | { kind: 'tag'; tag: string }

const TABS = [
  { id: 'date', label: '날짜' },
  { id: 'tag', label: '태그' },
] as const
type TabId = (typeof TABS)[number]['id']

let entries: LogEntry[] = []
let tree: YearNode[] = []
let tags: TagCount[] = []
let view: View | null = null
let tab: TabId = 'date'
let openYears = new Set<number>()
let channel: ReturnType<typeof sb.channel> | null = null

const $ = (id: string) => document.getElementById(id)!

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
  if (session) { showApp(); await refresh(); subscribe((session as Session).access_token) }
  else { unsubscribe(); showAuth() }
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
function thisMonth(): View {
  const now = new Date()
  return { kind: 'month', year: now.getFullYear(), month: now.getMonth() + 1 }
}

/** 사이드바 재료(전체 날짜·태그)를 다시 읽는다 */
async function loadIndex() {
  const { data, error } = await sb.from('entries')
    .select('created_at, tags').is('deleted_at', null)
  if (error) { console.error(error); return }
  const rows = data ?? []
  tree = monthsOf(rows.map(r => r.created_at as string))
  tags = tagsOf(rows.map(r => ({ tags: (r.tags ?? []) as string[] })))
  if (!view) {
    const latest = latestMonth(tree)
    view = latest ? { kind: 'month', ...latest } : thisMonth()
  }
  if (view.kind === 'month') openYears.add(view.year)
}

async function loadEntries() {
  if (!view) view = thisMonth()
  let q = sb.from('entries').select('*').is('deleted_at', null)
  if (view.kind === 'month') {
    const { from, to } = monthRange(view.year, view.month)
    q = q.gte('created_at', from).lt('created_at', to)
  } else {
    q = q.contains('tags', [view.tag])
  }
  const { data, error } = await q.order('created_at', { ascending: true })
  if (error) { console.error(error); return }
  entries = (data ?? []) as LogEntry[]
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

async function submit() {
  const ta = $('input') as HTMLTextAreaElement
  const body = ta.value
  if (body.trim() === '') return
  ta.value = ''; ta.style.height = '42px'
  const { error } = await sb.from('entries').insert({ body })
  if (error) { console.error(error); alert('저장 실패: ' + error.message); return }
  view = thisMonth()
  await refresh()
}

async function addTag(entry: LogEntry, tag: string) {
  const tagged = withTag(entry, tag)
  if (tagged.tags.length === entry.tags.length) return
  const { error } = await sb.from('entries').update({ tags: tagged.tags }).eq('id', entry.id)
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
  else renderTagList(list)
  el.appendChild(list)
}

function renderDateTree(box: HTMLElement) {
  if (tree.length === 0) { box.innerHTML = '<div class="empty">아직 로그가 없습니다</div>'; return }

  for (const node of tree) {
    const open = openYears.has(node.year)
    const y = document.createElement('button')
    y.className = 'yr'
    y.innerHTML = `<span class="caret">${open ? '⌄' : '›'}</span><span class="sq"></span><span>${node.year}</span>`
    y.onclick = () => {
      open ? openYears.delete(node.year) : openYears.add(node.year)
      renderSidebar()
    }
    box.appendChild(y)

    if (!open) continue
    for (const m of node.months) {
      const on = view?.kind === 'month' && view.year === node.year && view.month === m
      const b = document.createElement('button')
      b.className = 'mo' + (on ? ' on' : '')
      b.innerHTML = `<span class="sq"></span><span>${String(m).padStart(2, '0')}</span>`
      b.onclick = () => pick({ kind: 'month', year: node.year, month: m })
      box.appendChild(b)
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
  if (view.kind === 'tag') {
    fb.innerHTML = `태그 <b>#${view.tag}</b> 모아보기 · <a id="back">이번 달로</a>`
    fb.querySelector<HTMLElement>('#back')!.onclick = () => pick(thisMonth())
  } else {
    fb.innerHTML = `<b>${view.year}. ${String(view.month).padStart(2, '0')}</b>`
  }
}

function renderTimeline() {
  const tl = $('timeline')
  tl.innerHTML = ''
  if (entries.length === 0) {
    tl.innerHTML = '<div class="empty">이 기간에 로그가 없습니다</div>'
    return
  }

  for (const group of groupByDate(entries)) {
    const head = document.createElement('div')
    head.className = 'datehead'; head.textContent = group.date
    tl.appendChild(head)

    for (const e of group.entries) {
      const el = document.createElement('div')
      el.className = 'entry'
      el.innerHTML = `<div class="head">
          <span class="time">${timeOf(e.created_at)}</span>
          <span class="actions">
            <button class="act tag" title="태그 달기">＃</button>
            <button class="act del" title="삭제">×</button>
          </span>
        </div>
        <div class="body"></div>`
      el.querySelector<HTMLElement>('.body')!.textContent = e.body
      el.querySelector<HTMLElement>('.del')!.onclick = () => removeEntry(e)
      el.querySelector<HTMLElement>('.tag')!.onclick = () => {
        const t = prompt('태그')?.trim()
        if (t) addTag(e, t)
      }

      if (e.tags.length > 0) {
        const box = document.createElement('div')
        box.className = 'tags'
        for (const t of e.tags) {
          const chip = document.createElement('span')
          chip.className = 'chip'; chip.textContent = '#' + t
          chip.onclick = () => pick({ kind: 'tag', tag: t })
          box.appendChild(chip)
        }
        el.appendChild(box)
      }
      tl.appendChild(el)
    }
  }
}

/* ---- input UX ---- */
$('send').onclick = submit
const ta = $('input') as HTMLTextAreaElement
ta.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
})
ta.addEventListener('input', () => {
  ta.style.height = '42px'
  ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
})
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !$('app').hidden) refresh()
})

refreshAuth()
