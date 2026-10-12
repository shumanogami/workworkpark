import type { MiniGame } from '../../platform/types'
import CoinCollectRound from './CoinCollectRound'

// コイン集め（G4）をミニゲームとして登録するための情報。いまは作成中の仮の画面（3秒で終わる）
// 完成するまでは src/platform/registry.ts の GAMES_IN_DEVELOPMENT に入っていて、試合のランダムには出ない。?game=coin-collect を付けたホスト画面と /dev/coin-collect で遊べる
export const coinCollect: MiniGame = {
  id: 'coin-collect',
  title: 'コイン集め',
  instruction: 'コインをあつめろ！',
  Round: CoinCollectRound,
}
