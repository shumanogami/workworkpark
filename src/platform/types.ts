import type { ComponentType } from 'react'
import type { InputMessage } from '../shared/messages'

// ミニゲームの共通の形。どのミニゲームもこの形で作り、registry.ts に登録すると、試合の流れにそのまま入る
// ミニゲームは「1ラウンド」のことだけを考える。何勝したか・何段目か・次に何を遊ぶかは試合の進行（match.ts）が決める

// ミニゲームに渡す参加者1人分の情報
export type MiniGamePlayer = {
  playerId: string
  number: number // 1〜8
  color: string // プレイヤーの色（src/theme.ts の playerColors）
  name: string // 表示する名前（名前を付けていなければ「{番号}P」）
}

// 今のボタン状態（playerId → 入力）。切断中・まだ入力が届いていない人は undefined（何も押していない扱い）
export type RoundInputs = Record<string, InputMessage | undefined>

// 1ラウンド分の画面が受け取るもの
export type RoundProps = {
  players: MiniGamePlayer[] // このラウンドの参加者（試合の参加者全員）
  getInputs: () => RoundInputs // 今のボタン状態。ゲームの1コマごとに呼ぶ
  // ラウンドが終わったら1回だけ呼ぶ。勝った人の playerId の一覧（複数なら引き分け、全員なら全員引き分け）
  onRoundEnd: (winnerIds: string[]) => void
}

export type MiniGame = {
  id: string // 英小文字とハイフン（例：'jump-the-highest'）。フォルダ名とそろえる
  title: string // 画面に出す名前
  instruction: string // ラウンドの始めに出すひと言の指示（例：「避けろ！」「高く跳べ！」「生き残れ！」）
  // 1ラウンド分の画面。ラウンドごとに作り直される（親が key を変える）
  Round: ComponentType<RoundProps>
}
