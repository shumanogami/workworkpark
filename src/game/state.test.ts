import { describe, expect, it } from 'vitest'
import { PLAYER_SIZE, STAGE_WIDTH, WALL_WIDTH } from './constants'
import { createInitialState, getHeights } from './state'

const players = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ playerId: `p${i}`, color: '#fff' }))

describe('createInitialState', () => {
  it.each([2, 8])('%i人を壁の内側・地面の上に、重ならないよう並べる', (n) => {
    const state = createInitialState(players(n))
    const xs = state.players.map((p) => p.x)

    expect(state.players).toHaveLength(n)
    for (const p of state.players) {
      expect(p.y).toBe(0)
      expect(p.x).toBeGreaterThanOrEqual(WALL_WIDTH)
      expect(p.x + PLAYER_SIZE).toBeLessThanOrEqual(STAGE_WIDTH - WALL_WIDTH)
    }
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(PLAYER_SIZE)
    }
  })
})

describe('getHeights', () => {
  it('各プレイヤーの足元の高さを返す', () => {
    const state = createInitialState(players(2))
    state.players[1].y = 123
    expect(getHeights(state)).toEqual({ p0: 0, p1: 123 })
  })
})
