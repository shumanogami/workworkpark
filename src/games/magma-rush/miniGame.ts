import type { MiniGame } from '../../platform/types'
import MagmaRushRound from './MagmaRushRound'

// マグマラッシュ（G3。つばさ案）をミニゲームとして登録するための情報
// src/platform/registry.ts に登録済み（スマホで遊ぶため）。このゲームだけ遊ぶには、ホスト画面の URL に ?game=magma-rush を付ける
export const magmaRush: MiniGame = {
  id: 'magma-rush',
  title: 'マグマラッシュ',
  instruction: 'マグマから逃げろ！',
  Round: MagmaRushRound,
}
