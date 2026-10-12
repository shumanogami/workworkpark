import { describe, expect, it } from 'vitest'
import { carryRiders } from './carry'
import { createJumper, type Jumper } from './jumper'

type P = Jumper & { playerId: string }
const make = (playerId: string, x: number, y: number, standingOn: string | null = null): P => ({
  ...createJumper(x, y, 40),
  playerId,
  standingOn,
})
const MIN = 0
const MAX = 960

describe('頭の上の人を運ぶ', () => {
  it('下の人が右へ動いた分だけ、乗っている人も右へ運ばれる', () => {
    const prev = [make('bottom', 100, 400), make('top', 100, 360, 'bottom')]
    const next = [{ ...prev[0], x: 103 }, { ...prev[1], x: 100 }]
    const [b, t] = carryRiders(prev, next, MIN, MAX)
    expect(b.x).toBe(103)
    expect(t.x).toBe(103)
  })

  it('乗っている人が自分で動いた分も足される', () => {
    const prev = [make('bottom', 100, 400), make('top', 100, 360, 'bottom')]
    const next = [{ ...prev[0], x: 103 }, { ...prev[1], x: 98 }]
    expect(carryRiders(prev, next, MIN, MAX)[1].x).toBe(101)
  })

  it('乗っていない人は運ばれない', () => {
    const prev = [make('a', 100, 400), make('b', 300, 400)]
    const next = [{ ...prev[0], x: 110 }, prev[1]]
    expect(carryRiders(prev, next, MIN, MAX)[1].x).toBe(300)
  })

  it('3人の積み重なりは、いちばん下の動きが一番上まで伝わる（並び順に関係なく）', () => {
    const prev = [make('top', 100, 320, 'mid'), make('bottom', 100, 400), make('mid', 100, 360, 'bottom')]
    const next = [prev[0], { ...prev[1], x: 105 }, prev[2]]
    const r = carryRiders(prev, next, MIN, MAX)
    expect(r.map((p) => p.x)).toEqual([105, 105, 105])
  })

  it('壁の外へは運ばれない', () => {
    const prev = [make('bottom', 900, 400), make('top', 920, 360, 'bottom')]
    const next = [{ ...prev[0], x: 910 }, prev[1]]
    expect(carryRiders(prev, next, MIN, MAX)[1].x).toBe(920) // 960 - 40
  })

  it('入力を書き換えない', () => {
    const prev = [make('bottom', 100, 400), make('top', 100, 360, 'bottom')]
    const next = [{ ...prev[0], x: 103 }, prev[1]]
    carryRiders(prev, next, MIN, MAX)
    expect(next[1].x).toBe(100)
  })
})
