import type { Jumper } from './jumper'

// キャラどうしの当たり判定：Jump the highest と同じ「頭に乗れる」「横からぶつかると弾き飛ばされる」を、
// 下向きが正の座標（src/engine/ 共通）で作り直したもの。どのゲームからも使えるよう、特定のゲームの物理・描画には依存しない
// 画面・音には触らない純粋な関数（テストしやすくするため）。全員が同じ大きさの四角であることを前提にしている
//
// ゲーム側の1コマの進め方：
//   1. 生きている全員を moveJumper → updateOnPlatforms で動かす
//   2. resolveJumperCollisions(動く前の全員, 動いた後の全員, 設定) で、重なりを解消する
//   - 上から重なった：頭の上に立つ（standingOn に下の人の playerId が入り、その人の頭の上で跳べる）。頭の端に浅くかかっただけなら、横へ滑り落ちる
//   - 横から重なった：どちらかが動いていれば、お互いに反対向きの斜め上へ弾かれ、しばらく操作できない（stunTime）。止まっていれば押し離すだけ

export type JumperCollisionConfig = {
  minX: number // 動ける範囲の左端（壁の内側）
  maxX: number // 動ける範囲の右端
  bounceVx: number // 弾かれたときの横の速さ（ピクセル/秒）
  bounceVy: number // 弾かれたときの上向きの速さ（ピクセル/秒）。正の数で書く
  knockbackTime: number // 弾かれて操作できない時間（秒）
  movingThreshold: number // 「動いている」とみなす横の速さの下限（ピクセル/秒）。これより遅ければ弾かれず、押し離されるだけ
  minStandOverlap: number // 頭の上に立てる、横の重なりの最小幅（ピクセル）。これより浅いと横へ滑り落ちる
}

// Jump the highest と同じ値（キャラの大きさ 40px のとき）
export const DEFAULT_COLLISION: Omit<JumperCollisionConfig, 'minX' | 'maxX'> = {
  bounceVx: 350,
  bounceVy: 450,
  knockbackTime: 0.25,
  movingThreshold: 20,
  minStandOverlap: 10,
}

type Collider = Jumper & { playerId: string }

// 押し出しを繰り返す最大回数。3段以上の積み重なりでも、ずれが残らないようにする
const MAX_ITERATIONS = 4

// 小数の誤差で「上にいた」の判定が揺れないようにする許容幅（ピクセル）
const EPSILON = 0.01

function overlaps(a: Collider, b: Collider): boolean {
  return Math.abs(a.x - b.x) < a.width && Math.abs(a.y - b.y) < a.height
}

// 前のコマで top の足元が bottom の頭より上にあったか。「上から乗った」と「横からぶつかった」を見分ける
function wasAbove(top: Collider, bottom: Collider): boolean {
  return top.y + top.height <= bottom.y + EPSILON
}

function clampToWalls<T extends Collider>(p: T, config: JumperCollisionConfig): T {
  return { ...p, x: Math.min(Math.max(p.x, config.minX), config.maxX - p.width) }
}

// top を bottom の頭の上に立たせる。bottom が上昇中（vy < 0）なら、top も一緒に持ち上げる
function landOn<T extends Collider>(top: T, bottom: Collider): T {
  return { ...top, y: bottom.y - top.height, vy: Math.min(top.vy, bottom.vy), standingOn: bottom.playerId }
}

// top が bottom の上から重なったとき：頭の端に浅くかかっただけなら横に滑り落とし、十分に乗っていれば立たせる
function landOrSlideOff<T extends Collider>(top: T, bottom: Collider, config: JumperCollisionConfig): T {
  const overlapX = top.width - Math.abs(top.x - bottom.x)
  if (overlapX < config.minStandOverlap) {
    const dir = top.x < bottom.x ? -1 : 1
    // 下の人へ向かう横の勢いは消す。残すと次のコマでまた横から重なり、横の衝突として扱われてしまう
    const vx = dir < 0 ? Math.min(top.vx, 0) : Math.max(top.vx, 0)
    const slid = clampToWalls({ ...top, x: bottom.x + dir * top.width, vx }, config)
    // 壁に阻まれて滑り落とせない場合は、そのまま立たせる
    if (Math.abs(slid.x - bottom.x) >= top.width) return slid
  }
  return landOn(top, bottom)
}

// 横に重なった2人を、重なりの半分ずつ左右に押し離す。壁際で片方が動けない分は、もう片方が引き受ける
export function separateSideways<T extends Collider>(a: T, b: T, config: JumperCollisionConfig): [T, T] {
  const aIsLeft = a.x < b.x || (a.x === b.x && a.playerId < b.playerId)
  const overlap = a.width - Math.abs(a.x - b.x)
  const dir = aIsLeft ? -1 : 1 // a を押す向き

  let na = clampToWalls({ ...a, x: a.x + (dir * overlap) / 2 }, config)
  let nb = clampToWalls({ ...b, x: b.x - (dir * overlap) / 2 }, config)

  // 壁に阻まれてまだ重なっていれば、動けるほうをさらに押す
  const rest = a.width - Math.abs(na.x - nb.x)
  if (rest > 0) {
    nb = clampToWalls({ ...nb, x: nb.x - dir * rest }, config)
    na = clampToWalls({ ...na, x: nb.x + dir * a.width }, config)
  }
  return [na, nb]
}

// 横からぶつかった2人を、お互いに反対向きの斜め上へ弾き飛ばす
// どちらか一方でも横に動いていれば両方弾かれる（止まっている人にぶつかった場合も含む）
// 弾かれて飛んでいる最中の人も横に動いているので、別の人にぶつかればまた弾かれる
export function bounceSideways<T extends Collider>(a: T, b: T, config: JumperCollisionConfig): [T, T] {
  const [na, nb] = separateSideways(a, b, config)
  const moving = Math.abs(a.vx) > config.movingThreshold || Math.abs(b.vx) > config.movingThreshold
  if (!moving) return [na, nb]

  const aDir = na.x < nb.x ? -1 : 1
  const knock = (p: T, dir: number): T => ({
    ...p,
    vx: dir * config.bounceVx,
    vy: Math.min(p.vy, -config.bounceVy),
    standingOn: null,
    stunTime: config.knockbackTime,
  })
  return [knock(na, aDir), knock(nb, -aDir)]
}

// キャラどうしの重なりを解消する
// prev：このコマで動く前の状態（誰が上にいたかの判定に使う）、next：動いた後の状態（同じ並び順）
export function resolveJumperCollisions<T extends Collider>(prev: T[], next: T[], config: JumperCollisionConfig): T[] {
  const ps = [...next]

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let resolvedAny = false
    // 下にいる人（y が大きい人）から順に処理すると、積み重なりが1回の繰り返しで下から順に収まる
    const order = ps.map((_, i) => i).sort((i, j) => ps[j].y - ps[i].y)

    for (let oi = 0; oi < order.length; oi++) {
      for (let oj = oi + 1; oj < order.length; oj++) {
        const i = order[oi] // i のほうが下（または同じ高さ）
        const j = order[oj]
        if (!overlaps(ps[i], ps[j])) continue
        resolvedAny = true

        if (wasAbove(prev[j], prev[i])) {
          ps[j] = landOrSlideOff(ps[j], ps[i], config)
        } else if (wasAbove(prev[i], prev[j])) {
          ps[i] = landOrSlideOff(ps[i], ps[j], config)
        } else {
          ;[ps[i], ps[j]] = bounceSideways(ps[i], ps[j], config)
        }
      }
    }
    if (!resolvedAny) break
  }
  return ps
}
