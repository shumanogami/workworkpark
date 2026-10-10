import { resolvePlayerCollisions } from './collisions'
import { GAME_DURATION, MIN_STAND_OVERLAP, PLAYER_SIZE } from './constants'
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
  const movedById = new Map<string, PlayerState>()

  for (const i of order) {
    const p = prev[i]
    const support = p.standingOn ? byId.get(p.standingOn) : undefined
    const carryDx = p.standingOn ? (dxById.get(p.standingOn) ?? 0) : 0

    let next = integrate(applyInput(p, inputs[p.playerId], dt, support?.vy ?? 0), dt, carryDx)

    // 頭の上に立っていた人は、ジャンプしない限り、下の人が動いた後の頭の上にぴったり固定する
    // 重力で少しずつ沈んでは戻す方式だと、下の人が空中にいる間に「乗っている」状態が外れて置いていかれるため
    const supportNow = p.standingOn ? movedById.get(p.standingOn) : undefined
    if (
      supportNow &&
      next.vy <= supportNow.vy &&
      PLAYER_SIZE - Math.abs(next.x - supportNow.x) >= MIN_STAND_OVERLAP
    ) {
      next = {
        ...next,
        y: supportNow.y + PLAYER_SIZE,
        vy: supportNow.vy,
        grounded: true,
        standingOn: supportNow.playerId,
      }
    }

    moved[i] = next
    movedById.set(p.playerId, next)
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
