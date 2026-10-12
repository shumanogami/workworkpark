import { describe, expect, it } from 'vitest'
import { createJumper, DEFAULT_JUMPER, jumpHeight, type Jumper, type JumperConfig, moveJumper } from './jumper'
import { type Platform, updateOnPlatforms } from './platforms'

const CONFIG: JumperConfig = { ...DEFAULT_JUMPER, minX: 0, maxX: 960 }
const DT = 1 / 60
const FLOOR: Platform = { id: 'floor', x: 0, y: 500, width: 960, height: 40 }
const NONE = { left: false, right: false, jump: false }

function standing(x = 100): Jumper {
  return { ...createJumper(x, FLOOR.y - 40, 40), standingOn: 'floor' }
}

// 1コマ進める（ゲーム側と同じ順に、動かしてから足場に乗せる）
function tick(j: Jumper, input: typeof NONE, platforms = [FLOOR]): Jumper {
  const moved = moveJumper(j, input, DT, CONFIG)
  return { ...moved, ...updateOnPlatforms(j, moved, platforms, platforms) }
}

describe('moveJumper', () => {
  it('足場の上で何も押さなければ、その場に立ったまま', () => {
    let j = standing()
    for (let i = 0; i < 60; i++) j = tick(j, NONE)
    expect(j.y).toBe(FLOOR.y - 40)
    expect(j.standingOn).toBe('floor')
  })

  it('ジャンプすると jumpHeight の高さまで上がって、元の足場に戻る', () => {
    let j = tick(standing(), { ...NONE, jump: true })
    expect(j.standingOn).toBeNull()
    let top = j.y
    for (let i = 0; i < 120; i++) {
      j = tick(j, { ...NONE, jump: true })
      top = Math.min(top, j.y)
    }
    expect(FLOOR.y - 40 - top).toBeGreaterThan(jumpHeight(CONFIG) - 15)
    expect(FLOOR.y - 40 - top).toBeLessThanOrEqual(jumpHeight(CONFIG))
    expect(j.standingOn).toBe('floor')
  })

  it('ジャンプを押しっぱなしでも、着地した後に跳び続けない', () => {
    let j = standing()
    for (let i = 0; i < 120; i++) j = tick(j, { ...NONE, jump: true })
    expect(j.standingOn).toBe('floor')
    j = tick(j, { ...NONE, jump: true })
    expect(j.standingOn).toBe('floor')
  })

  it('空中ではジャンプできない。ただし着地の直前に押したジャンプは、着地した瞬間に跳ぶ', () => {
    let j = tick(standing(), { ...NONE, jump: true })
    j = tick(j, NONE)
    // 空中で押しても2段ジャンプにならない
    const before = j.vy
    j = tick(j, { ...NONE, jump: true })
    expect(j.vy).toBeGreaterThan(before)
    // 着地の直前（猶予の中）に押し直す
    while (j.y + j.height < FLOOR.y - 10) j = tick(j, NONE)
    j = tick(j, { ...NONE, jump: true })
    for (let i = 0; i < 4 && j.vy > 0; i++) j = tick(j, NONE)
    expect(j.vy).toBeLessThan(0)
  })

  it('左右を押すと最高速度まで速くなり、向きが変わる', () => {
    let j = standing(400)
    for (let i = 0; i < 30; i++) j = tick(j, { ...NONE, right: true })
    expect(j.vx).toBe(CONFIG.moveSpeed)
    expect(j.facing).toBe(1)
    j = tick(j, { ...NONE, left: true })
    expect(j.facing).toBe(-1)
  })

  it('壁の外には出ない', () => {
    let j = standing(10)
    for (let i = 0; i < 60; i++) j = tick(j, { ...NONE, left: true })
    expect(j.x).toBe(CONFIG.minX)
    expect(j.vx).toBe(0)
    j = standing(900)
    for (let i = 0; i < 60; i++) j = tick(j, { ...NONE, right: true })
    expect(j.x + j.width).toBe(CONFIG.maxX)
  })

  it('入力が届いていない人（undefined）は何も押していない扱い', () => {
    let j = standing()
    for (let i = 0; i < 30; i++) j = tick(j, undefined as never)
    expect(j.x).toBe(100)
    expect(j.standingOn).toBe('floor')
  })

  it('落ちる速さは maxFallSpeed を超えない', () => {
    let j = createJumper(100, -5000, 40)
    for (let i = 0; i < 300; i++) j = moveJumper(j, NONE, DT, CONFIG)
    expect(j.vy).toBe(CONFIG.maxFallSpeed)
  })
})
