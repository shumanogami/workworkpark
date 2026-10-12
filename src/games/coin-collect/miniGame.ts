import type { MiniGame } from '../../platform/types'
import CoinCollectRound from './CoinCollectRound'

// コイン集め（G4）をミニゲームとして登録するための情報
// src/platform/registry.ts の MINI_GAMES に登録済み（試合のランダムに出る）。このゲームだけ遊ぶには、ホスト画面の URL に ?game=coin-collect を付ける（/dev/coin-collect でも遊べる）
export const coinCollect: MiniGame = {
  id: 'coin-collect',
  title: 'コイン集め',
  instruction: 'コインをあつめろ！',
  Round: CoinCollectRound,
}
