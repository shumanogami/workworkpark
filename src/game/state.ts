import { PLAYER_SIZE, STAGE_WIDTH, WALL_WIDTH } from './constants'
import type { GamePlayer, GameState, Heights } from './types'

// 開始時の状態。全員を地面の上に等間隔で並べる（重なると開始直後に弾かれてしまうため）
export function createInitialState(players: GamePlayer[]): GameState {
  const innerLeft = WALL_WIDTH
  const innerWidth = STAGE_WIDTH - WALL_WIDTH * 2
  const gap = innerWidth / (players.length + 1)

  return {
    players: players.map((p, i) => ({
      playerId: p.playerId,
      color: p.color,
      x: innerLeft + gap * (i + 1) - PLAYER_SIZE / 2,
      y: 0,
      vx: 0,
      vy: 0,
    })),
    elapsed: 0,
    finished: false,
  }
}

// 勝敗判定に使う各プレイヤーの高さ
export function getHeights(state: GameState): Heights {
  return Object.fromEntries(state.players.map((p) => [p.playerId, p.y]))
}
