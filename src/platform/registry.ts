import { jumpTheHighest } from '../game/miniGame'
import { magmaRush } from '../games/magma-rush/miniGame'
import type { MiniGame } from './types'

// 遊べるミニゲームの一覧。新しいミニゲームを作ったら、ここに1行足す（試合の中でランダムに選ばれる候補になる）
// 並び順に意味はない（どれを遊ぶかは match.ts がランダムに決める）
export const MINI_GAMES: readonly MiniGame[] = [jumpTheHighest, magmaRush]

export function findMiniGame(id: string): MiniGame | undefined {
  return MINI_GAMES.find((g) => g.id === id)
}
