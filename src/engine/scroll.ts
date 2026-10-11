// 画面のスクロール（横・縦）。どのゲームからも使えるよう、特定のゲームの物理・描画には依存しない
// 画面・音には触らない純粋な関数（テストしやすくするため）
//
// 考え方：「カメラ」がゲームの世界の上を一定の向きに進んでいく。offset はカメラが進んだ距離（ピクセル）。
// ゲーム側は、世界の座標（ワールド座標）でキャラや足場を置き、描くときに toScreen で画面の座標に変える

// horizontal：横スクロール、vertical：縦スクロール
export type ScrollAxis = 'horizontal' | 'vertical'

export type ScrollConfig = {
  axis: ScrollAxis
  // 進む向き。横は 1 が右へ・-1 が左へ、縦は 1 が上へ・-1 が下へ
  direction: 1 | -1
  initialSpeed: number // 始まったときの速さ（ピクセル/秒）
  acceleration: number // 1秒ごとに速くなる量（ピクセル/秒²）
  maxSpeed: number // これ以上は速くならない（ピクセル/秒）
}

// よく使う設定。横は右へ、縦は上へ進み、約16秒で最高速度になる
export const DEFAULT_HORIZONTAL: ScrollConfig = {
  axis: 'horizontal',
  direction: 1,
  initialSpeed: 60,
  acceleration: 15,
  maxSpeed: 300,
}

export const DEFAULT_VERTICAL: ScrollConfig = {
  axis: 'vertical',
  direction: 1,
  initialSpeed: 40,
  acceleration: 10,
  maxSpeed: 200,
}

export type ScrollState = {
  elapsed: number // スクロールが始まってからの時間（秒）
  speed: number // 今の速さ（ピクセル/秒）
  offset: number // カメラが進んだ距離（ピクセル、常に 0 以上）
}

// 時間 t のときの速さ。一定の割合で速くなり、最高速度で頭打ちになる
export function speedAt(config: ScrollConfig, t: number): number {
  return Math.min(config.initialSpeed + config.acceleration * Math.max(0, t), config.maxSpeed)
}

// 時間 t までに進んだ距離（速さの変化を考えた正確な値）
export function offsetAt(config: ScrollConfig, t: number): number {
  const time = Math.max(0, t)
  const { initialSpeed: v0, acceleration: a, maxSpeed: vMax } = config
  // 最高速度に届くまでの時間。加速しない設定なら届かない
  const tMax = a > 0 ? Math.max(0, (vMax - v0) / a) : Infinity
  if (time <= tMax) return v0 * time + (a * time * time) / 2
  return v0 * tMax + (a * tMax * tMax) / 2 + vMax * (time - tMax)
}

export function createScroll(config: ScrollConfig): ScrollState {
  return { elapsed: 0, speed: speedAt(config, 0), offset: 0 }
}

// dt 秒進めた次の状態。距離は時間からまとめて計算するので、何コマに分けて進めても同じ結果になる
export function stepScroll(state: ScrollState, config: ScrollConfig, dt: number): ScrollState {
  const elapsed = state.elapsed + dt
  return { elapsed, speed: speedAt(config, elapsed), offset: offsetAt(config, elapsed) }
}

// ワールド座標（画面左上を原点・下向きが正。キャンバスと同じ向き）を、画面の座標に変える
// 横スクロールで右へ進むなら、世界は左へ流れて見える。縦スクロールで上へ進むなら、世界は下へ流れて見える
export function toScreen(
  config: ScrollConfig,
  state: ScrollState,
  x: number,
  y: number,
): { x: number; y: number } {
  const shift = state.offset * config.direction
  if (config.axis === 'horizontal') return { x: x - shift, y }
  return { x, y: y + shift }
}

// 画面の範囲 [0, size) にかかるワールド座標の範囲（スクロールする向きの軸だけ）
// 画面に入っているものだけを描く・画面の外に出たものを消す、といった判定に使う
export function visibleRange(config: ScrollConfig, state: ScrollState, size: number): { from: number; to: number } {
  const shift = state.offset * config.direction
  if (config.axis === 'horizontal') return { from: shift, to: shift + size }
  return { from: -shift, to: -shift + size }
}

// くり返し模様（背景の雲や地面のタイルなど）を描くときの、ずらし量。0 以上 tileSize 未満になる
export function wrapOffset(offset: number, tileSize: number): number {
  return ((offset % tileSize) + tileSize) % tileSize
}
