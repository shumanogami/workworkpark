import { describe, expect, it } from 'vitest'
import { InputBuffer, isInputMessage } from './inputBuffer'

const msg = (playerId: string, b: { left?: boolean; right?: boolean; jump?: boolean } = {}) => ({
  playerId,
  left: b.left ?? false,
  right: b.right ?? false,
  jump: b.jump ?? false,
})

describe('InputBuffer', () => {
  it('最新のボタン状態を人ごとに返す', () => {
    const buf = new InputBuffer()
    buf.receive(msg('a', { left: true }))
    buf.receive(msg('b', { right: true }))
    buf.receive(msg('a', { right: true }))
    const inputs = buf.take()
    expect(inputs.a).toEqual(msg('a', { right: true }))
    expect(inputs.b).toEqual(msg('b', { right: true }))
  })

  it('1コマの間に「押した」「離した」が両方届いても、そのコマはジャンプしたことになる', () => {
    const buf = new InputBuffer()
    buf.receive(msg('a', { jump: true }))
    buf.receive(msg('a', { jump: false }))
    expect(buf.take().a?.jump).toBe(true)
    // 予約は1回で使い切る。次のコマは離した状態（押した瞬間をまた見分けられるように）
    expect(buf.take().a?.jump).toBe(false)
  })

  it('押しっぱなしなら毎コマ押されたまま', () => {
    const buf = new InputBuffer()
    buf.receive(msg('a', { jump: true }))
    expect(buf.take().a?.jump).toBe(true)
    expect(buf.take().a?.jump).toBe(true)
  })

  it('keepOnly で、つながっていない人の入力（ジャンプの予約も）を忘れる', () => {
    const buf = new InputBuffer()
    buf.receive(msg('a', { right: true }))
    buf.receive(msg('b', { right: true, jump: true }))
    buf.keepOnly(['a'])
    expect(buf.take()).toEqual({ a: msg('a', { right: true }) })
  })

  it('clear で前の試合の入力を忘れる', () => {
    const buf = new InputBuffer()
    buf.receive(msg('a', { right: true, jump: true }))
    buf.clear()
    expect(buf.take()).toEqual({})
  })
})

describe('isInputMessage', () => {
  it('形が合っていれば true', () => {
    expect(isInputMessage(msg('a'))).toBe(true)
  })

  it('項目が欠けている・型が違うときは false', () => {
    expect(isInputMessage(null)).toBe(false)
    expect(isInputMessage({ playerId: 'a', left: true })).toBe(false)
    expect(isInputMessage({ ...msg('a'), jump: 'yes' })).toBe(false)
  })
})
