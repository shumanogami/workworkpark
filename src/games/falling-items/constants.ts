import { DEFAULT_JUMPER, type JumperConfig } from '../../engine/jumper'
import { DEFAULT_COLLISION, type JumperCollisionConfig } from '../../engine/jumperCollisions'

// 落下物避けの定数。座標は src/engine/ と同じ（左上が原点、下向きが正）。ステージは Jump the highest と同じ 960×540
// 数値は仮。自動操作（ボット）で測って調整する（仕様.md の調整ログ）

export const STAGE_WIDTH = 960
export const STAGE_HEIGHT = 540
export const FIXED_DT = 1 / 60 // 物理は1/60秒刻み（端末の画面の速さで結果が変わらないように）

export const WALL_WIDTH = 20 // 左右の壁。プレイヤーは内側だけを動ける
export const GROUND_HEIGHT = 40 // 地面の厚み（Jump the highest と同じ）
export const GROUND_Y = STAGE_HEIGHT - GROUND_HEIGHT // 地面の上面
export const PLAYER_SIZE = 40

// 1ラウンドの長さ（秒）。スクロールなしのゲームは 10〜15秒
export const ROUND_SECONDS = 12

export const JUMPER: JumperConfig = {
  ...DEFAULT_JUMPER,
  minX: WALL_WIDTH,
  maxX: STAGE_WIDTH - WALL_WIDTH,
}

// キャラどうしの当たり判定は Jump the highest と同じ（頭に乗れる・横からぶつかると弾かれる）
export const COLLISION: JumperCollisionConfig = {
  ...DEFAULT_COLLISION,
  minX: WALL_WIDTH,
  maxX: STAGE_WIDTH - WALL_WIDTH,
  minStandOverlap: PLAYER_SIZE / 4,
}

// ---- 点数 ----
export const COIN_POINTS = 10
export const POISON_POINTS = -30 // 毒キノコはコイン3枚分の痛手（0 未満にはならない）

// ---- 降り方 ----
export const POISON_RATIO = 0.2 // 降ってくる物のうち毒キノコの割合（コイン8：毒キノコ2）
// 降る間隔（秒）。最初はゆっくり、ラウンドの終わりに向けて詰まる。4人のときの値で、人数に合わせて増減する（BASE_PLAYERS）
export const INTERVAL_START = 0.3
export const INTERVAL_END = 0.1
// 落ちる速さ（ピクセル/秒）。最初はゆっくり、ラウンドの終わりに向けて速くなる
export const FALL_SPEED_START = 150
export const FALL_SPEED_END = 350
export const FALL_SPEED_JITTER = 0.15 // 物ごとの速さのばらつき（±15%）。そろって落ちると取り合いが単調になる
// 前の物の近くに固めて降らせる割合と、その近さ（ピクセル）。固まって降ると、同じ場所に人が集まって取り合いになる（わいわいの元）
export const CLUSTER_RATIO = 0.4
export const CLUSTER_SPREAD = 60
export const FIRST_SPAWN_SECONDS = 0.3 // 最初の1つが降るまで
export const BASE_PLAYERS = 4 // この人数を基準に、人数が多いほど密に降らせる（最低2人分）
