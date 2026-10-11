import { PLAYER_SIZE } from './constants'
import type { GameState } from './types'

// 試合の前後の演出（カウントダウン・FINISH）の時間割。画面・音には触らない純粋な関数（テストしやすくするため）

// ---- カウントダウン（T17）----

// 「3」「2」「1」をそれぞれ表示する秒数。3つ表示し終わった瞬間に試合が始まる
export const COUNT_SECONDS = 1
export const COUNTDOWN_SECONDS = COUNT_SECONDS * 3

// 試合が始まってから「START!」を表示しておく秒数（この間も動ける）
export const START_LABEL_SECONDS = 0.7

// カウントダウン開始からの経過時間 t に表示する文字。何も表示しないときは null
export function countdownLabel(t: number): string | null {
  if (t < 0) return null
  if (t < COUNTDOWN_SECONDS) return String(3 - Math.floor(t / COUNT_SECONDS))
  if (t < COUNTDOWN_SECONDS + START_LABEL_SECONDS) return 'START!'
  return null
}

// 前の描画（prevT）から今（t）の間に、表示が切り替わったか。音を鳴らすきっかけに使う
// - tick：「3」「2」「1」が出た瞬間、go：「START!」が出た瞬間
export function countdownBeat(prevT: number | null, t: number): 'tick' | 'go' | null {
  const before = prevT === null ? null : countdownLabel(prevT)
  const now = countdownLabel(t)
  if (now === before || now === null) return null
  return now === 'START!' ? 'go' : 'tick'
}

// ---- FINISH の演出（T18）----

// 「FINISH」だけを表示する秒数 → バーがせり上がる秒数 → 一番高い人の頭で止まっている秒数
export const FINISH_ONLY_SECONDS = 1
export const BAR_RISE_SECONDS = 1.5
export const BAR_HOLD_SECONDS = 1.5
export const FINISH_TOTAL_SECONDS = FINISH_ONLY_SECONDS + BAR_RISE_SECONDS + BAR_HOLD_SECONDS

// 一番高い人の頭の高さ（地面からの高さ。足元の高さ＋キャラの大きさ）
export function highestHead(state: GameState): number {
  return Math.max(0, ...state.players.map((p) => p.y + PLAYER_SIZE))
}

export type FinishView = {
  barHeight: number | null // バーの高さ（地面からの高さ）。まだ出していなければ null
  done: boolean // 演出が終わり、リザルト画面へ移る
}

// 試合終了からの経過時間 t の演出の状態。バーは地面から目標の高さまで、だんだん遅くなりながら上がる
export function finishView(t: number, targetHeight: number): FinishView {
  if (t < FINISH_ONLY_SECONDS) return { barHeight: null, done: false }
  const p = Math.min((t - FINISH_ONLY_SECONDS) / BAR_RISE_SECONDS, 1)
  const eased = 1 - (1 - p) ** 3 // 最初は速く、最後はゆっくり止まる
  return { barHeight: eased * targetHeight, done: t >= FINISH_TOTAL_SECONDS }
}
