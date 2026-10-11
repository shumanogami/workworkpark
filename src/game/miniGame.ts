import type { MiniGame } from '../platform/types'
import JumpTheHighestRound from './JumpTheHighestRound'

// Jump the highest をミニゲームとして登録するための情報（登録は src/platform/registry.ts）
export const jumpTheHighest: MiniGame = {
  id: 'jump-the-highest',
  title: 'Jump the highest',
  instruction: '高く跳べ！',
  Round: JumpTheHighestRound,
}
