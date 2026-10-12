import type { Body } from './platforms'

// 跳ねて動くキャラの物理（重力・左右移動・ジャンプ）。どのゲームからも使えるよう、特定のゲームの物理・描画には依存しない
// 画面・音には触らない純粋な関数（テストしやすくするため）
// 座標は足場の部品（platforms.ts）と同じ。左上が原点、下向きが正
//
// ゲーム側の1コマの進め方：
//   1. moveJumper(キャラ, 入力, dt, 設定) で、重力・左右移動・ジャンプを進める
//   2. updateOnPlatforms(前のキャラ, 進めたキャラ, 足場, 足場) で、足場に乗る・降りるを決める（platforms.ts）
// 足場に乗っている（standingOn が null でない）ときだけジャンプできる

export type JumperConfig = {
  gravity: number // 重力（ピクセル/秒²）
  jumpSpeed: number // ジャンプの初速（ピクセル/秒）。最高到達点は jumpSpeed² / (2 × gravity)
  moveSpeed: number // 横移動の最高速度（ピクセル/秒）
  groundAccel: number // 足場の上での横の加速度（ピクセル/秒²）
  airAccel: number // 空中での横の加速度。地上より効きにくくすると、跳んだ後に向きを変えにくくなる
  maxFallSpeed: number // 落ちる速さの上限。速すぎると目で追えないため
  jumpBufferTime: number // 着地の少し前に押したジャンプを受け付ける猶予（秒）。押したのに跳ばない、という不満を減らす
  minX: number // 動ける範囲の左端（壁の内側）
  maxX: number // 動ける範囲の右端。キャラの右端がここを越えない
}

// Jump the highest と同じ跳び心地（src/game/constants.ts の値）。ゲームごとに変えてよい
export const DEFAULT_JUMPER: Omit<JumperConfig, 'minX' | 'maxX'> = {
  gravity: 2000,
  jumpSpeed: 750,
  moveSpeed: 208,
  groundAccel: 3000,
  airAccel: 1500,
  maxFallSpeed: 900,
  jumpBufferTime: 0.1,
}

export type Jumper = Body & {
  facing: 1 | -1 // 向いている向き（1：右、-1：左）。描くときに使う
  jumpHeld: boolean // 前のコマでジャンプを押していたか（押しっぱなしで跳び続けないように）
  jumpBuffer: number // 受け付けたジャンプの残り時間（秒）
  stunTime: number // 弾かれて操作できない残り時間（秒）。この間は入力を受け付けず、横の勢いのまま飛ぶ（jumperCollisions.ts が入れる）
}

// ボタンの状態。スマホの3ボタン（左・右・ジャンプ）。undefined は何も押していない扱い
export type JumperInput = { left: boolean; right: boolean; jump: boolean } | undefined

export function createJumper(x: number, y: number, size: number): Jumper {
  return { x, y, width: size, height: size, vx: 0, vy: 0, standingOn: null, facing: 1, jumpHeld: false, jumpBuffer: 0, stunTime: 0 }
}

// ジャンプの最高到達点（足元が上がる高さ、ピクセル）
export function jumpHeight(config: Pick<JumperConfig, 'gravity' | 'jumpSpeed'>): number {
  return (config.jumpSpeed * config.jumpSpeed) / (2 * config.gravity)
}

function approach(value: number, target: number, step: number): number {
  if (value < target) return Math.min(value + step, target)
  return Math.max(value - step, target)
}

// dt 秒進めた次の状態（足場に乗る・降りるは、この後 updateOnPlatforms で決める）
// playerId などゲームごとに足した項目は、そのまま引き継ぐ
export function moveJumper<T extends Jumper>(j: T, input: JumperInput, dt: number, config: JumperConfig): T {
  // 弾かれている間は、左右もジャンプも受け付けず、横の勢いのまま飛ぶ
  const stunned = j.stunTime > 0
  const stunTime = Math.max(0, j.stunTime - dt)
  const dir = stunned ? 0 : (input?.right ? 1 : 0) - (input?.left ? 1 : 0)
  const jump = !!input?.jump

  // 押した瞬間だけ受け付ける。猶予の間に着地すれば跳ぶ
  const pressed = jump && !j.jumpHeld
  let jumpBuffer = stunned ? 0 : pressed ? config.jumpBufferTime : Math.max(0, j.jumpBuffer - dt)

  const accel = j.standingOn ? config.groundAccel : config.airAccel
  const vx = stunned ? j.vx : approach(j.vx, dir * config.moveSpeed, accel * dt)

  let vy = j.vy
  let standingOn = j.standingOn
  if (standingOn && jumpBuffer > 0) {
    vy = -config.jumpSpeed
    jumpBuffer = 0
    standingOn = null
  }
  vy = Math.min(vy + config.gravity * dt, config.maxFallSpeed)

  // 壁の内側に収める。壁にぶつかったら横の速さを 0 にする（張り付いたまま加速しないように）
  let x = j.x + vx * dt
  let nextVx = vx
  if (x < config.minX) {
    x = config.minX
    nextVx = 0
  } else if (x + j.width > config.maxX) {
    x = config.maxX - j.width
    nextVx = 0
  }

  return {
    ...j,
    x,
    y: j.y + vy * dt,
    vx: nextVx,
    vy,
    standingOn,
    facing: dir === 0 ? j.facing : dir > 0 ? 1 : -1,
    jumpHeld: jump,
    jumpBuffer,
    stunTime,
  }
}
