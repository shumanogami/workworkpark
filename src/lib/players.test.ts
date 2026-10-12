import { describe, expect, it } from 'vitest'
import { addLatecomers, assignPlayers, MAX_PLAYERS, PLAYER_COLORS } from './players'

const ids = (n: number) => Array.from({ length: n }, (_, i) => `id${i + 1}`)

describe('assignPlayers', () => {
  it('来た人に1番から順に番号と色を割り当てる', () => {
    const ps = assignPlayers([], ['b', 'a'])
    expect(ps).toEqual([
      { playerId: 'a', number: 1, color: PLAYER_COLORS[0] },
      { playerId: 'b', number: 2, color: PLAYER_COLORS[1] },
    ])
  })

  it('後から来た人が加わっても、すでにいる人の番号と色は変わらない', () => {
    const first = assignPlayers([], ['z'])
    const second = assignPlayers(first, ['a', 'z'])
    expect(second.find((p) => p.playerId === 'z')?.number).toBe(1)
    expect(second.find((p) => p.playerId === 'a')?.number).toBe(2)
  })

  it('抜けた人は外れ、空いた番号は次に来た人に回る', () => {
    const three = assignPlayers([], ['a', 'b', 'c'])
    const left = assignPlayers(three, ['a', 'c'])
    expect(left.map((p) => p.number)).toEqual([1, 3])

    const joined = assignPlayers(left, ['a', 'c', 'd'])
    expect(joined.find((p) => p.playerId === 'd')?.number).toBe(2)
  })

  it('8人を超えた人には割り当てない。誰かが抜けたら待っていた人が入る', () => {
    const full = assignPlayers([], ids(MAX_PLAYERS + 1))
    expect(full).toHaveLength(MAX_PLAYERS)
    const waiting = ids(MAX_PLAYERS + 1).find((id) => !full.some((p) => p.playerId === id))!

    const afterLeave = assignPlayers(
      full,
      ids(MAX_PLAYERS + 1).filter((id) => id !== full[2].playerId),
    )
    expect(afterLeave).toHaveLength(MAX_PLAYERS)
    expect(afterLeave.find((p) => p.playerId === waiting)?.number).toBe(3)
  })

  it('同じ一覧で呼び直しても結果は変わらない', () => {
    const once = assignPlayers([], ['a', 'b'])
    expect(assignPlayers(once, ['b', 'a'])).toEqual(once)
  })
})

describe('addLatecomers', () => {
  it('途中で来た人に、空いている一番小さい番号を割り当てて加える', () => {
    const match = assignPlayers([], ['a', 'b', 'c'])
    const next = addLatecomers(match, ['a', 'c', 'd'])
    expect(next.map((p) => [p.playerId, p.number])).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
      ['d', 4],
    ])
  })

  it('切れている参加者は外さず、その番号も新しく来た人に回さない', () => {
    const match = assignPlayers([], ['a', 'b'])
    const next = addLatecomers(match, ['a', 'x'])
    expect(next.find((p) => p.playerId === 'b')?.number).toBe(2)
    expect(next.find((p) => p.playerId === 'x')?.number).toBe(3)
  })

  it('だれも来ていなければ同じ配列を返す', () => {
    const match = assignPlayers([], ['a', 'b'])
    expect(addLatecomers(match, ['a'])).toBe(match)
  })

  it('満員（8人）なら加えない', () => {
    const match = assignPlayers([], ids(MAX_PLAYERS))
    expect(addLatecomers(match, ['late'])).toBe(match)
  })
})
