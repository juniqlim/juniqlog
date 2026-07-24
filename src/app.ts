import { createClient, type Session } from '@supabase/supabase-js'
import { addTag as withTag } from './entry'
import { timeOf, byTag, groupByDate, type LogEntry } from './timeline'

const SUPABASE_URL = 'https://zuvifgiiahbypxsvnzvg.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dmlmZ2lpYWhieXB4c3ZuenZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NTMwNDQsImV4cCI6MjEwMDQyOTA0NH0.sVexgnQmy0YRcg3bjq0ThHB8sgPLtn1X3SDDyUbeG18'

const sb = createClient(SUPABASE_URL, SUPABASE_ANON)

let entries: LogEntry[] = []
let filterTag: string | null = null
let channel: ReturnType<typeof sb.channel> | null = null

const $ = (id: string) => document.getElementById(id)!

/* ---- realtime ---- */
function subscribe(token: string) {
  if (channel) return
  sb.realtime.setAuth(token)
  channel = sb.channel('entries-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, () => load())
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
  if (session) { showApp(); await load(); subscribe((session as Session).access_token) }
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
async function load() {
  const { data, error } = await sb.from('entries')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  if (error) { console.error(error); return }
  entries = (data ?? []) as LogEntry[]
  render()
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
  await load()
}

async function addTag(entry: LogEntry, tag: string) {
  const tagged = withTag(entry as never, tag) as unknown as LogEntry
  if (tagged.tags.length === entry.tags.length) return
  const { error } = await sb.from('entries').update({ tags: tagged.tags }).eq('id', entry.id)
  if (error) { console.error(error); return }
  await load()
}

async function removeEntry(entry: LogEntry) {
  if (!confirm('이 로그를 지울까요? (데이터는 남습니다)')) return
  const { error } = await sb.from('entries')
    .update({ deleted_at: new Date().toISOString() }).eq('id', entry.id)
  if (error) { console.error(error); return }
  await load()
}

/* ---- render ---- */
function render() {
  const tl = $('timeline'), fb = $('filter')
  if (filterTag) {
    fb.hidden = false
    fb.innerHTML = `태그 <b>#${filterTag}</b> 모아보기 · <a id="clear">전체 보기</a>`
    fb.querySelector<HTMLElement>('#clear')!.onclick = () => { filterTag = null; render() }
  } else fb.hidden = true

  tl.innerHTML = ''
  for (const group of groupByDate(byTag(entries, filterTag))) {
    const head = document.createElement('div')
    head.className = 'datehead'; head.textContent = group.date
    tl.appendChild(head)

    for (const e of group.entries) {
      const el = document.createElement('div')
      el.className = 'entry'
      el.innerHTML = `<div class="head"><span class="time">${timeOf(e.created_at)}</span>
        <button class="del" title="삭제">×</button></div>
        <div class="body"></div><div class="tags"></div>`
      el.querySelector<HTMLElement>('.body')!.textContent = e.body
      el.querySelector<HTMLElement>('.del')!.onclick = () => removeEntry(e)

      const tags = el.querySelector('.tags')!
      for (const t of e.tags) {
        const chip = document.createElement('span')
        chip.className = 'chip'; chip.textContent = '#' + t
        chip.onclick = () => { filterTag = t; render() }
        tags.appendChild(chip)
      }
      const add = document.createElement('span')
      add.className = 'chip add'; add.textContent = '+태그'
      add.onclick = () => {
        const t = prompt('태그')?.trim()
        if (t) addTag(e, t)
      }
      tags.appendChild(add)
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
  if (!document.hidden && !$('app').hidden) load()
})

refreshAuth()
