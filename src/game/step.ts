import { GAME_DURATION } from './constants'
import { applyInput, integrate } from './physics'
import type { GameState, Inputs } from './types'

// 状態を dt 秒だけ進めた「次の状態」を返す純粋な関数。画面・通信には触らない（テストしやすくするため）
export function step(state: GameState, inputs: Inputs, dt: number): GameState {
  if (state.finished) return state

  const elapsed = Math.min(state.elapsed + dt, GAME_DURATION)
  const players = state.players.map((p) => integrate(applyInput(p, inputs[p.playerId], dt), dt))

  return {
    players,
    elapsed,
    finished: elapsed >= GAME_DURATION,
  }
}
