// 当たり判定に使う長方形。座標はキャンバスと同じ向き（左上が原点、下向きが正）のワールド座標
// キャラ・アイテム・危険物など、どの部品でも同じ形で扱う

export type Rect = {
  x: number // 左端
  y: number // 上端
  width: number
  height: number
}

// 2つの長方形が重なっているか。辺が接しているだけ（重なりの幅が 0）は重なっていない扱い
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

// 長方形の中心
export function center(r: Rect): { x: number; y: number } {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
}
