import { describe, expect, it } from 'vitest'
import { FIXED_DT, FLOOR_Y, PLAYER_SIZE, STAGE_HEIGHT, STAGE_WIDTH, WALL_WIDTH } from './constants'
import { cameraTop, createMagmaState, type MagmaInputs, type MagmaState, magmaTop, magmaWave, step } from './step'

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

  it('何もしないと、マグマに飲まれて脱落する。波の高さの差で、ほぼ同時でも先に飲まれた方が負ける', () => {
    const s = run(createMagmaState(['a', 'b'], 1), 5)
    expect(s.finished).toBe(true)
    expect(s.survival.eliminated.every((e) => e.cause === 'lava')).toBe(true)
    expect(s.winners.length).toBe(2 - s.survival.eliminated.length) // 先に飲まれた方がいれば、残った1人の勝ち。同じコマなら引き分け
  })

  it('マグマの波は-6〜+6pxで、柱（16px幅）の中は同じ高さ。柱が違うと高さが違う時がある', () => {
    let differs = false
    for (let t = 0; t < 5; t += 0.1) {
      for (let x = 0; x < STAGE_WIDTH; x += 8) {
        const w = magmaWave(t, x)
        expect(w).toBeGreaterThanOrEqual(-6)
        expect(w).toBeLessThanOrEqual(6)
        expect(magmaWave(t, Math.floor(x / 16) * 16 + 15)).toBe(magmaWave(t, Math.floor(x / 16) * 16))
        if (w !== magmaWave(t, x + 160)) differs = true
      }
    }
    expect(differs).toBe(true)
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

describe('マグマラッシュのキャラどうしの当たり判定（Jump the highest と同じ）', () => {
  // 2人を同じ高さの岩場に並べる（x だけ指定）
  function twoOnFloor(ax: number, bx: number): MagmaState {
    const s = createMagmaState(['a', 'b'], 1)
    const at = (x: number, r: (typeof s.runners)[number]) => ({ ...r, x })
    return { ...s, runners: [at(ax, s.runners[0]), at(bx, s.runners[1])] }
  }

  it('頭の上に落ちてきた人は、下の人の頭に立つ', () => {
    const s0 = twoOnFloor(300, 300)
    const [a, b] = s0.runners
    const s = step({ ...s0, runners: [a, { ...b, y: a.y - PLAYER_SIZE - 20, standingOn: null }] }, {}, FIXED_DT)
    let t = s
    for (let i = 0; i < 20; i++) t = step(t, {}, FIXED_DT)
    const [ta, tb] = t.runners
    expect(tb.standingOn).toBe('a')
    expect(tb.y).toBeCloseTo(ta.y - PLAYER_SIZE)
  })

  it('横から走ってぶつかると弾かれ、しばらく操作を受け付けない', () => {
    const s0 = twoOnFloor(300, 330) // 10px 重なっている
    const s1 = step(s0, { a: { ...NONE, right: true }, b: { ...NONE, left: true } }, FIXED_DT)
    // 近づこうとして重なる → 弾かれる
    let t = s1
    for (let i = 0; i < 3 && t.runners[0].stunTime === 0; i++) {
      t = step(t, { a: { ...NONE, right: true }, b: { ...NONE, left: true } }, FIXED_DT)
    }
    expect(t.runners[0].stunTime).toBeGreaterThan(0)
    expect(t.runners[1].stunTime).toBeGreaterThan(0)
    expect(t.runners[0].vx).toBeLessThan(0) // a は左へ
    expect(t.runners[1].vx).toBeGreaterThan(0) // b は右へ
  })

  it('脱落した人とは、ぶつからない（すり抜ける）', () => {
    const s0 = twoOnFloor(300, 310)
    const dead = { ...s0, survival: { ...s0.survival, eliminated: [{ playerId: 'b', at: 0, cause: 'lava' }] } }
    const t = step(dead, {}, FIXED_DT)
    expect(t.runners[0].x).toBe(300) // 押されない
    expect(t.runners[0].stunTime).toBe(0)
  })
})
