import { describe, expect, it } from 'vitest'
import { FIXED_DT, KNOCKBACK_TIME, PLAYER_SIZE } from './constants'
import { createInitialState } from './state'
import { step } from './step'
import type { GameState, Inputs } from './types'

function setup(positions: Record<string, { x: number; y: number }>): GameState {
  const ids = Object.keys(positions)
  const s = createInitialState(ids.map((playerId) => ({ playerId, color: '#fff' })))
  for (const p of s.players) {
    p.x = positions[p.playerId].x
    p.y = positions[p.playerId].y
    p.grounded = p.y === 0
  }
  return s
}

const press = (id: string, keys: { left?: boolean; right?: boolean; jump?: boolean }): Inputs => ({
  [id]: { playerId: id, left: false, right: false, jump: false, ...keys },
})

// 誰かが弾かれるまで進める（最大 seconds 秒）
function runUntilBounce(state: GameState, inputs: Inputs, seconds: number): GameState {
  let s = state
  for (let i = 0; i < Math.round(seconds / FIXED_DT); i++) {
    s = step(s, inputs, FIXED_DT)
    if (s.players.some((p) => p.stunTime > 0)) return s
  }
  return s
}
const get = (s: GameState, id: string) => s.players.find((p) => p.playerId === id)!

describe('横からぶつかると弾かれる', () => {
  it('止まっている人に歩いてぶつかると、両方が反対向きの斜め上に弾かれる（U1）', () => {
    const s = runUntilBounce(setup({ A: { x: 300, y: 0 }, B: { x: 400, y: 0 } }), press('A', { right: true }), 2)
    const a = get(s, 'A')
    const b = get(s, 'B')
    expect(a.stunTime).toBeGreaterThan(0)
    expect(b.stunTime).toBeGreaterThan(0)
    expect(a.vx).toBeLessThan(0) // A は左（来た方向）へ
    expect(b.vx).toBeGreaterThan(0) // B は右へ
    expect(a.vy).toBeGreaterThan(0) // 両方とも上向き
    expect(b.vy).toBeGreaterThan(0)
  })

  it('お互いに歩いてぶつかっても、両方が弾かれる', () => {
    const inputs = { ...press('A', { right: true }), ...press('B', { left: true }) }
    const s = runUntilBounce(setup({ A: { x: 300, y: 0 }, B: { x: 400, y: 0 } }), inputs, 2)
    expect(get(s, 'A').vx).toBeLessThan(0)
    expect(get(s, 'B').vx).toBeGreaterThan(0)
  })

  it('弾かれた後は宙に浮き、少しすると地面に戻る', () => {
    let s = runUntilBounce(setup({ A: { x: 300, y: 0 }, B: { x: 400, y: 0 } }), press('A', { right: true }), 2)
    let maxB = 0
    for (let i = 0; i < 120; i++) {
      s = step(s, {}, FIXED_DT)
      maxB = Math.max(maxB, get(s, 'B').y)
    }
    expect(maxB).toBeGreaterThan(20)
    expect(get(s, 'B').y).toBe(0)
  })

  it('どちらも横に動いていなければ、弾かずに押し離すだけ', () => {
    const s = step(setup({ A: { x: 300, y: 0 }, B: { x: 320, y: 0 } }), {}, FIXED_DT)
    expect(Math.abs(get(s, 'A').x - get(s, 'B').x)).toBeCloseTo(PLAYER_SIZE)
    expect(get(s, 'A').stunTime).toBe(0)
    expect(get(s, 'B').stunTime).toBe(0)
  })

  it('弾かれた直後は操作が効かず、時間が経つと効くようになる', () => {
    let s = runUntilBounce(setup({ A: { x: 300, y: 0 }, B: { x: 400, y: 0 } }), press('A', { right: true }), 2)
    // A は左へ飛ばされている。右を押しても、しばらくは左向きの勢いのまま
    s = step(s, press('A', { right: true }), FIXED_DT)
    expect(get(s, 'A').vx).toBeLessThan(0)
    // 操作不能の時間が過ぎると、右を押せば右へ進めるようになる
    for (let i = 0; i < Math.round((KNOCKBACK_TIME + 0.5) / FIXED_DT); i++) s = step(s, press('A', { right: true }), FIXED_DT)
    expect(get(s, 'A').vx).toBeGreaterThan(0)
  })

  it('弾かれて飛んでいる最中に別の人にぶつかると、その人も弾かれる（U3）', () => {
    // A が B にぶつかり、右へ弾かれた B が C にぶつかる
    const s0 = setup({ A: { x: 300, y: 0 }, B: { x: 400, y: 0 }, C: { x: 470, y: 0 } })
    let s = s0
    let cBounced = false
    for (let i = 0; i < 120 && !cBounced; i++) {
      s = step(s, press('A', { right: true }), FIXED_DT)
      cBounced = get(s, 'C').stunTime > 0
    }
    expect(cBounced).toBe(true)
    expect(get(s, 'C').vx).toBeGreaterThan(0)
  })

  it('上から乗った場合は弾かれない（頭の上に立つ）', () => {
    let s = setup({ A: { x: 310, y: 150 }, B: { x: 300, y: 0 } })
    for (let i = 0; i < 60; i++) s = step(s, {}, FIXED_DT)
    expect(get(s, 'A').standingOn).toBe('B')
    expect(get(s, 'A').stunTime).toBe(0)
    expect(get(s, 'B').stunTime).toBe(0)
  })

  it('上に人を乗せた人が弾かれると、上の人は乗ったまま一緒に飛ばされる（U11）', () => {
    let s = step(setup({ C: { x: 200, y: 0 }, A: { x: 300, y: PLAYER_SIZE }, B: { x: 300, y: 0 } }), {}, FIXED_DT)
    s = runUntilBounce(s, press('C', { right: true }), 2)
    for (let i = 0; i < 15; i++) s = step(s, {}, FIXED_DT)
    expect(get(s, 'B').x).toBeGreaterThan(330) // B は右へ飛ばされている
    expect(get(s, 'A').standingOn).toBe('B')
    expect(get(s, 'A').x).toBeCloseTo(get(s, 'B').x, 0) // 1px 未満のずれは許す
    expect(get(s, 'A').stunTime).toBe(0) // 上の人は操作不能にはならない
  })

  it('弾かれている間に押したジャンプは、操作が戻っても跳ばない', () => {
    let s = runUntilBounce(setup({ A: { x: 300, y: 0 }, B: { x: 400, y: 0 } }), press('A', { right: true }), 2)
    // 操作不能の間ずっとジャンプを押し、戻る直前に離す
    while (get(s, 'A').stunTime > FIXED_DT) s = step(s, press('A', { jump: true }), FIXED_DT)
    for (let i = 0; i < 60; i++) s = step(s, {}, FIXED_DT)
    expect(get(s, 'A').y).toBe(0)
  })

  it('頭の端に浅く着地して滑り落ちたときは、横の衝突として弾かれない', () => {
    // A は B の右端に浅くかかる位置へ、左向きの強い勢いで落ちてくる（ブラウザ確認で見つかった条件）
    let s = setup({ A: { x: 336, y: 40.3 }, B: { x: 300, y: 0 } })
    const a = s.players.find((p) => p.playerId === 'A')!
    a.vx = -200
    a.grounded = false
    for (let i = 0; i < 60; i++) s = step(s, {}, FIXED_DT)
    expect(get(s, 'A').stunTime).toBe(0)
    expect(get(s, 'B').stunTime).toBe(0)
    expect(get(s, 'A').y).toBe(0) // 地面に降りている
    expect(get(s, 'A').x).toBeGreaterThanOrEqual(get(s, 'B').x + PLAYER_SIZE - 0.01) // B の右隣
  })
})
