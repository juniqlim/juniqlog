import { describe, it, expect } from 'vitest'
import { extractTags, parseBody, parseLines, isTag } from '../src/tags'


describe('parseLines', () => {
  it('- 로 시작하면 불릿 줄이다', () => {
    expect(parseLines('- 우유 사기')).toEqual([
      { kind: 'bullet', marker: '•', pieces: [{ type: 'text', value: '우유 사기' }] },
    ])
  })

  it('1. 로 시작하면 번호 줄이고 번호를 지킨다', () => {
    expect(parseLines('3. 셋째')).toEqual([
      { kind: 'number', marker: '3.', pieces: [{ type: 'text', value: '셋째' }] },
    ])
  })

  it('목록이 아니면 보통 줄이다', () => {
    expect(parseLines('그냥 문장')).toEqual([
      { kind: 'plain', marker: '', pieces: [{ type: 'text', value: '그냥 문장' }] },
    ])
  })

  it('여러 줄을 각각 해석한다', () => {
    const lines = parseLines('할 일\n- 하나\n- 둘')

    expect(lines.map(l => l.kind)).toEqual(['plain', 'bullet', 'bullet'])
  })

  it('목록 줄 안의 표기도 해석한다', () => {
    expect(parseLines('- **중요** 한 것')[0].pieces).toEqual([
      { type: 'bold', value: '중요' },
      { type: 'text', value: ' 한 것' },
    ])
  })
})


describe('extractTags', () => {
  it('본문에서 #태그를 뽑는다', () => {
    expect(extractTags('애플 판 돈으로 TSMC 샀다 #투자 #TSMC')).toEqual(['투자', 'TSMC'])
  })

  it('문장 중간에 있어도 뽑는다', () => {
    expect(extractTags('오늘 #투자 관련 생각을 했다')).toEqual(['투자'])
  })

  it('같은 태그는 한 번만 뽑는다', () => {
    expect(extractTags('#투자 어쩌고 #투자')).toEqual(['투자'])
  })

  it('URL 안의 #은 태그가 아니다', () => {
    expect(extractTags('https://example.com/page#top 참고')).toEqual([])
  })

  it('# 뒤에 글자가 없으면 무시한다', () => {
    expect(extractTags('그냥 # 이렇게')).toEqual([])
  })

  it('태그가 없으면 빈 목록', () => {
    expect(extractTags('평범한 로그')).toEqual([])
  })
})


describe('parseBody', () => {
  it('태그를 조각으로 나눈다', () => {
    expect(parseBody('오늘 #투자 했다')).toEqual([
      { type: 'text', value: '오늘 ' },
      { type: 'tag', value: '투자' },
      { type: 'text', value: ' 했다' },
    ])
  })

  it('URL을 링크로 뽑는다', () => {
    expect(parseBody('참고 https://example.com/a 끝')).toEqual([
      { type: 'text', value: '참고 ' },
      { type: 'link', value: 'https://example.com/a' },
      { type: 'text', value: ' 끝' },
    ])
  })

  it('굵게를 뽑는다', () => {
    expect(parseBody('이건 **중요**하다')).toEqual([
      { type: 'text', value: '이건 ' },
      { type: 'bold', value: '중요' },
      { type: 'text', value: '하다' },
    ])
  })

  it('기울임을 뽑는다', () => {
    expect(parseBody('이건 *강조*다')).toEqual([
      { type: 'text', value: '이건 ' },
      { type: 'italic', value: '강조' },
      { type: 'text', value: '다' },
    ])
  })

  it('코드를 뽑는다', () => {
    expect(parseBody('명령은 `npm run build` 이다')).toEqual([
      { type: 'text', value: '명령은 ' },
      { type: 'code', value: 'npm run build' },
      { type: 'text', value: ' 이다' },
    ])
  })

  it('취소선을 뽑는다', () => {
    expect(parseBody('~~취소~~됨')).toEqual([
      { type: 'strike', value: '취소' },
      { type: 'text', value: '됨' },
    ])
  })

  it('굵게가 기울임보다 먼저다', () => {
    expect(parseBody('**둘**')).toEqual([{ type: 'bold', value: '둘' }])
  })

  it('코드 안의 표기는 그대로 둔다', () => {
    expect(parseBody('`**a**`')).toEqual([{ type: 'code', value: '**a**' }])
  })

  it('아무 표기가 없으면 통째로 글자다', () => {
    expect(parseBody('평범한 로그')).toEqual([{ type: 'text', value: '평범한 로그' }])
  })

  it('줄바꿈을 보존한다', () => {
    expect(parseBody('첫 줄\n#태그')).toEqual([
      { type: 'text', value: '첫 줄\n' },
      { type: 'tag', value: '태그' },
    ])
  })

  it('URL 뒤의 마침표는 링크에서 뺀다', () => {
    expect(parseBody('여기 https://example.com.')).toEqual([
      { type: 'text', value: '여기 ' },
      { type: 'link', value: 'https://example.com' },
      { type: 'text', value: '.' },
    ])
  })
})

describe('isTag', () => {
  it('본문에서 뽑히는 것과 같은 모양만 태그다', () => {
    expect(isTag('일기')).toBe(true)
    expect(isTag('todo_2')).toBe(true)
    expect(isTag('한글Mixed_9')).toBe(true)
  })

  it('# 을 붙여 적어도 받아준다 — 사람이 그렇게 쓴다', () => {
    expect(isTag('#일기')).toBe(true)
  })

  it('앞뒤 공백은 태그가 아니다', () => {
    expect(isTag(' 일기')).toBe(false)
    expect(isTag('두 단어')).toBe(false)
    expect(isTag('')).toBe(false)
    expect(isTag('#')).toBe(false)
  })

  it('꾸밈글자는 받지 않는다 — 태그는 화면에 그대로 그려진다', () => {
    expect(isTag('<img src=x onerror=alert(1)>')).toBe(false)
    expect(isTag('<b>')).toBe(false)
    expect(isTag('"')).toBe(false)
    expect(isTag('a&b')).toBe(false)
  })
})
