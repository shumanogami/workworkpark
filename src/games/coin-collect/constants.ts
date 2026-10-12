import { DEFAULT_JUMPER, type JumperConfig } from '../../engine/jumper'
import { DEFAULT_COLLISION, type JumperCollisionConfig } from '../../engine/jumperCollisions'
import { DEFAULT_HORIZONTAL } from '../../engine/scroll'

// コイン集めの定数。座標は src/engine/ と同じ（左上が原点、下向きが正）。ステージは 960×540
// 数値は仮。実際に遊んで調整する

export const STAGE_WIDTH = 960
export const STAGE_HEIGHT = 540
export const FIXED_DT = 1 / 60 // 物理は1/60秒刻み（端末の画面の速さで結果が変わらないように）

export const PLAYER_SIZE = 40
export const TIME_LIMIT = 18 // 1ラウンドの長さ（秒）。スクロールありの目標 15〜20秒の真ん中

// 高さは3段。段差は100px（ジャンプの最高到達点は約140px なので、余裕をもって届く）
export const GROUND_Y = 440 // 地面の上面
export const MID_Y = 340 // 中段の足場の上面
export const HIGH_Y = 240 // 高段の足場の上面
export const PLATFORM_HEIGHT = 16 // 足場の厚み（見た目だけ。乗る判定は上面）

// 横スクロールは共通の初期設定（60 → 16秒で300 → 20秒で500 px/秒）。野上さんの指示（2026-10-12）
export const SCROLL = DEFAULT_HORIZONTAL

// 画面の左端は「動く壁」。スクロールに遅れた人は、壁に押されて運ばれる（置いていかれても、ゲームから外れない）
// 動ける範囲は、毎コマ、画面の左端〜右端に合わせる（step.ts）
export const JUMPER: Omit<JumperConfig, 'minX' | 'maxX'> = DEFAULT_JUMPER
export const COLLISION: Omit<JumperCollisionConfig, 'minX' | 'maxX'> = {
  ...DEFAULT_COLLISION,
  minStandOverlap: PLAYER_SIZE / 4,
}

export const COIN_POINTS = 1 // コイン1枚の点数（画面には出さない）

// ---- コインと足場の並べ方（stage.ts）----
export const BLOCK_WIDTH = 480 // 1ブロックの横幅
export const FIRST_BLOCK_X = 600 // 最初のブロックの位置（スタート地点の右。全員が並んでから取りに行けるよう、手前は空ける）。スタートで全員が並べるよう、手前は空ける
export const GAP_MAX = 40 // ブロックと次のブロックの間の、ランダムな隙間の上限
export const GENERATE_AHEAD = 600 // 画面の右端よりこれだけ先まで、先に作っておく
