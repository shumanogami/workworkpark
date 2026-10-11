import type { MiniGame } from '../../platform/types'
import MagmaRushRound from './MagmaRushRound'

// マグマラッシュ（G3。つばさ案）をミニゲームとして登録するための情報
// まだ src/platform/registry.ts には足していない（単体の開発用ページ /dev/magma-rush で遊んで OK が出たら足す）
export const magmaRush: MiniGame = {
  id: 'magma-rush',
  title: 'マグマラッシュ',
  instruction: 'マグマから逃げろ！',
  Round: MagmaRushRound,
}
