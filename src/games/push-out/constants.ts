// おしくらまんじゅうの定数。座標は src/engine/ と同じ（左上が原点、下向きが正）。ステージは Jump the highest と同じ 960×540
export const STAGE_WIDTH = 960
export const STAGE_HEIGHT = 540
export const WALL_WIDTH = 20
export const PLAYER_SIZE = 40
// 足場の上面（Jump the highest の地面の上面と同じ高さ）
export const GROUND_Y = 500
// マグマの表面。足場の上面より少し低くして、「縁の外は落ちる」とひと目で分かるようにする
export const MAGMA_Y = 512

// ---- 足場が狭まるしくみ（数値は仮。ボットの計測で調整する） ----
import { DEFAULT_JUMPER, type JumperConfig } from '../../engine/jumper'
import { DEFAULT_COLLISION, type JumperCollisionConfig } from '../../engine/jumperCollisions'

export const JUMPER: JumperConfig = { ...DEFAULT_JUMPER, minX: WALL_WIDTH, maxX: STAGE_WIDTH - WALL_WIDTH }
export const COLLISION: JumperCollisionConfig = {
  ...DEFAULT_COLLISION,
  minX: WALL_WIDTH,
  maxX: STAGE_WIDTH - WALL_WIDTH,
  minStandOverlap: PLAYER_SIZE / 4,
}

// 最初の足場の幅は人数で決める（多いほど広い。2人 300px、4人 400px、8人 600px）
export const START_WIDTH_BASE = 400
export const START_WIDTH_PER_PLAYER = 80
export const MIN_START_WIDTH = 500
// 足場は両端から同じ速さで狭まる。SHRINK_DELAY 秒たってから始まる
export const SHRINK_DELAY = 3
export const SHRINK_SPEED = 55 // 足場の全体の幅が減る速さ（px/秒）。両端で15pxずつ
export const PLATFORM_HEIGHT = STAGE_HEIGHT - GROUND_Y
