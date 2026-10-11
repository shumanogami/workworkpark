import type { GameState } from './types'

// 1コマの間に起きた出来事。効果音などの演出に使う（物理の結果から読み取るだけで、物理には影響しない）
export type GameEvents = {
  jumped: string[] // ジャンプした人の playerId
  bounced: string[] // 横からぶつかって弾かれた人の playerId
}

// 前のコマと今のコマを比べて、出来事を取り出す
// - ジャンプ：前のコマで立っていて、今のコマで上向きに動き出した（弾かれて浮いた場合は除く）
// - 弾かれた：操作不能の時間が、今のコマで新しく始まった
export function detectEvents(prev: GameState, next: GameState): GameEvents {
  const before = new Map(prev.players.map((p) => [p.playerId, p]))
  const jumped: string[] = []
  const bounced: string[] = []

  for (const p of next.players) {
    const b = before.get(p.playerId)
    if (!b) continue
    const startedStun = b.stunTime === 0 && p.stunTime > 0
    if (startedStun) bounced.push(p.playerId)
    // 下の人と一緒に持ち上げられた場合（下の人と同じ速さ）はジャンプではない
    else if (b.grounded && !p.grounded && p.vy > b.vy + 1 && !p.standingOn) jumped.push(p.playerId)
  }
  return { jumped, bounced }
}
