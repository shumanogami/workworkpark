import { describe, expect, it } from 'vitest'
import { STEPS_TO_WIN } from './match'
import { STAIRS, standingSpots, stepsBefore } from './stairsLayout'

describe('stepsBefore（上がる前の段数）', () => {
  it('勝者だけ1段下げ、ほかの人はそのまま', () => {
    expect(stepsBefore({ a: 1, b: 1, c: 0 }, ['a'])).toEqual({ a: 0, b: 1, c: 0 })
  })

  it('同時に勝った人は全員1段下げる', () => {
    expect(stepsBefore({ a: 2, b: 1 }, ['a', 'b'])).toEqual({ a: 1, b: 0 })
  })

  it('0段より下にはしない', () => {
    expect(stepsBefore({ a: 0 }, ['a'])).toEqual({ a: 0 })
  })
})

describe('standingSpots（立つ位置）', () => {
  it('段が上がるほど足もとが高くなる', () => {
    const spots = standingSpots(['a', 'b', 'c'], { a: 0, b: 1, c: 2 })
    expect(spots.a.bottom).toBeLessThan(spots.b.bottom)
    expect(spots.b.bottom).toBeLessThan(spots.c.bottom)
  })

  it('同じ段の人は番号順に左から並ぶ', () => {
    const spots = standingSpots(['a', 'b', 'c'], { a: 1, b: 0, c: 1 })
    expect(spots.a.left).toBeLessThan(spots.c.left)
    expect(spots.a.bottom).toBe(spots.c.bottom)
  })

  it('8人が同じ段にいても、全員がその段の幅に収まる', () => {
    const ids = ['1', '2', '3', '4', '5', '6', '7', '8']
    for (let step = 0; step <= STEPS_TO_WIN; step++) {
      const spots = standingSpots(ids, Object.fromEntries(ids.map((id) => [id, step])))
      const columnLeft = STAIRS.left + STAIRS.columnWidth * step
      for (const id of ids) {
        expect(spots[id].left).toBeGreaterThanOrEqual(columnLeft)
        expect(spots[id].left + STAIRS.characterSize).toBeLessThanOrEqual(columnLeft + STAIRS.columnWidth)
      }
    }
  })

  it('同じ段に5人以上いるときだけ、名前を1人おきに上へずらす', () => {
    const four = standingSpots(['1', '2', '3', '4'], {})
    expect(Object.values(four).some((s) => s.nameRaised)).toBe(false)
    const five = standingSpots(['1', '2', '3', '4', '5'], {})
    expect(['1', '2', '3', '4', '5'].map((id) => five[id].nameRaised)).toEqual([false, true, false, true, false])
  })

  it('一番上より多い段数は一番上に置く', () => {
    const spots = standingSpots(['a', 'b'], { a: STEPS_TO_WIN, b: STEPS_TO_WIN + 1 })
    expect(spots.b.bottom).toBe(spots.a.bottom)
  })
})
