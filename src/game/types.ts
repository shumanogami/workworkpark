import type { InputMessage } from '../shared/messages'

// GameScreen に渡す参加者の情報（野上側 → 芦田側）
export type GamePlayer = {
  playerId: string
  color: string
  name?: string // キャラの頭上に出す名前。なければ出さない（物理には使わない）
}

// 1人分の状態。座標は物理計算しやすいよう「上が正」で持ち、描画するときに画面座標へ変換する
export type PlayerState = {
  playerId: string
  color: string
  x: number // キャラの左端（ステージ左端から）
  y: number // キャラの足元の高さ（地面の上面が 0）
  vx: number // 横方向の速度（右が正、ピクセル/秒）
  vy: number // 縦方向の速度（上が正、ピクセル/秒）
  facing: 1 | -1 // 向き（右が 1）。描画で目の位置に使う
  grounded: boolean // 何かの上に立っているか（ジャンプできるか）
  standingOn: string | null // 誰の頭の上に立っているか（playerId）。地面や空中なら null
  jumpHeld: boolean // 前のコマでジャンプボタンが押されていたか（押した瞬間を見分けるため）
  jumpBuffer: number // ジャンプ入力の猶予の残り時間（秒）
  stunTime: number // 弾かれて操作が効かない残り時間（秒）
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
