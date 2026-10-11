import { DEFAULT_JUMPER, type JumperConfig } from '../../engine/jumper'
import type { ScrollConfig } from '../../engine/scroll'

// マグマラッシュの定数。座標は src/engine/ と同じ（左上が原点、下向きが正）。ステージは Jump the highest と同じ 960×540
// 数値は仮。実際に遊んで調整する

export const STAGE_WIDTH = 960
export const STAGE_HEIGHT = 540
export const RENDER_SCALE = 2 // canvas は 1920×1080 で描く（Jump the highest と同じ）
export const FIXED_DT = 1 / 60 // 物理は1/60秒刻み（端末の画面の速さで結果が変わらないように）

export const WALL_WIDTH = 20 // 左右の岩壁。プレイヤーは内側だけを動ける
export const PLAYER_SIZE = 40
// スタートの岩場の上面（ワールド座標）。マグマがここに届くまで約3.5秒。始まってすぐ脱落しないように高めにした
export const FLOOR_Y = 400

export const JUMPER: JumperConfig = {
  ...DEFAULT_JUMPER,
  minX: WALL_WIDTH,
  maxX: STAGE_WIDTH - WALL_WIDTH,
}

// 縦スクロール（＝マグマが上がる速さ）。最初はゆっくり、だんだん速くなり、最後は登りきれない速さになって勝負がつく
// 自動操作で試すと、うまく跳び移れても登る速さは 100 px/秒前後。40秒で 150、58秒で 260 になる
export const SCROLL: ScrollConfig = {
  axis: 'vertical',
  direction: 1,
  initialSpeed: 30,
  phases: [
    { acceleration: 3, maxSpeed: 150 },
    { acceleration: 6, maxSpeed: 260 },
  ],
}

// マグマの表面が画面の下端から何ピクセル上にあるか。時間とともに増え、画面の下の方から迫ってくる
export const MAGMA_DEPTH_START = 16
export const MAGMA_DEPTH_MAX = 150
export const MAGMA_DEPTH_SECONDS = 40 // この秒数で最大まで上がる

// ---- 足場の生成 ----
// 足場は「段」ごとに作る。1段に1〜4個。どの段にも、1つ下の段からジャンプで届く足場が必ずある

export const PLATFORM_HEIGHT = 16 // 足場の厚み（見た目だけ。乗る判定は上面）
// この高さ（スタートから登った距離）で一番難しくなる。マグマの速さから、およそ30〜35秒
export const HARD_HEIGHT = 4000
// ジャンプで届く範囲。ジャンプの最高到達点は約140px。余裕を持たせて、これより狭い範囲に置く
export const MAX_RISE = 105 // 段と段の高さの差の上限
export const MAX_EDGE_GAP = 90 // 足場の端と端の横の隙間の上限
