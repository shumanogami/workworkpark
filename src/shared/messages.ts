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

// 参加者1人分の情報。番号と色はPCが決めて全員に配る
export type PlayerInfo = {
  playerId: string
  number: number // 1〜8
  color: string
}

export type PhaseMessage = {
  phase: Phase
  // result のときのみ。複数なら引き分け
  winnerIds?: string[]
  // 参加者の一覧（未決定仕様 U4 の A 案）。スマホはここから自分の番号と色を探す。自分がいなければ満員
  players?: PlayerInfo[]
}

// Presence でスマホが自分の情報として登録する内容
export type PlayerPresence = {
  playerId: string
}
