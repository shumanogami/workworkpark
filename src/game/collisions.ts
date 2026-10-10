import { PLAYER_SIZE } from './constants'
import { clampToWalls } from './physics'
import type { PlayerState } from './types'

// 押し出しを繰り返す最大回数。3段以上の積み重なりでも、ずれが残らないようにする
const MAX_ITERATIONS = 4

// 小数の誤差で「上にいた」の判定が揺れないようにする許容幅（ピクセル）
const EPSILON = 0.01

// 頭の上に立つのに必要な、横方向の重なりの最小幅（ピクセル）
// これより浅く頭の端にかかっただけだと、宙に浮いて立っているように見えるため、滑り落とす
const MIN_STAND_OVERLAP = PLAYER_SIZE / 4

function overlaps(a: PlayerState, b: PlayerState): boolean {
  return Math.abs(a.x - b.x) < PLAYER_SIZE && Math.abs(a.y - b.y) < PLAYER_SIZE
}

// 前のコマで top の足元が bottom の頭より上にあったか。「上から乗った」と「横からぶつかった」を見分ける
function wasAbove(top: PlayerState, bottom: PlayerState): boolean {
  return top.y >= bottom.y + PLAYER_SIZE - EPSILON
}

// top を bottom の頭の上に立たせる。bottom が上昇中なら、top も一緒に持ち上げる
function landOn(top: PlayerState, bottom: PlayerState): PlayerState {
  return {
    ...top,
    y: bottom.y + PLAYER_SIZE,
    vy: Math.max(top.vy, bottom.vy),
    grounded: true,
    standingOn: bottom.playerId,
  }
}

// top が bottom の上から重なったとき：頭の端に浅くかかっただけなら横に滑り落とし、十分に乗っていれば立たせる
function landOrSlideOff(top: PlayerState, bottom: PlayerState): PlayerState {
  const overlapX = PLAYER_SIZE - Math.abs(top.x - bottom.x)
  if (overlapX < MIN_STAND_OVERLAP) {
    const dir = top.x < bottom.x ? -1 : 1
    const slid = clampToWalls({ ...top, x: bottom.x + dir * PLAYER_SIZE })
    // 壁に阻まれて滑り落とせない場合は、そのまま立たせる
    if (Math.abs(slid.x - bottom.x) >= PLAYER_SIZE) return slid
  }
  return landOn(top, bottom)
}

// 横に重なった2人を、重なりの半分ずつ左右に押し離す。壁際で片方が動けない分は、もう片方が引き受ける
// T9 で「弾き飛ばし」に置き換える
export function separateSideways(a: PlayerState, b: PlayerState): [PlayerState, PlayerState] {
  const aIsLeft = a.x < b.x || (a.x === b.x && a.playerId < b.playerId)
  const overlap = PLAYER_SIZE - Math.abs(a.x - b.x)
  const dir = aIsLeft ? -1 : 1 // a を押す向き

  let na = clampToWalls({ ...a, x: a.x + (dir * overlap) / 2 })
  let nb = clampToWalls({ ...b, x: b.x - (dir * overlap) / 2 })

  // 壁に阻まれてまだ重なっていれば、動けるほうをさらに押す
  const rest = PLAYER_SIZE - Math.abs(na.x - nb.x)
  if (rest > 0) {
    nb = clampToWalls({ ...nb, x: nb.x - dir * rest })
    na = clampToWalls({ ...na, x: nb.x + dir * PLAYER_SIZE })
  }
  return [na, nb]
}

// プレイヤー同士の重なりを解消する
// prev：このコマで動く前の状態（誰が上にいたかの判定に使う）、next：動いた後の状態（同じ並び順）
export function resolvePlayerCollisions(
  prev: PlayerState[],
  next: PlayerState[],
  sideways: (a: PlayerState, b: PlayerState) => [PlayerState, PlayerState] = separateSideways,
): PlayerState[] {
  const ps = [...next]

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let resolvedAny = false
    // 下にいる人から順に処理すると、積み重なりが1回の繰り返しで下から順に収まる
    const order = ps.map((_, i) => i).sort((i, j) => ps[i].y - ps[j].y)

    for (let oi = 0; oi < order.length; oi++) {
      for (let oj = oi + 1; oj < order.length; oj++) {
        const i = order[oi]
        const j = order[oj]
        if (!overlaps(ps[i], ps[j])) continue
        resolvedAny = true

        if (wasAbove(prev[j], prev[i])) {
          ps[j] = landOrSlideOff(ps[j], ps[i])
        } else if (wasAbove(prev[i], prev[j])) {
          ps[i] = landOrSlideOff(ps[i], ps[j])
        } else {
          ;[ps[i], ps[j]] = sideways(ps[i], ps[j])
        }
      }
    }
    if (!resolvedAny) break
  }
  return ps
}
