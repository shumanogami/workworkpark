import type { MiniGame } from '../../platform/types'
import PushOutRound from './PushOutRound'

// おしくらまんじゅう（G6）をミニゲームとして登録するための情報。いまは作成中の仮の画面（3秒で終わる）
// 完成するまでは src/platform/registry.ts の GAMES_IN_DEVELOPMENT に入っていて、試合のランダムには出ない。?game=push-out を付けたホスト画面と /dev/push-out で遊べる
export const pushOut: MiniGame = {
  id: 'push-out',
  title: 'おしくらまんじゅう',
  instruction: 'おしだせ！',
  Round: PushOutRound,
}
