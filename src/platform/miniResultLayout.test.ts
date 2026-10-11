import { describe, expect, it } from 'vitest'
import { columnCount, lampStates } from './miniResultLayout'

describe('columnCount（何列に並べるか）', () => {
  it('4人までは1列、5〜8人は2列（最大2列）', () => {
    expect(columnCount(2)).toBe(1)
    expect(columnCount(4)).toBe(1)
    expect(columnCount(5)).toBe(2)
    expect(columnCount(8)).toBe(2)
  })
})

describe('lampStates（ライトの状態）', () => {
  it('勝ち数の分だけ左から点く', () => {
    expect(lampStates(0, false)).toEqual(['off', 'off', 'off'])
    expect(lampStates(2, false)).toEqual(['on', 'on', 'off'])
  })

  it('今回勝った人は、今回点いたライト（一番右の点いたもの）だけが new', () => {
    expect(lampStates(1, true)).toEqual(['new', 'off', 'off'])
    expect(lampStates(3, true)).toEqual(['on', 'on', 'new'])
  })
})
