import { jumpTheHighest } from '../game/miniGame'
import { cloudClimb } from '../games/cloud-climb/miniGame'
import { coinCollect } from '../games/coin-collect/miniGame'
import { fallingItems } from '../games/falling-items/miniGame'
import { magmaRush } from '../games/magma-rush/miniGame'
import { pushOut } from '../games/push-out/miniGame'
import type { MiniGame } from './types'

// 遊べるミニゲームの一覧。新しいミニゲームを作ったら、ここに1行足す（試合の中でランダムに選ばれる候補になる）
// 並び順に意味はない（どれを遊ぶかは match.ts がランダムに決める）
export const MINI_GAMES: readonly MiniGame[] = [jumpTheHighest, magmaRush]

// 作成中のミニゲーム。試合のランダムには出ない。ホスト画面の URL に ?game=<id> を付けたときだけ遊べる（スマホ操作で試すため）
// 完成してOKが出たら、ここから MINI_GAMES へ移す（1行ずつ。ほかの人のゲームの行は触らない）
export const GAMES_IN_DEVELOPMENT: readonly MiniGame[] = [cloudClimb, coinCollect, fallingItems, pushOut]

export function findMiniGame(id: string): MiniGame | undefined {
  return [...MINI_GAMES, ...GAMES_IN_DEVELOPMENT].find((g) => g.id === id)
}
