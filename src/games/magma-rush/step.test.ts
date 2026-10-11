import { describe, expect, it } from 'vitest'
import { FIXED_DT, FLOOR_Y, PLAYER_SIZE, STAGE_HEIGHT, STAGE_WIDTH, WALL_WIDTH } from './constants'
import { cameraTop, createMagmaState, type MagmaInputs, type MagmaState, magmaTop, step } from './step'

const NONE = { left: false, right: false, jump: false }

function run(state: MagmaState, seconds: number, inputs: (s: MagmaState) => MagmaInputs = () => ({})): MagmaState {
  let s = state
  for (let i = 0; i < Math.round(seconds / FIXED_DT); i++) s = step(s, inputs(s), FIXED_DT)
  return s
}

// 簡単な自動操作：今いる足場より上の、届きそうな一番近い足場へ向かって跳ぶ
function climber(id: string) {
  return (s: MagmaState): MagmaInputs => {
    const r = s.runners.find((x) => x.playerId === id)!
    const feet = r.y + r.height
    const target = s.platforms
      .filter((p) => p.y < feet - 10 && p.y > feet - 110)
      .sort((a, b) => Math.abs(a.x + a.width / 2 - (r.x + 20)) - Math.abs(b.x + b.width / 2 - (r.x + 20)))[0]
    if (!target) return { [id]: { ...NONE, jump: r.standingOn !== null } }
    const cx = target.x + target.width / 2 - r.width / 2
    const dx = cx - r.x
    return { [id]: { left: dx < -8, right: dx > 8, jump: r.standingOn !== null && !r.jumpHeld } }
  }
}

describe('マグマラッシュの1コマ', () => {
  it('全員がスタートの岩場に、壁の内側で重ならずに並ぶ（8人）', () => {
    const s = createMagmaState(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 1)
    const xs = s.runners.map((r) => r.x)
    for (const r of s.runners) {
      expect(r.y + r.height).toBe(FLOOR_Y)
      expect(r.x).toBeGreaterThanOrEqual(WALL_WIDTH)
      expect(r.x + r.width).toBeLessThanOrEqual(STAGE_WIDTH - WALL_WIDTH)
    }
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(PLAYER_SIZE)
  })

  it('始まってすぐ（3秒）は、何もしなくても脱落しない', () => {
    const s = run(createMagmaState(['a', 'b'], 1), 3)
    expect(s.survival.eliminated).toEqual([])
    expect(s.finished).toBe(false)
  })

  it('何もしないと、マグマに飲まれて脱落する。2人同時なら引き分け', () => {
    const s = run(createMagmaState(['a', 'b'], 1), 5)
    expect(s.finished).toBe(true)
    expect(s.survival.eliminated.map((e) => e.cause)).toEqual(['lava', 'lava'])
    expect(s.winners.sort()).toEqual(['a', 'b'])
  })

  it('登り続けた人が、最後の1人として勝つ', () => {
    let s = createMagmaState(['a', 'b'], 3)
    const bot = climber('a')
    while (!s.finished && s.scroll.elapsed < 60) s = step(s, bot(s), FIXED_DT)
    expect(s.finished).toBe(true)
    expect(s.winners).toEqual(['a'])
    expect(s.survival.eliminated[0].playerId).toBe('b')
  })

  it('マグマはだんだん速くなり、やがて誰も登りきれずに勝負がつく（90秒以内）', () => {
    let s = createMagmaState(['a'], 3)
    const bot = climber('a')
    while (!s.finished && s.scroll.elapsed < 120) s = step(s, bot(s), FIXED_DT)
    expect(s.finished).toBe(true)
    expect(s.scroll.elapsed).toBeLessThan(90)
  })

  it('脱落した人は動かず、入力も受け付けない', () => {
    let s = run(createMagmaState(['a', 'b'], 1), 2.5, () => ({ b: { ...NONE, jump: true } }))
    if (s.survival.eliminated.every((e) => e.playerId !== 'a')) s = run(s, 3)
    const a = s.runners.find((r) => r.playerId === 'a')!
    const later = run(s, 1, () => ({ a: { ...NONE, right: true, jump: true } }))
    expect(later.runners.find((r) => r.playerId === 'a')).toEqual(a)
  })

  it('画面の上端より上には行けない', () => {
    let s = createMagmaState(['a', 'b'], 1)
    // a を画面の上端より少し下に置き、真上へ跳ばせる
    s = {
      ...s,
      runners: s.runners.map((r) => (r.playerId === 'a' ? { ...r, y: cameraTop(s) + 5, vy: -750, standingOn: null } : r)),
    }
    s = step(s, {}, FIXED_DT)
    expect(s.runners[0].y).toBeGreaterThanOrEqual(cameraTop(s))
  })

  it('足場は画面の上端より上まで作られていて、マグマは画面の下の方にある', () => {
    const s = run(createMagmaState(['a', 'b'], 1), 1)
    expect(Math.min(...s.platforms.map((p) => p.y))).toBeLessThan(cameraTop(s))
    expect(magmaTop(s)).toBeGreaterThan(cameraTop(s) + STAGE_HEIGHT / 2)
    expect(magmaTop(s)).toBeLessThan(cameraTop(s) + STAGE_HEIGHT)
  })
})
