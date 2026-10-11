import { describe, expect, it } from 'vitest'
import { type Body, MIN_PLATFORM_OVERLAP, patrol, type Platform, updateOnPlatforms } from './platforms'

const cloud: Platform = { id: 'c1', x: 100, y: 300, width: 120, height: 20 }

function body(over: Partial<Body>): Body {
  return { x: 140, y: 0, width: 40, height: 40, vx: 0, vy: 0, standingOn: null, ...over }
}

// 重力だけで1コマ進めた後のキャラ（ゲーム側の処理の代わり）
function fall(b: Body, dt = 1 / 60, gravity = 2000): Body {
  const vy = b.vy + gravity * dt
  return { ...b, x: b.x + b.vx * dt, y: b.y + vy * dt, vy }
}

describe('上から落ちてきたら乗る', () => {
  it('落ちてきて上面を通り抜けたコマで、上面の上に立つ', () => {
    let b = body({ y: 200 })
    for (let i = 0; i < 60; i++) b = updateOnPlatforms(b, fall(b), [cloud], [cloud])
    expect(b.standingOn).toBe('c1')
    expect(b.y + b.height).toBe(cloud.y)
    expect(b.vy).toBe(0)
  })

  it('とても速く落ちても、すり抜けずに乗る', () => {
    const prev = body({ y: 200, vy: 0 })
    const next = { ...prev, y: 600, vy: 5000 } // 1コマで上面を大きく通り過ぎる
    expect(updateOnPlatforms(prev, next, [cloud], [cloud]).standingOn).toBe('c1')
  })

  it('乗ったまま何コマ進めても、沈まずに立ち続ける', () => {
    let b = body({ y: cloud.y - 40, standingOn: 'c1' })
    for (let i = 0; i < 120; i++) b = updateOnPlatforms(b, fall(b), [cloud], [cloud])
    expect(b.y + b.height).toBe(cloud.y)
    expect(b.standingOn).toBe('c1')
  })

  it('1コマで2つの足場を通り抜けたら、上の足場に乗る', () => {
    const lower: Platform = { id: 'low', x: 100, y: 400, width: 120, height: 20 }
    const prev = body({ y: 200 })
    const next = { ...prev, y: 500, vy: 3000 }
    expect(updateOnPlatforms(prev, next, [lower, cloud], [lower, cloud]).standingOn).toBe('c1')
  })
})

describe('下からはすり抜ける（雲の足場）', () => {
  it('下からジャンプすると、上面を通り抜けて上に出る', () => {
    let b = body({ y: 320, vy: -900 }) // 雲の下から上向きに
    const ys: number[] = []
    for (let i = 0; i < 30; i++) {
      b = updateOnPlatforms(b, fall(b), [cloud], [cloud])
      ys.push(b.y)
    }
    expect(Math.min(...ys)).toBeLessThan(cloud.y - 40) // 雲より上まで出た
  })

  it('上昇中は、上面にかかっていても乗らない', () => {
    const prev = body({ y: cloud.y - 30 }) // 体の一部が雲にかかっている
    const next = { ...prev, y: cloud.y - 45, vy: -300 }
    expect(updateOnPlatforms(prev, next, [cloud], [cloud]).standingOn).toBeNull()
  })

  it('体が上面より下にある状態から落ちても、乗らない（下に戻っていく）', () => {
    const prev = body({ y: cloud.y - 20, vy: 50 }) // 足元が上面より下
    const next = { ...prev, y: cloud.y - 15, vy: 100 }
    expect(updateOnPlatforms(prev, next, [cloud], [cloud]).standingOn).toBeNull()
  })
})

describe('足場から降りる', () => {
  it('端から歩いて外れると、落ち始める', () => {
    let b = body({ x: 180, y: cloud.y - 40, vx: 200, standingOn: 'c1' })
    for (let i = 0; i < 30; i++) b = updateOnPlatforms(b, fall(b), [cloud], [cloud])
    expect(b.standingOn).toBeNull()
    expect(b.y + b.height).toBeGreaterThan(cloud.y)
  })

  it('端に少しだけかかって落ちてきた場合は、乗らない', () => {
    const prev = body({ x: cloud.x + cloud.width - (MIN_PLATFORM_OVERLAP - 1), y: 200 })
    const next = { ...prev, y: 400, vy: 1000 }
    expect(updateOnPlatforms(prev, next, [cloud], [cloud]).standingOn).toBeNull()
  })

  it('ジャンプすると、足場から離れる', () => {
    const prev = body({ y: cloud.y - 40, standingOn: 'c1' })
    const next = { ...prev, y: prev.y - 12, vy: -750 }
    const b = updateOnPlatforms(prev, next, [cloud], [cloud])
    expect(b.standingOn).toBeNull()
    expect(b.vy).toBe(-750)
  })
})

describe('動く足場', () => {
  it('横に動く足場に乗っていると、同じだけ横に運ばれる', () => {
    let b = body({ y: cloud.y - 40, standingOn: 'c1' })
    let p = cloud
    for (let i = 0; i < 30; i++) {
      const moved = { ...p, x: p.x + 2 }
      b = updateOnPlatforms(b, fall(b), [p], [moved])
      p = moved
    }
    expect(b.x).toBe(140 + 60)
    expect(b.standingOn).toBe('c1')
  })

  it('上下に動く足場に乗っていると、一緒に上下する', () => {
    let b = body({ y: cloud.y - 40, standingOn: 'c1' })
    let p = cloud
    for (let i = 0; i < 30; i++) {
      const moved = { ...p, y: p.y - 3 } // 上へ
      b = updateOnPlatforms(b, fall(b), [p], [moved])
      p = moved
    }
    expect(b.y + b.height).toBe(p.y)
    for (let i = 0; i < 30; i++) {
      const moved = { ...p, y: p.y + 5 } // 下へ（重力で落ちるより速くても離れない）
      b = updateOnPlatforms(b, fall(b), [p], [moved])
      p = moved
    }
    expect(b.y + b.height).toBe(p.y)
    expect(b.standingOn).toBe('c1')
  })

  it('上がってくる足場に、上から乗れる（足場の動きも考えて判定する）', () => {
    const prev = body({ y: 259, vy: 100 }) // 足元 299（雲の上面 300 のすぐ上）
    const next = { ...prev, y: 261, vy: 110 } // 足元 301
    const rising = { ...cloud, y: 290 } // 同じコマで雲が 300 → 290 へ上がり、足元を追い越した
    // 雲の今の上面（290）だけで判定すると、足元は前のコマから上面より下にいたことになり、すり抜けてしまう
    expect(updateOnPlatforms(prev, next, [cloud], [rising]).standingOn).toBe('c1')
  })
})

describe('patrol（往復）', () => {
  it('from から to へ行き、戻ってくる', () => {
    expect(patrol(100, 300, 100, 0)).toBe(100)
    expect(patrol(100, 300, 100, 1)).toBe(200)
    expect(patrol(100, 300, 100, 2)).toBe(300)
    expect(patrol(100, 300, 100, 3)).toBe(200)
    expect(patrol(100, 300, 100, 4)).toBe(100)
  })

  it('逆向き（to が from より小さい）でも往復する', () => {
    expect(patrol(300, 100, 100, 1)).toBe(200)
  })
})
