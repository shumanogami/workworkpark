import { describe, expect, it } from 'vitest'
import { FIXED_DT, GAME_DURATION, PLAYER_SIZE, STAGE_WIDTH, WALL_WIDTH } from './constants'
import { createInitialState } from './state'
import { step } from './step'
import type { Inputs } from './types'

// 再現できる乱数（毎回同じ結果になるよう、シードから作る）
function random(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32
    return s / 2 ** 32
  }
}

describe('8人がでたらめに操作しても壊れない', () => {
  it.each([1, 2, 3, 4, 5])('シード %i', (seed) => {
    const rand = random(seed)
    const ids = Array.from({ length: 8 }, (_, i) => `p${i}`)
    let s = createInitialState(ids.map((playerId) => ({ playerId, color: '#fff' })))
    let inputs: Inputs = {}
    let worstOverlap = 0

    for (let frame = 0; frame < GAME_DURATION / FIXED_DT; frame++) {
      // 0.2秒ごとに各自のボタンを押し替える
      if (frame % 12 === 0) {
        inputs = Object.fromEntries(
          ids.map((id) => [
            id,
            { playerId: id, left: rand() < 0.4, right: rand() < 0.4, jump: rand() < 0.3 },
          ]),
        )
      }
      s = step(s, inputs, FIXED_DT)

      for (const p of s.players) {
        expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true)
        expect(p.y).toBeGreaterThanOrEqual(0)
        expect(p.x).toBeGreaterThanOrEqual(WALL_WIDTH)
        expect(p.x).toBeLessThanOrEqual(STAGE_WIDTH - WALL_WIDTH - PLAYER_SIZE)
      }
      for (let i = 0; i < s.players.length; i++) {
        for (let j = i + 1; j < s.players.length; j++) {
          const a = s.players[i]
          const b = s.players[j]
          const ox = PLAYER_SIZE - Math.abs(a.x - b.x)
          const oy = PLAYER_SIZE - Math.abs(a.y - b.y)
          if (ox > 0 && oy > 0) worstOverlap = Math.max(worstOverlap, Math.min(ox, oy))
        }
      }
    }
    // 押し出しきれない一瞬のめり込みは許すが、見た目で分かるほど（キャラの1/4）は重ならない
    expect(worstOverlap).toBeLessThan(PLAYER_SIZE / 4)
  })
})
