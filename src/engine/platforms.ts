// 足場（乗れる雲など）と、足場に乗る処理。どのゲームからも使えるよう、特定のゲームの物理・描画には依存しない
// 画面・音には触らない純粋な関数（テストしやすくするため）
//
// 座標はキャンバスと同じ向き（左上が原点、下向きが正）のワールド座標。スクロールの部品（scroll.ts）と同じ
// 足場は「下からはすり抜け、上から落ちてきたときだけ乗れる」タイプ（雲の足場を想定）
//
// ゲーム側の1コマの進め方：
//   1. 足場を動かす（動く足場の場合。prev と next の2つの配列を持つ）
//   2. キャラの速度・位置を進める（重力・移動・ジャンプはゲームごとに決める）
//   3. updateOnPlatforms(前のキャラ, 進めたキャラ, 前の足場, 今の足場) で、乗る・運ばれる・降りるを決める

export type Platform = {
  id: string
  x: number // 左端
  y: number // 上面（乗る面）
  width: number
  height: number // 見た目の厚み。乗る判定には上面だけを使う
}

// 足場に乗るもの（キャラなど）。x・y は左上
export type Body = {
  x: number
  y: number
  width: number
  height: number
  vx: number
  vy: number // 下向きが正
  standingOn: string | null // 乗っている足場の id。乗っていなければ null
}

// 足場に乗っていると判定するのに必要な、横方向の重なりの最小幅（ピクセル）
// 端に1ピクセルだけかかって乗ると、宙に浮いて見えるため
export const MIN_PLATFORM_OVERLAP = 4

// 小数の誤差で「上にいた」の判定が揺れないようにする許容幅（ピクセル）
const EPSILON = 0.01

function horizontalOverlap(body: Body, p: Platform): number {
  return Math.min(body.x + body.width, p.x + p.width) - Math.max(body.x, p.x)
}

// 1コマの間に、足場の上面を上から下へ通り抜けたか（＝着地した）
// 足場が動く場合も考えて、足場から見た相対的な動きで判定する。速く落ちても、すり抜けずに必ず着地する
function crossedTop(prevBody: Body, nextBody: Body, prevP: Platform, nextP: Platform): boolean {
  const prevBottom = prevBody.y + prevBody.height
  const nextBottom = nextBody.y + nextBody.height
  return prevBottom <= prevP.y + EPSILON && nextBottom >= nextP.y
}

function standOn(body: Body, p: Platform): Body {
  return { ...body, y: p.y - body.height, vy: 0, standingOn: p.id }
}

// 足場の動きを反映して、乗っている・乗る・降りるを決める
// - prevBody：このコマで動く前のキャラ、nextBody：重力や移動で動いた後のキャラ
// - prevPlatforms / nextPlatforms：このコマで動く前・後の足場（動かない足場なら同じ配列を渡してよい）
// ジャンプして上向きに動いている間（vy < 0）は、足場から離れる
export function updateOnPlatforms(
  prevBody: Body,
  nextBody: Body,
  prevPlatforms: Platform[],
  nextPlatforms: Platform[],
): Body {
  const prevById = new Map(prevPlatforms.map((p) => [p.id, p]))

  // 乗っていた足場があれば、まずその足場の動きに合わせて運ぶ（足場が横に動けば一緒に横へ）
  let body = nextBody
  const support = prevBody.standingOn ? nextPlatforms.find((p) => p.id === prevBody.standingOn) : undefined
  const supportBefore = prevBody.standingOn ? prevById.get(prevBody.standingOn) : undefined
  if (support && supportBefore) {
    body = { ...body, x: body.x + (support.x - supportBefore.x) }
    // ジャンプしていなければ、足場の上にぴったり固定する（少しずつ沈ませて戻す方式だと、
    // 足場が動いたときに置いていかれるため）。足場の端から歩いて外れたら、ここで離れて落ち始める
    if (body.vy >= 0 && horizontalOverlap(body, support) >= MIN_PLATFORM_OVERLAP) return standOn(body, support)
  }

  // 落ちている途中で、足場の上面を上から通り抜けたら着地する。複数あれば一番上の足場に乗る
  if (body.vy >= 0) {
    let landing: Platform | null = null
    for (const p of nextPlatforms) {
      const before = prevById.get(p.id) ?? p
      if (horizontalOverlap(body, p) < MIN_PLATFORM_OVERLAP) continue
      if (!crossedTop(prevBody, body, before, p)) continue
      if (!landing || p.y < landing.y) landing = p
    }
    if (landing) return standOn(body, landing)
  }

  return { ...body, standingOn: null }
}

// 足場を一定の速さで往復させる（動く雲など）。from〜to の範囲を、speed（ピクセル/秒）で行き来する
// t は経過時間（秒）。往復の位置は時間から計算するので、何コマに分けて進めても同じ位置になる
export function patrol(from: number, to: number, speed: number, t: number): number {
  const length = Math.abs(to - from)
  if (length === 0 || speed <= 0) return from
  const traveled = (speed * t) % (length * 2)
  const along = traveled <= length ? traveled : length * 2 - traveled
  return from + Math.sign(to - from) * along
}
