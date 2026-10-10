import {
  AIR_ACCEL,
  CEILING_Y,
  GRAVITY,
  GROUND_ACCEL,
  JUMP_BUFFER_TIME,
  JUMP_SPEED,
  MOVE_SPEED,
  PLAYER_SIZE,
  STAGE_WIDTH,
  SUPPORT_JUMP_BONUS,
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
// supportVy：立っている相手の縦の速度。上昇中の人の頭から跳ぶと、その勢いも上乗せされる
export function applyInput(
  p: PlayerState,
  input: InputMessage | undefined,
  dt: number,
  supportVy = 0,
): PlayerState {
  // 弾かれている間は左右もジャンプも効かない（勢いのまま飛ばされる）
  const stunned = p.stunTime > 0
  const stunTime = Math.max(0, p.stunTime - dt)
  const dir = stunned ? 0 : (input?.right ? 1 : 0) - (input?.left ? 1 : 0)

  // 押している間ずっと最高速ではなく、加速度で徐々に近づける（急に止まる・急に最高速になる違和感を防ぐ）
  const accel = p.grounded ? GROUND_ACCEL : AIR_ACCEL
  const vx = stunned ? p.vx : approach(p.vx, dir * MOVE_SPEED, accel * dt)

  // ジャンプは「押した瞬間」だけ受け付ける（押しっぱなしで連続ジャンプしないように）
  const jumpNow = !!input?.jump
  const pressed = jumpNow && !p.jumpHeld
  // 弾かれている間に押したジャンプは先行入力として覚えない（操作が戻った瞬間に勝手に跳ばないように）
  let jumpBuffer = stunned ? 0 : pressed ? JUMP_BUFFER_TIME : Math.max(0, p.jumpBuffer - dt)

  let vy = p.vy
  if (jumpBuffer > 0 && p.grounded && !stunned) {
    vy = JUMP_SPEED + SUPPORT_JUMP_BONUS * Math.max(0, supportVy)
    jumpBuffer = 0
  }

  return {
    ...p,
    vx,
    vy,
    facing: dir === 0 ? p.facing : (dir as 1 | -1),
    jumpHeld: jumpNow,
    jumpBuffer,
    stunTime,
  }
}

// 速度に従って位置を動かし、重力・地面・左右の壁を反映する
// carryDx：頭の上に立っている相手がこのコマで横に動いた量。乗っている人も同じだけ運ばれる
export function integrate(p: PlayerState, dt: number, carryDx = 0): PlayerState {
  const vx = p.vx
  let vy = p.vy - GRAVITY * dt
  const x = p.x + vx * dt + carryDx
  let y = p.y + vy * dt

  // 地面：めり込んだら地面の上に戻して止める
  let grounded = false
  if (y <= 0) {
    y = 0
    vy = 0
    grounded = true
  }

  // 天井：画面の上端より上には行かない
  if (y > CEILING_Y) {
    y = CEILING_Y
    vy = Math.min(vy, 0)
  }

  // 誰の上に立っているかは、このあとのプレイヤー同士の当たり判定で決め直す
  return clampToWalls({ ...p, x, y, vx, vy, grounded, standingOn: null })
}

// 左右の壁：めり込んだら壁の内側に戻し、壁に向かう速度を消す
export function clampToWalls(p: PlayerState): PlayerState {
  const minX = WALL_WIDTH
  const maxX = STAGE_WIDTH - WALL_WIDTH - PLAYER_SIZE
  if (p.x < minX) return { ...p, x: minX, vx: Math.max(p.vx, 0) }
  if (p.x > maxX) return { ...p, x: maxX, vx: Math.min(p.vx, 0) }
  return p
}
