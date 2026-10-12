import { describe, expect, it } from 'vitest'
import { isAlive } from '../../engine/survival'
import { SHRINK_DELAY } from './constants'
import { createPushOutState, platformWidth, startWidth, step } from './step'

const DT = 1 / 60
const run = (s: ReturnType<typeof createPushOutState>, seconds: number, inputs = {}) => {
  for (let i = 0; i < seconds * 60 && !s.finished; i++) s = step(s, inputs, DT)
  return s
}

describe('足場の幅', () => {
  it('人数が多いほど広く始まる', () => {
    expect(startWidth(8)).toBeGreaterThan(startWidth(2))
  })
  it('始めのうちは広いまま、そのあと狭まり、0未満にならない', () => {
    expect(platformWidth(4, SHRINK_DELAY)).toBe(startWidth(4))
    expect(platformWidth(4, SHRINK_DELAY + 3)).toBeLessThan(startWidth(4))
    expect(platformWidth(4, 1000)).toBe(0)
  })
})

describe('step', () => {
  it('始めは全員が足場の上にいて、生きている', () => {
    const s = createPushOutState(['a', 'b', 'c'])
    expect(s.runners.every((r) => isAlive(s.survival, r.playerId))).toBe(true)
    expect(s.runners.every((r) => r.x >= s.platform.x && r.x + r.width <= s.platform.x + s.platform.width)).toBe(true)
  })
  it('足場が消えるまで待てば必ず決着する', () => {
    const s = run(createPushOutState(['a', 'b']), 60)
    expect(s.finished).toBe(true)
    expect(s.winners.length).toBeGreaterThan(0)
  })
  it('右端の人が右へ歩いて落ちると、残った人が勝つ', () => {
    let s = createPushOutState(['a', 'b'])
    for (let i = 0; i < 60 * 8 && !s.finished; i++) s = step(s, { b: { left: false, right: true, jump: false } }, DT)
    expect(s.finished).toBe(true)
    expect(s.winners).toEqual(['a'])
  })
  it('脱落した人は動かない', () => {
    let s = createPushOutState(['a', 'b'])
    for (let i = 0; i < 60 * 8 && !s.finished; i++) s = step(s, { b: { left: false, right: true, jump: false } }, DT)
    const a1 = s.runners.find((r) => r.playerId === 'b')!
    const s2 = step({ ...s, finished: false }, { b: { left: false, right: true, jump: false } }, DT)
    expect(s2.runners.find((r) => r.playerId === 'b')!.x).toBe(a1.x)
  })
})
