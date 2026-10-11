// 画面のスクロール（横・縦）。どのゲームからも使えるよう、特定のゲームの物理・描画には依存しない
// 画面・音には触らない純粋な関数（テストしやすくするため）
//
// 考え方：「カメラ」がゲームの世界の上を一定の向きに進んでいく。offset はカメラが進んだ距離（ピクセル）。
// ゲーム側は、世界の座標（ワールド座標）でキャラや足場を置き、描くときに toScreen で画面の座標に変える

// horizontal：横スクロール、vertical：縦スクロール
export type ScrollAxis = 'horizontal' | 'vertical'

// 速さの上がり方の1段階。前の段階の上限から、acceleration の割合で maxSpeed まで速くなる
export type SpeedPhase = {
  acceleration: number // 1秒ごとに速くなる量（ピクセル/秒²）
  maxSpeed: number // この段階の上限（ピクセル/秒）。届いたら次の段階へ進む
}

export type ScrollConfig = {
  axis: ScrollAxis
  // 進む向き。横は 1 が右へ・-1 が左へ、縦は 1 が上へ・-1 が下へ
  direction: 1 | -1
  initialSpeed: number // 始まったときの速さ（ピクセル/秒）
  // 速さの上がり方。順番に進み、最後の段階の上限に届いたら、その速さのまま進む
  // 例：最初はゆっくり加速し、ある速さを超えたら急に加速する、といった変化を作れる
  phases: SpeedPhase[]
}

// よく使う設定。横は右へ、縦は上へ進む
// 横：16秒で 300 px/秒まで → そこから急に加速し、20秒で 500 px/秒（2026-10-11 芦田が試して決定）
export const DEFAULT_HORIZONTAL: ScrollConfig = {
  axis: 'horizontal',
  direction: 1,
  initialSpeed: 60,
  phases: [
    { acceleration: 15, maxSpeed: 300 },
    { acceleration: 50, maxSpeed: 500 },
  ],
}

// 縦：16秒で 200 px/秒まで → そこから急に加速し、20秒で 300 px/秒
// （1200 px/秒も試したが速すぎたため 300 にした。2026-10-11 芦田）
export const DEFAULT_VERTICAL: ScrollConfig = {
  axis: 'vertical',
  direction: 1,
  initialSpeed: 40,
  phases: [
    { acceleration: 10, maxSpeed: 200 },
    { acceleration: 25, maxSpeed: 300 },
  ],
}

export type ScrollState = {
  elapsed: number // スクロールが始まってからの時間（秒）
  speed: number // 今の速さ（ピクセル/秒）
  offset: number // カメラが進んだ距離（ピクセル、常に 0 以上）
}

// 速さのグラフを、時間で区切った区間の並びにする
// 各区間：start 秒から duration 秒の間、speed から acceleration の割合で速くなる（最後の区間は一定の速さでずっと続く）
type Segment = { start: number; duration: number; speed: number; acceleration: number }

function segments(config: ScrollConfig): Segment[] {
  const result: Segment[] = []
  let start = 0
  let speed = config.initialSpeed
  for (const phase of config.phases) {
    // 加速しない段階や、すでに上限を超えている段階は飛ばす
    if (phase.acceleration <= 0 || phase.maxSpeed <= speed) continue
    const duration = (phase.maxSpeed - speed) / phase.acceleration
    result.push({ start, duration, speed, acceleration: phase.acceleration })
    start += duration
    speed = phase.maxSpeed
  }
  result.push({ start, duration: Infinity, speed, acceleration: 0 })
  return result
}

// これ以上は速くならない速さ（最後の段階の上限）
export function topSpeed(config: ScrollConfig): number {
  const s = segments(config)
  return s[s.length - 1].speed
}

// 時間 t のときの速さ
export function speedAt(config: ScrollConfig, t: number): number {
  const time = Math.max(0, t)
  for (const seg of segments(config)) {
    if (time < seg.start + seg.duration) return seg.speed + seg.acceleration * (time - seg.start)
  }
  return topSpeed(config)
}

// 時間 t までに進んだ距離（速さの変化を考えた正確な値）
export function offsetAt(config: ScrollConfig, t: number): number {
  const time = Math.max(0, t)
  let distance = 0
  for (const seg of segments(config)) {
    const span = Math.min(time - seg.start, seg.duration)
    if (span <= 0) break
    // 一定の割合で速くなる区間の距離：初めの速さ×時間 ＋ 加速度×時間²/2
    distance += seg.speed * span + (seg.acceleration * span * span) / 2
  }
  return distance
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
