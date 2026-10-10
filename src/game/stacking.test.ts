import { describe, expect, it } from 'vitest'
import { FIXED_DT, GRAVITY, JUMP_SPEED, PLAYER_SIZE } from './constants'
import { createInitialState } from './state'
import { step } from './step'
import type { GameState, Inputs } from './types'

// A・B・C の3人。テストごとに位置を置き直す
function setup(positions: Record<string, { x: number; y: number }>): GameState {
  const ids = Object.keys(positions)
  const s = createInitialState(ids.map((playerId) => ({ playerId, color: '#fff' })))
  for (const p of s.players) {
    p.x = positions[p.playerId].x
    p.y = positions[p.playerId].y
    p.grounded = p.y === 0
  }
  // 1コマ進めて、誰が誰の上に立っているか（standingOn）を確定させてから使う
  return step(s, {}, FIXED_DT)
}

const press = (id: string, keys: { left?: boolean; right?: boolean; jump?: boolean }): Inputs => ({
  [id]: { playerId: id, left: false, right: false, jump: false, ...keys },
})

function run(state: GameState, inputs: Inputs, seconds: number): GameState {
  let s = state
  for (let i = 0; i < Math.round(seconds / FIXED_DT); i++) s = step(s, inputs, FIXED_DT)
  return s
}
const get = (s: GameState, id: string) => s.players.find((p) => p.playerId === id)!

describe('頭の上に乗る', () => {
  it('上から落ちてきた人は、下の人の頭の上に着地する', () => {
    const s = run(setup({ A: { x: 300, y: 150 }, B: { x: 310, y: 0 } }), {}, 1)
    expect(get(s, 'A').y).toBeCloseTo(PLAYER_SIZE)
    expect(get(s, 'A').grounded).toBe(true)
    expect(get(s, 'A').standingOn).toBe('B')
  })

  it('頭の上に立ったまま、ずり落ちない', () => {
    const s = run(setup({ A: { x: 300, y: PLAYER_SIZE }, B: { x: 300, y: 0 } }), {}, 3)
    expect(get(s, 'A').y).toBeCloseTo(PLAYER_SIZE)
    expect(get(s, 'B').y).toBe(0)
  })

  it('3段重ねでも崩れない', () => {
    const s = run(
      setup({ A: { x: 300, y: 0 }, B: { x: 300, y: PLAYER_SIZE }, C: { x: 300, y: PLAYER_SIZE * 2 } }),
      {},
      3,
    )
    expect(get(s, 'B').y).toBeCloseTo(PLAYER_SIZE)
    expect(get(s, 'C').y).toBeCloseTo(PLAYER_SIZE * 2)
    expect(get(s, 'C').standingOn).toBe('B')
  })

  it('頭の上から歩いて降りると、地面まで落ちる', () => {
    const s = run(setup({ A: { x: 300, y: PLAYER_SIZE }, B: { x: 300, y: 0 } }), press('A', { right: true }), 1)
    expect(get(s, 'A').y).toBe(0)
    expect(get(s, 'A').x).toBeGreaterThanOrEqual(get(s, 'B').x + PLAYER_SIZE - 0.01)
  })
})

describe('下の人が動くと、上の人も一緒に運ばれる', () => {
  it('下の人が右へ歩くと、上の人も同じだけ右へ動く', () => {
    const before = setup({ A: { x: 300, y: PLAYER_SIZE }, B: { x: 300, y: 0 } })
    const s = run(before, press('B', { right: true }), 0.5)
    expect(get(s, 'B').x).toBeGreaterThan(400)
    expect(get(s, 'A').x).toBeCloseTo(get(s, 'B').x)
    expect(get(s, 'A').standingOn).toBe('B')
  })

  it('3段重ねで一番下が動くと、一番上まで運ばれる', () => {
    const before = setup({ A: { x: 300, y: 0 }, B: { x: 300, y: PLAYER_SIZE }, C: { x: 300, y: PLAYER_SIZE * 2 } })
    const s = run(before, press('A', { left: true }), 0.5)
    expect(get(s, 'A').x).toBeLessThan(200)
    expect(get(s, 'C').x).toBeCloseTo(get(s, 'A').x)
  })

  it('下の人がジャンプすると、上の人も持ち上げられる', () => {
    let s = setup({ A: { x: 300, y: PLAYER_SIZE }, B: { x: 300, y: 0 } })
    let maxA = 0
    for (let i = 0; i < 40; i++) {
      s = step(s, press('B', { jump: true }), FIXED_DT)
      maxA = Math.max(maxA, get(s, 'A').y)
    }
    expect(maxA).toBeGreaterThan(PLAYER_SIZE + 100)
    // 着地後も頭の上に乗ったまま
    s = run(s, {}, 2)
    expect(get(s, 'A').standingOn).toBe('B')
  })
})

describe('頭の上でジャンプ', () => {
  it('頭の上からジャンプすると、地面からより高く跳べる', () => {
    let s = setup({ A: { x: 300, y: PLAYER_SIZE }, B: { x: 300, y: 0 } })
    let maxA = 0
    for (let i = 0; i < 60; i++) {
      s = step(s, press('A', { jump: true }), FIXED_DT)
      maxA = Math.max(maxA, get(s, 'A').y)
    }
    const groundJump = JUMP_SPEED ** 2 / (2 * GRAVITY)
    expect(maxA).toBeGreaterThan(PLAYER_SIZE + groundJump * 0.95)
  })
})

describe('横に並んだとき', () => {
  it('地面の上で歩いてぶつかっても、重ならない', () => {
    const before = setup({ A: { x: 300, y: 0 }, B: { x: 360, y: 0 } })
    const s = run(before, { ...press('A', { right: true }), ...press('B', { left: true }) }, 1)
    expect(Math.abs(get(s, 'A').x - get(s, 'B').x)).toBeGreaterThanOrEqual(PLAYER_SIZE - 0.01)
  })
})
