import { describe, expect, it } from 'vitest'
import { FIXED_DT, PLAYER_SIZE } from './constants'
import { detectEvents } from './events'
import { createInitialState } from './state'
import { step } from './step'
import type { GameState, Inputs } from './types'

function setup(positions: Record<string, { x: number; y: number }>): GameState {
  const ids = Object.keys(positions)
  const s = createInitialState(ids.map((playerId) => ({ playerId, color: '#fff' })))
  for (const p of s.players) {
    p.x = positions[p.playerId].x
    p.y = positions[p.playerId].y
    p.grounded = p.y === 0
  }
  return step(s, {}, FIXED_DT)
}
const press = (id: string, keys: { left?: boolean; right?: boolean; jump?: boolean }): Inputs => ({
  [id]: { playerId: id, left: false, right: false, jump: false, ...keys },
})

// 条件を満たすまで進め、その間に起きた出来事をすべて集める
function collect(state: GameState, inputs: Inputs, frames: number) {
  let s = state
  const jumped: string[] = []
  const bounced: string[] = []
  for (let i = 0; i < frames; i++) {
    const next = step(s, inputs, FIXED_DT)
    const e = detectEvents(s, next)
    jumped.push(...e.jumped)
    bounced.push(...e.bounced)
    s = next
  }
  return { jumped, bounced }
}

describe('detectEvents', () => {
  it('ジャンプした瞬間に1回だけ「ジャンプ」になる', () => {
    const e = collect(setup({ A: { x: 300, y: 0 } }), press('A', { jump: true }), 60)
    expect(e.jumped).toEqual(['A'])
    expect(e.bounced).toEqual([])
  })

  it('何もしなければ何も起きない', () => {
    const e = collect(setup({ A: { x: 300, y: 0 } }), {}, 60)
    expect(e.jumped).toEqual([])
  })

  it('下の人のジャンプで持ち上げられた上の人は「ジャンプ」にならない', () => {
    const e = collect(setup({ A: { x: 300, y: PLAYER_SIZE }, B: { x: 300, y: 0 } }), press('B', { jump: true }), 60)
    expect(e.jumped).toEqual(['B'])
  })

  it('横からぶつかると、2人とも「弾かれた」になり、「ジャンプ」にはならない', () => {
    const e = collect(setup({ A: { x: 300, y: 0 }, B: { x: 400, y: 0 } }), press('A', { right: true }), 40)
    expect(e.bounced.sort()).toEqual(['A', 'B'])
    expect(e.jumped).toEqual([])
  })
})
