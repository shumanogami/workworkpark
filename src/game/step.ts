import { GAME_DURATION } from './constants'
import type { GameState, Inputs } from './types'

// 状態を dt 秒だけ進めた「次の状態」を返す純粋な関数。画面・通信には触らない（テストしやすくするため）
// T6 時点では時間だけ進める。重力・移動・当たり判定は T7 以降で追加する
export function step(state: GameState, _inputs: Inputs, dt: number): GameState {
  if (state.finished) return state

  const elapsed = Math.min(state.elapsed + dt, GAME_DURATION)

  return {
    ...state,
    elapsed,
    finished: elapsed >= GAME_DURATION,
  }
}
