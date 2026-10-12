import type { MiniGame } from '../../platform/types'
import PushOutRound from './PushOutRound'

// おしくらまんじゅう（G6）をミニゲームとして登録するための情報
// src/platform/registry.ts の MINI_GAMES に登録済み（試合のランダムに出る）。このゲームだけ遊ぶには、ホスト画面の URL に ?game=push-out を付ける（/dev/push-out でも遊べる）
export const pushOut: MiniGame = {
  id: 'push-out',
  title: 'おしくらまんじゅう',
  instruction: 'おしだせ！',
  Round: PushOutRound,
}
