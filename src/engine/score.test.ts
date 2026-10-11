import { describe, expect, it } from 'vitest'
import { addPoints, applyPickups, collectItems, createScores, type Item } from './score'

const coin = (id: string, x: number): Item => ({ id, x, y: 100, width: 20, height: 20, points: 10, kind: 'coin' })
const poison = (id: string, x: number): Item => ({ id, x, y: 100, width: 20, height: 20, points: -5, kind: 'poison' })
const player = (playerId: string, x: number) => ({ playerId, x, y: 90, width: 40, height: 40 })

describe('addPoints（点数の加減）', () => {
  it('プラスなら加点、マイナスなら減点', () => {
    let s = createScores(['a'])
    s = addPoints(s, 'a', 10)
    s = addPoints(s, 'a', -3)
    expect(s.a).toBe(7)
  })

  it('点数はマイナスにならない（0 で止まる）', () => {
    let s = createScores(['a'])
    s = addPoints(s, 'a', 5)
    s = addPoints(s, 'a', -20)
    expect(s.a).toBe(0)
  })

  it('ほかの人の点数は変わらない', () => {
    const s = addPoints(createScores(['a', 'b']), 'a', 10)
    expect(s.b).toBe(0)
  })
})

describe('collectItems（アイテムを取る）', () => {
  it('触れたアイテムを取り、残りのアイテムから消える', () => {
    const r = collectItems([player('a', 90)], [coin('c1', 100), coin('c2', 400)])
    expect(r.pickups).toEqual([{ itemId: 'c1', playerId: 'a', points: 10, kind: 'coin' }])
    expect(r.remaining.map((i) => i.id)).toEqual(['c2'])
  })

  it('触れていなければ取らない（辺が接しているだけも取らない）', () => {
    const r = collectItems([player('a', 60)], [coin('c1', 100)]) // 右端 100 とアイテムの左端 100 が接するだけ
    expect(r.pickups).toEqual([])
  })

  it('2人が同時に触れたら、アイテムの中心に近い人が取る（1人だけ）', () => {
    // アイテムの中心は x=110。a の中心は 100（距離10）、b の中心は 125（距離15）
    const r = collectItems([player('b', 105), player('a', 80)], [coin('c1', 100)])
    expect(r.pickups).toEqual([{ itemId: 'c1', playerId: 'a', points: 10, kind: 'coin' }])
  })

  it('取った点数をまとめて反映する。マイナスのアイテムで 0 未満にはならない', () => {
    const r = collectItems([player('a', 90)], [coin('c1', 100), poison('p1', 110)])
    const s = applyPickups(createScores(['a']), r.pickups)
    expect(s.a).toBe(5)
    const s2 = applyPickups(createScores(['a']), [{ itemId: 'p', playerId: 'a', points: -5 }])
    expect(s2.a).toBe(0)
  })
})
