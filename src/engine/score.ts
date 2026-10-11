import { center, overlaps, type Rect } from './rect'

// ポイント（点数）とアイテムの部品。どのゲームからも使えるよう、特定のゲームの物理・描画には依存しない
// 画面・音には触らない純粋な関数（テストしやすくするため）
//
// ゲーム側の1コマの進め方：
//   1. キャラを動かす
//   2. collectItems(キャラの一覧, 残っているアイテム) で、誰がどのアイテムを取ったかを調べる
//   3. applyPickups(点数, 取ったもの) で点数に反映する。取られたアイテムは remaining から消えている

// playerId → 点数
export type Scores = Record<string, number>

// 点数の下限。マイナスのアイテムを取っても、これより下にはならない
export const MIN_SCORE = 0

export function createScores(playerIds: string[]): Scores {
  return Object.fromEntries(playerIds.map((id) => [id, 0]))
}

// 点数を足す（points がマイナスなら引く）。0 未満にはならない
export function addPoints(scores: Scores, playerId: string, points: number): Scores {
  const next = Math.max(MIN_SCORE, (scores[playerId] ?? 0) + points)
  return { ...scores, [playerId]: next }
}

// 取れるアイテム。points がプラスなら加点、マイナスなら減点（例：コインは +10、毒キノコは -5）
export type Item = Rect & {
  id: string
  points: number
  kind?: string // 見た目や効果音を切り替えるための種類（例：'coin'、'poison'）。点数の計算には使わない
}

// アイテムを取る側（キャラなど）
export type Collector = Rect & { playerId: string }

// 誰がどのアイテムを取ったか
export type Pickup = { itemId: string; playerId: string; points: number; kind?: string }

// キャラが触れたアイテムを取る。1つのアイテムを取れるのは1人だけ
// 同じコマで複数人が触れていたら、アイテムの中心に一番近い人が取る（同じ距離なら collectors の先の人）
export function collectItems(collectors: Collector[], items: Item[]): { remaining: Item[]; pickups: Pickup[] } {
  const remaining: Item[] = []
  const pickups: Pickup[] = []
  for (const item of items) {
    const c = center(item)
    let best: Collector | null = null
    let bestDistance = Infinity
    for (const who of collectors) {
      if (!overlaps(who, item)) continue
      const w = center(who)
      const d = Math.hypot(w.x - c.x, w.y - c.y)
      if (d < bestDistance) {
        best = who
        bestDistance = d
      }
    }
    if (best) pickups.push({ itemId: item.id, playerId: best.playerId, points: item.points, kind: item.kind })
    else remaining.push(item)
  }
  return { remaining, pickups }
}

// 取ったアイテムの点数をまとめて反映する
export function applyPickups(scores: Scores, pickups: Pickup[]): Scores {
  return pickups.reduce((s, p) => addPoints(s, p.playerId, p.points), scores)
}
