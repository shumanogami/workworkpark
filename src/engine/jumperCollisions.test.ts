import { describe, expect, it } from 'vitest'
import { createJumper, DEFAULT_JUMPER, type Jumper, type JumperConfig, moveJumper } from './jumper'
import { DEFAULT_COLLISION, type JumperCollisionConfig, resolveJumperCollisions } from './jumperCollisions'

const COLLISION: JumperCollisionConfig = { ...DEFAULT_COLLISION, minX: 0, maxX: 960 }
const SIZE = 40
type P = Jumper & { playerId: string }

// 左上が (x, y) のキャラ。y は下向きが正
function p(id: string, x: number, y: number, extra: Partial<P> = {}): P {
  return { ...createJumper(x, y, SIZE), playerId: id, ...extra }
}

describe('resolveJumperCollisions', () => {
  it('重なっていなければ何もしない', () => {
    const ps = [p('a', 100, 300), p('b', 300, 300)]
    expect(resolveJumperCollisions(ps, ps, COLLISION)).toEqual(ps)
  })

  it('上から落ちてきた人は、頭の上に立つ（下の人の playerId が standingOn に入る）', () => {
    const prev = [p('low', 100, 300), p('top', 100, 240)] // top の足元(280) は low の頭(300)より上
    const next = [p('low', 100, 300), p('top', 100, 270, { vy: 600 })] // 30px 落ちて 10px めり込んだ
    const [low, top] = resolveJumperCollisions(prev, next, COLLISION)
    expect(low.y).toBe(300)
    expect(top.y).toBe(260) // 下の人の頭の上
    expect(top.standingOn).toBe('low')
    expect(top.vy).toBe(0)
    expect(top.stunTime).toBe(0)
  })

  it('頭の端に浅くかかっただけなら、横へ滑り落ちる', () => {
    const prev = [p('low', 100, 300), p('top', 135, 240)]
    const next = [p('low', 100, 300), p('top', 135, 270, { vy: 600 })] // 横の重なりは 5px（立てる最小幅 10px 未満）
    const [, top] = resolveJumperCollisions(prev, next, COLLISION)
    expect(top.x).toBe(140) // 下の人の右隣へ
    expect(top.standingOn).toBeNull()
  })

  it('下の人が上昇中なら、頭の上の人も一緒に持ち上がる', () => {
    const prev = [p('low', 100, 300), p('top', 100, 260)]
    const next = [p('low', 100, 290, { vy: -700 }), p('top', 100, 255, { vy: 10 })]
    const [low, top] = resolveJumperCollisions(prev, next, COLLISION)
    expect(top.y).toBe(low.y - SIZE)
    expect(top.vy).toBe(-700)
  })

  it('3人の積み重なりも、下から順にきちんと収まる', () => {
    const prev = [p('a', 100, 300), p('b', 100, 260), p('c', 100, 220)]
    const next = [p('a', 100, 300), p('b', 100, 262, { vy: 100 }), p('c', 100, 224, { vy: 100 })]
    const [a, b, c] = resolveJumperCollisions(prev, next, COLLISION)
    expect(b.y).toBe(a.y - SIZE)
    expect(c.y).toBe(b.y - SIZE)
    expect(c.standingOn).toBe('b')
  })

  it('横から走ってぶつかると、お互いに反対向きの斜め上へ弾かれ、しばらく操作できない', () => {
    const prev = [p('l', 100, 300), p('r', 150, 300)]
    const next = [p('l', 120, 300, { vx: 200 }), p('r', 130, 300, { vx: -200 })] // 重なった
    const [l, r] = resolveJumperCollisions(prev, next, COLLISION)
    expect(l.vx).toBe(-DEFAULT_COLLISION.bounceVx)
    expect(r.vx).toBe(DEFAULT_COLLISION.bounceVx)
    expect(l.vy).toBe(-DEFAULT_COLLISION.bounceVy)
    expect(l.stunTime).toBe(DEFAULT_COLLISION.knockbackTime)
    expect(r.stunTime).toBe(DEFAULT_COLLISION.knockbackTime)
    expect(l.standingOn).toBeNull()
    expect(Math.abs(l.x - r.x)).toBeGreaterThanOrEqual(SIZE) // 重なりは解消される
  })

  it('止まっている人どうしが重なったときは、弾かず押し離すだけ', () => {
    const prev = [p('l', 100, 300), p('r', 130, 300)]
    const [l, r] = resolveJumperCollisions(prev, prev, COLLISION)
    expect(l.stunTime).toBe(0)
    expect(r.stunTime).toBe(0)
    expect(Math.abs(l.x - r.x)).toBeGreaterThanOrEqual(SIZE)
  })

  it('壁ぎわで弾かれても、壁の外へは出ない', () => {
    const prev = [p('l', 0, 300), p('r', 30, 300)]
    const next = [p('l', 0, 300, { vx: -100 }), p('r', 10, 300, { vx: -300 })]
    const [l, r] = resolveJumperCollisions(prev, next, COLLISION)
    expect(l.x).toBeGreaterThanOrEqual(0)
    expect(r.x).toBeGreaterThanOrEqual(0)
    expect(r.x - l.x).toBeGreaterThanOrEqual(SIZE - 0.001)
  })
})

describe('弾かれている間（stunTime）の操作', () => {
  const CONFIG: JumperConfig = { ...DEFAULT_JUMPER, minX: 0, maxX: 960 }
  const PRESS = { left: true, right: false, jump: true }

  it('弾かれている間は、左右もジャンプも受け付けず、横の勢いのまま飛ぶ', () => {
    const flying = { ...createJumper(300, 200, SIZE), vx: 350, standingOn: 'floor', stunTime: 0.25 }
    const next = moveJumper(flying, PRESS, 1 / 60, CONFIG)
    expect(next.vx).toBe(350) // 左を押しても変わらない
    expect(next.vy).toBeGreaterThan(0) // ジャンプせず、重力で落ち始める
    expect(next.stunTime).toBeCloseTo(0.25 - 1 / 60)
  })

  it('時間が過ぎると、また操作できる', () => {
    let j = { ...createJumper(300, 200, SIZE), vx: 350, stunTime: 0.05 }
    for (let i = 0; i < 6; i++) j = moveJumper(j, { left: true, right: false, jump: false }, 1 / 60, CONFIG)
    expect(j.stunTime).toBe(0)
    expect(j.vx).toBeLessThan(350) // 左を押した分、減速し始めている
  })
})
