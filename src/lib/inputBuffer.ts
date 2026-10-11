import type { Inputs } from '../game/types'
import type { InputMessage } from '../shared/messages'

// PC側：スマホから届いたボタン状態を覚えておき、ゲームの1コマごとに取り出す。通信・画面には触らない
//
// ジャンプの短いタップ対策：「押した」と「離した」が1コマ（1/60秒）の間に両方届くと、
// 最新の状態だけ見ていてはジャンプを見逃す。そこで jump: true を受け取ったら「次のコマで押されていたことにする」予約を立てる
export class InputBuffer {
  private latest = new Map<string, InputMessage>()
  private jumpReserved = new Set<string>()

  receive(msg: InputMessage): void {
    this.latest.set(msg.playerId, msg)
    if (msg.jump) this.jumpReserved.add(msg.playerId)
  }

  // ゲームの1コマ分の入力を取り出す。予約したジャンプはここで使い切る
  take(): Inputs {
    const inputs: Inputs = {}
    for (const [playerId, msg] of this.latest) {
      inputs[playerId] = { ...msg, jump: msg.jump || this.jumpReserved.has(playerId) }
    }
    this.jumpReserved.clear()
    return inputs
  }

  // 試合の切り替え時に前の試合の押しっぱなしを持ち越さないよう、全部忘れる
  clear(): void {
    this.latest.clear()
    this.jumpReserved.clear()
  }
}

// 届いたデータが InputMessage の形をしているか確かめる（古いコードのスマホなど、想定外のデータで止まらないように）
export function isInputMessage(value: unknown): value is InputMessage {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.playerId === 'string' &&
    typeof v.left === 'boolean' &&
    typeof v.right === 'boolean' &&
    typeof v.jump === 'boolean'
  )
}
