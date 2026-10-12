import { WINS_TO_CLEAR } from './match'

// ミニリザルトの並べ方とライトの状態。画面には触らない純粋な関数（テストしやすくするため）

// 1列に並べる最大の人数。これより多いときは2列にする（最大2列。8人なら4人ずつ）
export const MAX_PER_COLUMN = 4

export function columnCount(playerCount: number): 1 | 2 {
  return playerCount <= MAX_PER_COLUMN ? 1 : 2
}

// 1人分のライトの状態。on：前から点いている、new：今回点いた（点滅させる）、off：まだ点いていない
export type LampState = 'on' | 'new' | 'off'

// 勝ち数と、今回勝ったかから、ライト（WINS_TO_CLEAR の数）の状態を左から順に返す
export function lampStates(wins: number, wonThisRound: boolean): LampState[] {
  return Array.from({ length: WINS_TO_CLEAR }, (_, i) => {
    if (i >= wins) return 'off'
    if (wonThisRound && i === wins - 1) return 'new'
    return 'on'
  })
}
