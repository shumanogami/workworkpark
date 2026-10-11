import { describe, expect, it } from 'vitest'
import { judgeWinners } from './judge'

describe('judgeWinners', () => {
  it('一番高い人が勝ち', () => {
    expect(judgeWinners({ a: 0, b: 120, c: 40 })).toEqual(['b'])
  })

  it('空中にいても、終了した瞬間の高さで判定する', () => {
    expect(judgeWinners({ a: 80, b: 95.3 })).toEqual(['b'])
  })

  it('一番高い人が複数いれば引き分け（全員を返す）', () => {
    expect(judgeWinners({ a: 40, b: 40, c: 0 })).toEqual(['a', 'b'])
  })

  it('計算の小さな誤差は同じ高さとみなす', () => {
    expect(judgeWinners({ a: 40, b: 40.0001 })).toEqual(['a', 'b'])
  })

  it('全員地面にいれば全員引き分け', () => {
    expect(judgeWinners({ a: 0, b: 0 })).toEqual(['a', 'b'])
  })

  it('参加者がいなければ勝者なし', () => {
    expect(judgeWinners({})).toEqual([])
  })
})
