import type { MiniGame } from '../../platform/types'
import FallingItemsRound from './FallingItemsRound'

// 落下物避け（G5）をミニゲームとして登録するための情報
// src/platform/registry.ts の MINI_GAMES に登録済み（試合のランダムに出る）。このゲームだけ遊ぶには、ホスト画面の URL に ?game=falling-items を付ける（/dev/falling-items でも遊べる）
export const fallingItems: MiniGame = {
  id: 'falling-items',
  title: '落下物避け',
  instruction: 'コインを集めろ！',
  Round: FallingItemsRound,
}
