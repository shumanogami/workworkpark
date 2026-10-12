import type { MiniGame } from '../../platform/types'
import CloudClimbRound from './CloudClimbRound'

// 雲のぼり（G2）をミニゲームとして登録するための情報。いまは作成中の仮の画面（3秒で終わる）
// 完成するまでは src/platform/registry.ts の GAMES_IN_DEVELOPMENT に入っていて、試合のランダムには出ない。?game=cloud-climb を付けたホスト画面と /dev/cloud-climb で遊べる
export const cloudClimb: MiniGame = {
  id: 'cloud-climb',
  title: '雲のぼり',
  instruction: '生き残れ！',
  Round: CloudClimbRound,
}
