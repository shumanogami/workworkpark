import type { Jumper } from './jumper'

// 頭の上に立っている人を、下の人が横に動いた分だけ一緒に運ぶ（Jump the highest の carryDx と同じ動き）
// 画面・音には触らない純粋な関数。jumperCollisions.ts の「頭に乗る」（standingOn に下の人の playerId が入る）とセットで使う
//
// ゲーム側の1コマの進め方：全員を moveJumper → updateOnPlatforms で動かしたあと、resolveJumperCollisions の前に
//   carryRiders(動く前の全員, 動いた後の全員, 動ける範囲) を呼ぶ。resolveJumperCollisions が、運ばれた先でもう一度頭の上に立たせる
// 3人以上の積み重なりは、いちばん下の人の動きが上の人まで順に伝わる

type Rider = Jumper & { playerId: string }

// prev：このコマで動く前の全員、next：動いた後の全員（同じ並び順）。standingOn は prev のものを見る
export function carryRiders<T extends Rider>(prev: T[], next: T[], minX: number, maxX: number): T[] {
  const result = [...next]
  const dx = new Map<string, number>() // 動かし終えた人の、このコマの横の移動量（運ばれた分も含む）
  const index = new Map(prev.map((p, i) => [p.playerId, i]))

  // 下にいる人（y が大きい人）から順に処理する。下の人の移動量が決まってから、上の人に伝えるため
  const order = prev.map((_, i) => i).sort((a, b) => prev[b].y - prev[a].y)
  for (const i of order) {
    const supporter = prev[i].standingOn !== null ? index.get(prev[i].standingOn!) : undefined
    const carry = supporter !== undefined ? (dx.get(prev[supporter].playerId) ?? 0) : 0
    if (carry !== 0) {
      const x = Math.min(Math.max(result[i].x + carry, minX), maxX - result[i].width)
      result[i] = { ...result[i], x }
    }
    dx.set(prev[i].playerId, result[i].x - prev[i].x)
  }
  return result
}
