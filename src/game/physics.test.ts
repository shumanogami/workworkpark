import { describe, expect, it } from 'vitest'
import {
  FIXED_DT,
  GRAVITY,
  JUMP_SPEED,
  MOVE_SPEED,
  PLAYER_SIZE,
  STAGE_WIDTH,
  WALL_WIDTH,
} from './constants'
import { createInitialState } from './state'
import { step } from './step'
import type { GameState, Inputs } from './types'

const ID = 'p0'
const initial = () => createInitialState([{ playerId: ID, color: '#fff' }])
const input = (keys: { left?: boolean; right?: boolean; jump?: boolean }): Inputs => ({
  [ID]: { playerId: ID, left: false, right: false, jump: false, ...keys },
})

// 同じ入力のまま seconds 秒進める
function run(state: GameState, inputs: Inputs, seconds: number): GameState {
  let s = state
  for (let i = 0; i < Math.round(seconds / FIXED_DT); i++) s = step(s, inputs, FIXED_DT)
  return s
}
const me = (s: GameState) => s.players[0]

describe('重力と地面', () => {
  it('空中から落ちて地面で止まる', () => {
    const s = initial()
    s.players[0].y = 200
    s.players[0].grounded = false
    const after = run(s, {}, 2)
    expect(me(after).y).toBe(0)
    expect(me(after).vy).toBe(0)
    expect(me(after).grounded).toBe(true)
  })

  it('何もしなければ地面に立ったまま', () => {
    expect(me(run(initial(), {}, 1)).y).toBe(0)
  })
})

describe('ジャンプ', () => {
  it('ジャンプすると上がり、最高点は理論値（v²/2g）付近になる', () => {
    let s = step(initial(), input({ jump: true }), FIXED_DT)
    let maxY = 0
    for (let i = 0; i < 60; i++) {
      s = step(s, input({ jump: true }), FIXED_DT)
      maxY = Math.max(maxY, me(s).y)
    }
    const theory = JUMP_SPEED ** 2 / (2 * GRAVITY)
    expect(maxY).toBeGreaterThan(theory * 0.95)
    expect(maxY).toBeLessThan(theory * 1.05)
  })

  it('押しっぱなしでは、着地しても2回目のジャンプをしない', () => {
    const after = run(initial(), input({ jump: true }), 2)
    expect(me(after).y).toBe(0)
  })

  it('空中ではジャンプできない（離して押し直しても）', () => {
    let s = run(initial(), input({ jump: true }), 0.1)
    s = step(s, input({}), FIXED_DT)
    const vyBefore = me(s).vy
    s = step(s, input({ jump: true }), FIXED_DT)
    expect(me(s).vy).toBeLessThan(vyBefore) // 重力で減速しているだけ
  })

  it('着地の直前に押したジャンプも、着地した瞬間に受け付ける', () => {
    const s = initial()
    s.players[0].y = 2 // 地面のすぐ上
    s.players[0].grounded = false
    s.players[0].vy = -300
    let after = step(s, input({ jump: true }), FIXED_DT) // 空中で押す
    after = run(after, input({ jump: true }), 0.05) // 押したまま着地
    expect(me(after).y).toBeGreaterThan(0)
  })
})

describe('横移動と壁', () => {
  it('右を押し続けると最高速度で右へ進み、右を向く', () => {
    const after = run(initial(), input({ right: true }), 0.5)
    expect(me(after).vx).toBe(MOVE_SPEED)
    expect(me(after).x).toBeGreaterThan(me(initial()).x)
    expect(me(after).facing).toBe(1)
  })

  it('離すと止まる', () => {
    let s = run(initial(), input({ left: true }), 0.5)
    s = run(s, input({}), 0.5)
    expect(me(s).vx).toBe(0)
    expect(me(s).facing).toBe(-1)
  })

  it('左右の壁より外には出ない', () => {
    const left = run(initial(), input({ left: true }), 5)
    expect(me(left).x).toBe(WALL_WIDTH)
    const right = run(initial(), input({ right: true }), 5)
    expect(me(right).x).toBe(STAGE_WIDTH - WALL_WIDTH - PLAYER_SIZE)
  })
})
