import { describe, expect, it } from 'vitest'
import { FIXED_DT, FLOOR_Y, PLAYER_SIZE, STAGE_WIDTH } from './constants'
import { cameraTop, type CloudInputs, type CloudState, createCloudState, step } from './step'

function run(state: CloudState, seconds: number, inputs: (s: CloudState) => CloudInputs = () => ({})): CloudState {
  let s = state
  for (let i = 0; i < Math.round(seconds / FIXED_DT); i++) s = step(s, inputs(s), FIXED_DT)
  return s
}

describe('雲のぼりの1コマ', () => {
  it('全員がスタートの雲の島に、重ならずに並ぶ（8人）', () => {
    const s = createCloudState(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 1)
    const xs = s.climbers.map((c) => c.x)
    for (const c of s.climbers) {
      expect(c.y + c.height).toBe(FLOOR_Y)
      expect(c.x).toBeGreaterThanOrEqual(0)
      expect(c.x + c.width).toBeLessThanOrEqual(STAGE_WIDTH)
    }
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(PLAYER_SIZE)
  })

  it('始まってすぐ（3秒）は、何もしなくても脱落しない', () => {
    const s = run(createCloudState(['a', 'b'], 1), 3)
    expect(s.survival.eliminated).toEqual([])
    expect(s.finished).toBe(false)
  })

  it('何もしないと、画面の下に置いていかれて脱落し、勝負がつく（20秒以内）', () => {
    const s = run(createCloudState(['a', 'b'], 1), 20)
    expect(s.finished).toBe(true)
    expect(s.survival.eliminated.some((e) => e.cause === 'fall' || e.cause === 'thunder' || e.cause === 'bird')).toBe(true)
  })

  it('1人で始めたら、脱落するまで終わらない（練習）', () => {
    const s = run(createCloudState(['a'], 1), 1)
    expect(s.finished).toBe(false)
  })

  it('画面の上端より上へは行けない', () => {
    const s = run(createCloudState(['a', 'b'], 1), 2, () => ({ a: { left: false, right: false, jump: true } }))
    for (const c of s.climbers) expect(c.y).toBeGreaterThanOrEqual(cameraTop(s) - 1)
  })

  it('同じ種なら同じ結果', () => {
    const a = run(createCloudState(['a', 'b'], 5), 10)
    const b = run(createCloudState(['a', 'b'], 5), 10)
    expect(a.survival).toEqual(b.survival)
  })

  it('脱落した人は動かない・入力を受け付けない', () => {
    const s0 = run(createCloudState(['a', 'b'], 1), 20)
    const out = s0.survival.eliminated[0].playerId
    const before = s0.climbers.find((c) => c.playerId === out)!
    if (s0.finished) return // 決着後は何も進まない
    const s1 = run(s0, 1, () => ({ [out]: { left: true, right: false, jump: true } }))
    expect(s1.climbers.find((c) => c.playerId === out)!.x).toBe(before.x)
  })

  it('頭の上に乗っている人は、下の人が横に歩くと一緒に運ばれる', () => {
    const s0 = createCloudState(['a', 'b'], 1)
    const [a, b] = s0.climbers
    const stacked = { ...s0, climbers: [a, { ...b, x: a.x, y: a.y - PLAYER_SIZE, standingOn: 'a' }] }
    const s1 = run(stacked, 0.5, () => ({ a: { left: false, right: true, jump: false } }))
    const [na, nb] = s1.climbers
    expect(na.x).toBeGreaterThan(a.x + 30) // 下の人は歩いている
    expect(nb.x).toBeCloseTo(na.x, 0) // 上の人は何も押していないのに、同じだけ動いた
    expect(nb.standingOn).toBe('a') // ずっと頭の上に立っている
  })
})
