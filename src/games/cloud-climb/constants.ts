import { DEFAULT_JUMPER, type JumperConfig } from '../../engine/jumper'
import { DEFAULT_COLLISION, type JumperCollisionConfig } from '../../engine/jumperCollisions'
import type { ScrollConfig } from '../../engine/scroll'

// 雲のぼりの定数。座標は src/engine/ と同じ（左上が原点、下向きが正）。ステージは Jump the highest と同じ 960×540
// 数値は仮。ボットで測って調整する（調整ログは 仕様.md）

export const STAGE_WIDTH = 960
export const STAGE_HEIGHT = 540
export const FIXED_DT = 1 / 60

export const WALL_WIDTH = 0 // 空には壁がない。画面の左右の端が動ける範囲
export const PLAYER_SIZE = 40
export const FLOOR_Y = 400 // スタートの雲の島の上面

export const JUMPER: JumperConfig = { ...DEFAULT_JUMPER, minX: WALL_WIDTH, maxX: STAGE_WIDTH - WALL_WIDTH }

// キャラどうしの当たり判定は Jump the highest と同じ
export const COLLISION: JumperCollisionConfig = {
  ...DEFAULT_COLLISION,
  minX: WALL_WIDTH,
  maxX: STAGE_WIDTH - WALL_WIDTH,
  minStandOverlap: PLAYER_SIZE / 4,
}

// 縦スクロール（＝画面が上がる速さ）。置いていかれたら脱落。最後は登りきれない速さになって必ず決着する
// 25 px/秒から始まり、10秒で 105、約18秒で 200 px/秒
export const SCROLL: ScrollConfig = {
  axis: 'vertical',
  direction: 1,
  initialSpeed: 25,
  phases: [
    { acceleration: 8, maxSpeed: 105 },
    { acceleration: 12, maxSpeed: 200 },
  ],
}

// ---- 足場の生成（stage.ts） ----
export const PLATFORM_HEIGHT = 16
export const HARD_HEIGHT = 1800 // この高さ（スタートから登った距離）で一番難しくなる。およそ17秒
export const MAX_RISE = 105
export const MAX_EDGE_GAP = 90

// ---- 雷と鳥（hazards.ts） ----
export const FIRST_HAZARD_AT = 5 // 最初の雷・鳥が出る時刻（秒）。それまでは登ることに集中できる
export const HAZARD_INTERVAL = { start: 3.2, end: 2.0 } // 次が出るまでの間隔（秒）。時間とともに start → end
export const HAZARD_INTERVAL_SECONDS = 16 // この秒数で end になる
export const MAX_ACTIVE_HAZARDS = 2 // 同時に出る雷・鳥の数（予告中も数える）
export const THUNDER_JITTER = 40 // 雷が狙った人の真上からずれる最大の幅（px）
export const BIRD_SPEED = 260 // 鳥の速さ（px/秒）
export const BIRD_WARNING_SECONDS = 0.8 // 鳥が出る前、画面の端に「!」が出る時間
export const HIT_INSET = 4 // 雷・鳥に当たる体の枠は、見た目より片側この分だけ小さい
