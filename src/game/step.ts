import { resolvePlayerCollisions } from './collisions'
import { GAME_DURATION } from './constants'
import { applyInput, integrate } from './physics'
import type { GameState, Inputs, PlayerState } from './types'

// 状態を dt 秒だけ進めた「次の状態」を返す純粋な関数。画面・通信には触らない（テストしやすくするため）
export function step(state: GameState, inputs: Inputs, dt: number): GameState {
  if (state.finished) return state

  const prev = state.players
  const byId = new Map(prev.map((p) => [p.playerId, p]))

  // 下にいる人から順に動かす。頭の上に乗っている人を、下の人が動いた分だけ一緒に運ぶため
  const order = prev.map((_, i) => i).sort((i, j) => prev[i].y - prev[j].y)
  const moved: PlayerState[] = [...prev]
  const dxById = new Map<string, number>()

  for (const i of order) {
    const p = prev[i]
    const support = p.standingOn ? byId.get(p.standingOn) : undefined
    const carryDx = p.standingOn ? (dxById.get(p.standingOn) ?? 0) : 0

    const next = integrate(applyInput(p, inputs[p.playerId], dt, support?.vy ?? 0), dt, carryDx)
    moved[i] = next
    // 運ばれた分も含めて記録する。3段重ねでも一番上まで同じだけ運ばれる
    dxById.set(p.playerId, next.x - p.x)
  }

  const elapsed = Math.min(state.elapsed + dt, GAME_DURATION)
  return {
    players: resolvePlayerCollisions(prev, moved),
    elapsed,
    finished: elapsed >= GAME_DURATION,
  }
}
