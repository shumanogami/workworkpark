import type { MiniGame } from '../../platform/types'
import FallingItemsRound from './FallingItemsRound'

// 落下物避け（G5）をミニゲームとして登録するための情報
// 野上さんの確認が済むまでは src/platform/registry.ts の GAMES_IN_DEVELOPMENT に入っていて、試合のランダムには出ない。?game=falling-items を付けたホスト画面と /dev/falling-items で遊べる
export const fallingItems: MiniGame = {
  id: 'falling-items',
  title: '落下物避け',
  instruction: 'コインを集めろ！',
  Round: FallingItemsRound,
}
