import {
  GAME_DURATION,
  GROUND_HEIGHT,
  PLAYER_SIZE,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  WALL_WIDTH,
} from './constants'
import type { GameState } from './types'

const COLORS = {
  background: '#1c1c28',
  ground: '#5a4a3a',
  wall: '#3a3a4a',
  text: '#ffffff',
  outline: '#000000',
}

// 足元の高さ（上が正）を Canvas の y 座標（下が正、キャラの上端）に変換する
function toScreenTop(y: number): number {
  return STAGE_HEIGHT - GROUND_HEIGHT - y - PLAYER_SIZE
}

// 1コマ分を描画する。座標はステージ座標（960×540）のまま描く
export function render(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.fillStyle = COLORS.background
  ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT)

  // 地面と左右の壁
  ctx.fillStyle = COLORS.ground
  ctx.fillRect(0, STAGE_HEIGHT - GROUND_HEIGHT, STAGE_WIDTH, GROUND_HEIGHT)
  ctx.fillStyle = COLORS.wall
  ctx.fillRect(0, 0, WALL_WIDTH, STAGE_HEIGHT - GROUND_HEIGHT)
  ctx.fillRect(STAGE_WIDTH - WALL_WIDTH, 0, WALL_WIDTH, STAGE_HEIGHT - GROUND_HEIGHT)

  // プレイヤー（ピコゲーム風の四角）
  for (const p of state.players) {
    const top = toScreenTop(p.y)
    ctx.fillStyle = p.color
    ctx.fillRect(p.x, top, PLAYER_SIZE, PLAYER_SIZE)
    ctx.strokeStyle = COLORS.outline
    ctx.lineWidth = 3
    ctx.strokeRect(p.x, top, PLAYER_SIZE, PLAYER_SIZE)
    // 目（向いている方向に寄せる）
    const eyeShift = p.facing * 4
    ctx.fillStyle = COLORS.outline
    ctx.fillRect(p.x + 10 + eyeShift, top + 12, 6, 8)
    ctx.fillRect(p.x + 24 + eyeShift, top + 12, 6, 8)
  }

  // 残り時間（切り上げで表示し、0 になった瞬間に終了）
  const remaining = Math.ceil(GAME_DURATION - state.elapsed)
  ctx.fillStyle = COLORS.text
  ctx.font = '48px "DotGothic16", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(String(remaining), STAGE_WIDTH / 2, 16)
}
