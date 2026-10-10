// スマホ⇔PC間でやり取りするメッセージの型（通信の取り決め・たたき台）。
// スマホ側・PC側の両方がこのファイルを import する。変更するときは2人で合意してから。
//
// 通信経路：Supabase Realtime のチャンネル `room:<ルームコード>`
// - Broadcast：下記のメッセージを送る
// - Presence ：接続中のスマホ（参加者）を管理する

// Broadcast のイベント名
export const EVENTS = {
  input: 'input',
  phase: 'phase',
} as const

// スマホ → PC：ボタンの状態。
// ボタンが変化したときに送り、ゲーム中は0.5秒ごとに現在の状態を送り直す。
export type InputMessage = {
  playerId: string
  left: boolean
  right: boolean
  jump: boolean
}

// PC → スマホ：今の画面の状態（スマホの表示切り替えに使う）
export type Phase = 'lobby' | 'playing' | 'result'

export type PhaseMessage = {
  phase: Phase
  // result のときのみ。複数なら引き分け
  winnerIds?: string[]
}

// Presence でスマホが自分の情報として登録する内容
export type PlayerPresence = {
  playerId: string
}
