import { describe, expect, it } from 'vitest'
import { CEILING_Y, FIXED_DT, GRAVITY, JUMP_SPEED, PLAYER_SIZE } from './constants'
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

  it('頭の端に浅くかかっただけなら、立たずに横へ滑り落ちる', () => {
    // A は B の右端に 5px だけかかる位置から落ちてくる
    const s = run(setup({ A: { x: 335, y: 100 }, B: { x: 300, y: 0 } }), {}, 1)
    expect(get(s, 'A').y).toBe(0)
    expect(get(s, 'A').x).toBeGreaterThanOrEqual(get(s, 'B').x + PLAYER_SIZE - 0.01)
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

describe('レビューで見つかった不具合の再発防止', () => {
  it('下の人が右へ動きながらジャンプしても、上の人は乗ったまま運ばれる', () => {
    let s = setup({ A: { x: 300, y: PLAYER_SIZE }, B: { x: 300, y: 0 } })
    for (let i = 0; i < 50; i++) {
      s = step(s, press('B', { right: true, jump: true }), FIXED_DT)
      const a = get(s, 'A')
      const b = get(s, 'B')
      expect(a.standingOn).toBe('B')
      expect(a.y).toBeCloseTo(b.y + PLAYER_SIZE)
      expect(a.x).toBeCloseTo(b.x)
    }
  })

  it('上昇中の人の頭から跳ぶと、押すタイミングによらず地面より高く跳べ、画面の外には出ない（U6・U10）', () => {
    const groundJump = JUMP_SPEED ** 2 / (2 * GRAVITY)
    for (const k of [1, 2, 5, 10, 15]) {
      let s = setup({ A: { x: 300, y: PLAYER_SIZE }, B: { x: 300, y: 0 } })
      s = step(s, press('B', { jump: true }), FIXED_DT) // B がジャンプ
      for (let i = 0; i < k; i++) s = step(s, {}, FIXED_DT)
      let maxA = 0
      for (let i = 0; i < 90; i++) {
        s = step(s, press('A', { jump: true }), FIXED_DT) // k コマ後に A がジャンプ
        maxA = Math.max(maxA, get(s, 'A').y)
      }
      expect(maxA).toBeGreaterThan(PLAYER_SIZE + groundJump * 0.95)
      expect(maxA).toBeLessThanOrEqual(CEILING_Y)
    }
  })

  it('頭からはみ出した部分の下を別の人が通っても、上の人は押されない', () => {
    // A は B の頭に、左へ 18px はみ出して乗っている。C が左から歩いてきて A のはみ出し部分の下に入る
    // 当たり判定の処理順で結果が変わっていたため、C を配列の先頭に置く（ブラウザ確認で見つかった条件）
    let s = setup({ C: { x: 200, y: 0 }, A: { x: 282, y: PLAYER_SIZE }, B: { x: 300, y: 0 } })
    const ax = get(s, 'A').x
    // C が B に触れる手前まで歩かせる（触れると B ごと動くため）
    while (get(s, 'C').x + PLAYER_SIZE < get(s, 'B').x - 5) {
      s = step(s, press('C', { right: true }), FIXED_DT)
    }
    expect(get(s, 'C').x + PLAYER_SIZE).toBeGreaterThan(get(s, 'A').x + 10) // はみ出し部分の下に入っている
    expect(get(s, 'A').x).toBeCloseTo(ax)
  })
})
