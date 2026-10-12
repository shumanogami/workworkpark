import type { MiniGame } from '../../platform/types'
import CloudClimbRound from './CloudClimbRound'

// 雲のぼり（G2）をミニゲームとして登録するための情報
// src/platform/registry.ts の MINI_GAMES に登録済み（試合のランダムに出る）。このゲームだけ遊ぶには、ホスト画面の URL に ?game=cloud-climb を付ける（/dev/cloud-climb でも遊べる）
export const cloudClimb: MiniGame = {
  id: 'cloud-climb',
  title: '雲のぼり',
  instruction: '生き残れ！',
  Round: CloudClimbRound,
}
