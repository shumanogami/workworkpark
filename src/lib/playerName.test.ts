import { describe, expect, it } from 'vitest'
import { displayName, isNameMessage, limitName, namesFromPresence, normalizeName, rememberNames, resolveNames } from './playerName'

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

describe('resolveNames', () => {
  it('Broadcast で届いた名前を、Presence より先に表示する', () => {
    const r = resolveNames({}, { a: 'たろう' })
    expect(r.names).toEqual({ a: 'たろう' })
    expect(r.pending).toEqual({ a: 'たろう' })
  })

  it('Presence が同じ名前に追いついたら、Broadcast の名前は取り除く', () => {
    const r = resolveNames({ a: 'たろう' }, { a: 'たろう' })
    expect(r.names).toEqual({ a: 'たろう' })
    expect(r.pending).toEqual({})
  })

  it('Presence に古い名前が遅れて届いても、新しい名前のまま', () => {
    // たろう → はなこ と続けて変え、Presence はまだ「たろう」
    const r = resolveNames({ a: 'たろう' }, { a: 'はなこ' })
    expect(r.names).toEqual({ a: 'はなこ' })
  })

  it('空にした（初期値に戻した）通知は、名前を消す。Presence が追いついたら取り除く', () => {
    expect(resolveNames({ a: 'たろう' }, { a: '' }).names).toEqual({})
    expect(resolveNames({}, { a: '' }).pending).toEqual({})
  })

  it('ほかの人の名前はそのまま', () => {
    expect(resolveNames({ b: 'じろう' }, { a: 'たろう' }).names).toEqual({ a: 'たろう', b: 'じろう' })
  })
})

describe('rememberNames（切断した人の名前を覚えておく）', () => {
  it('切れた人（presentIds にいない人）は、覚えていた名前のまま', () => {
    expect(rememberNames({ a: 'たろう', b: 'はなこ' }, { a: 'たろう' }, ['a'])).toEqual({ a: 'たろう', b: 'はなこ' })
  })

  it('つながっている人は今の名前にする。名前を消した人は消す', () => {
    expect(rememberNames({ a: 'たろう', b: 'はなこ' }, { a: 'たろ' }, ['a', 'b'])).toEqual({ a: 'たろ' })
  })

  it('変わりがなければ同じものを返す（描画し直さないため）', () => {
    const prev = { a: 'たろう' }
    expect(rememberNames(prev, { a: 'たろう' }, ['a'])).toBe(prev)
  })
})

describe('isNameMessage', () => {
  it('playerId と name が文字列なら名前の通知', () => {
    expect(isNameMessage({ playerId: 'a', name: '' })).toBe(true)
    expect(isNameMessage({ playerId: 'a' })).toBe(false)
    expect(isNameMessage(null)).toBe(false)
  })
})
