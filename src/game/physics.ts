import {
  AIR_ACCEL,
  GRAVITY,
  GROUND_ACCEL,
  JUMP_BUFFER_TIME,
  JUMP_SPEED,
  MOVE_SPEED,
  PLAYER_SIZE,
  STAGE_WIDTH,
  WALL_WIDTH,
} from './constants'
import type { InputMessage } from '../shared/messages'
import type { PlayerState } from './types'

// value を target に向けて、最大 maxDelta だけ近づける
function approach(value: number, target: number, maxDelta: number): number {
  if (value < target) return Math.min(value + maxDelta, target)
  return Math.max(value - maxDelta, target)
}

// ボタン入力を速度に反映する（位置はまだ動かさない）
export function applyInput(p: PlayerState, input: InputMessage | undefined, dt: number): PlayerState {
  const dir = (input?.right ? 1 : 0) - (input?.left ? 1 : 0)

  // 押している間ずっと最高速ではなく、加速度で徐々に近づける（急に止まる・急に最高速になる違和感を防ぐ）
  const accel = p.grounded ? GROUND_ACCEL : AIR_ACCEL
  const vx = approach(p.vx, dir * MOVE_SPEED, accel * dt)

  // ジャンプは「押した瞬間」だけ受け付ける（押しっぱなしで連続ジャンプしないように）
  const jumpNow = !!input?.jump
  const pressed = jumpNow && !p.jumpHeld
  let jumpBuffer = pressed ? JUMP_BUFFER_TIME : Math.max(0, p.jumpBuffer - dt)

  let vy = p.vy
  if (jumpBuffer > 0 && p.grounded) {
    vy = JUMP_SPEED
    jumpBuffer = 0
  }

  return {
    ...p,
    vx,
    vy,
    facing: dir === 0 ? p.facing : (dir as 1 | -1),
    jumpHeld: jumpNow,
    jumpBuffer,
  }
}

// 速度に従って位置を動かし、重力・地面・左右の壁を反映する
export function integrate(p: PlayerState, dt: number): PlayerState {
  let vx = p.vx
  let vy = p.vy - GRAVITY * dt
  let x = p.x + vx * dt
  let y = p.y + vy * dt

  // 地面：めり込んだら地面の上に戻して止める
  let grounded = false
  if (y <= 0) {
    y = 0
    vy = 0
    grounded = true
  }

  // 左右の壁：めり込んだら壁の内側に戻し、壁に向かう速度を消す
  const minX = WALL_WIDTH
  const maxX = STAGE_WIDTH - WALL_WIDTH - PLAYER_SIZE
  if (x < minX) {
    x = minX
    vx = Math.max(vx, 0)
  } else if (x > maxX) {
    x = maxX
    vx = Math.min(vx, 0)
  }

  return { ...p, x, y, vx, vy, grounded }
}
