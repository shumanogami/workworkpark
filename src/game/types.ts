import type { InputMessage } from '../shared/messages'

// GameScreen に渡す参加者の情報（野上側 → 芦田側）
export type GamePlayer = {
  playerId: string
  color: string
}

// 1人分の状態。座標は物理計算しやすいよう「上が正」で持ち、描画するときに画面座標へ変換する
export type PlayerState = {
  playerId: string
  color: string
  x: number // キャラの左端（ステージ左端から）
  y: number // キャラの足元の高さ（地面の上面が 0）
  vx: number // 横方向の速度（右が正、ピクセル/秒）
  vy: number // 縦方向の速度（上が正、ピクセル/秒）
}

// ゲーム全体の状態。step 関数でこれを1コマずつ更新する
export type GameState = {
  players: PlayerState[]
  elapsed: number // 経過時間（秒）
  finished: boolean
}

// 今のボタン状態（playerId → 入力）。まだ入力が届いていない人は undefined
export type Inputs = Record<string, InputMessage | undefined>

// ゲーム終了時の各プレイヤーの高さ（playerId → 足元の高さ）
export type Heights = Record<string, number>
