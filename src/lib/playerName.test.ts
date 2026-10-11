import { describe, expect, it } from 'vitest'
import { displayName, limitName, namesFromPresence, normalizeName } from './playerName'

describe('limitName', () => {
  it('8文字までは入り、9文字目以降は入らない', () => {
    expect(limitName('あいうえおかきく')).toBe('あいうえおかきく')
    expect(limitName('あいうえおかきくけ')).toBe('あいうえおかきく')
  })

  it('絵文字も1文字として数える', () => {
    expect(limitName('😀😀😀😀😀😀😀😀😀')).toBe('😀😀😀😀😀😀😀😀')
  })
})

describe('normalizeName', () => {
  it('前後の空白を取る', () => {
    expect(normalizeName('  たろう  ')).toBe('たろう')
  })

  it('空白だけなら空（＝初期値に戻す）', () => {
    expect(normalizeName('   ')).toBe('')
  })
})

describe('displayName', () => {
  it('名前がなければ「{番号}P」、あればその名前', () => {
    expect(displayName('', 2)).toBe('2P')
    expect(displayName(undefined, 3)).toBe('3P')
    expect(displayName('たろう', 1)).toBe('たろう')
  })
})

describe('namesFromPresence', () => {
  it('playerId ごとに、最後に登録した名前を取り出す', () => {
    const names = namesFromPresence({
      a: [{ playerId: 'a', name: 'たろう' }],
      b: [{ playerId: 'b', name: '古い' }, { playerId: 'b', name: 'はなこ' }],
      c: [{ playerId: 'c' }],
    })
    expect(names).toEqual({ a: 'たろう', b: 'はなこ' })
  })

  it('スマホから届いた不正な値（文字列でない・長すぎる）は整える', () => {
    const names = namesFromPresence({
      a: [{ name: 123 }],
      b: [{ name: 'とてもながいなまえですよ' }],
    })
    expect(names).toEqual({ b: 'とてもながいなま' })
  })
})
