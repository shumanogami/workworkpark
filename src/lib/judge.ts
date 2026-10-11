import type { Heights } from '../game/types'

// 「同じ高さ」とみなす差（ピクセル）。同じ人の頭に乗っている・地面にいる等で本来同じ高さの人が、
// 計算の小さな誤差で勝ち負けに分かれないようにする
const SAME_HEIGHT_TOLERANCE = 0.5

// 終了した瞬間の高さで勝者を決める。最も高い人が複数いれば全員を返す（引き分け）
export function judgeWinners(heights: Heights): string[] {
  const entries = Object.entries(heights)
  if (entries.length === 0) return []
  const best = Math.max(...entries.map(([, h]) => h))
  return entries.filter(([, h]) => best - h <= SAME_HEIGHT_TOLERANCE).map(([id]) => id)
}
