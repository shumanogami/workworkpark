import { DEFAULT_JUMPER, type JumperConfig } from '../../engine/jumper'
import { DEFAULT_COLLISION, type JumperCollisionConfig } from '../../engine/jumperCollisions'
import type { ScrollConfig } from '../../engine/scroll'

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

// 横スクロール：ずっと 60 px/秒の一定（18秒で約1,080px 進む）。最初の速さがちょうどよいので、そのまま最高速度にした（野上さん 2026-10-12）
// 共通の初期設定（最高500）や、60 → 170 に上げる案は、速くてキャラが追いつけなかった
export const SCROLL: ScrollConfig = {
  axis: 'horizontal',
  direction: 1,
  initialSpeed: 60,
  phases: [], // 加速しない
}

// 動ける範囲の右端（画面の左端から）。画面の右端に居座ると、流れてくるコインを総取りできてしまうため、画面の2/3までにした（ボット計測 2周目）
export const RIGHT_LIMIT = 640

// 画面の左端は「動く壁」。スクロールに遅れた人は、壁に押されて運ばれる（置いていかれても、ゲームから外れない）
// 動ける範囲は、毎コマ、画面の左端〜右端に合わせる（step.ts）
export const JUMPER: Omit<JumperConfig, 'minX' | 'maxX'> = DEFAULT_JUMPER
export const COLLISION: Omit<JumperCollisionConfig, 'minX' | 'maxX'> = {
  ...DEFAULT_COLLISION,
  minStandOverlap: PLAYER_SIZE / 4,
}

export const COIN_POINTS = 10 // コイン1枚の点数
export const POISON_POINTS = -10 // 毒キノコ1個の点数（0 未満にはならない）。落下物避けのコインに合わせて ＋10

// ---- コインと足場の並べ方（stage.ts）----
export const BLOCK_WIDTH = 480 // 1ブロックの横幅
export const FIRST_BLOCK_X = 480 // 最初のブロックの位置（スタート地点の右。スタートで全員が並べるよう、手前は空ける）
export const GAP_MAX = 0 // ブロックと次のブロックの間の、ランダムな隙間の上限（0＝隙間なし。スクロールが遅く進む距離が短いので詰めた）
export const POISON_ON_GROUND = 1 // 1ブロックの、地面の列に置く毒キノコの数（地面のコインの一部と入れ替える）。ジャンプで越えて避ける
export const POISON_ON_PLATFORM_CHANCE = 0.5 // 1ブロックで、足場の上のコインの1つを毒キノコにする確率
export const GENERATE_AHEAD = 600 // 画面の右端よりこれだけ先まで、先に作っておく
