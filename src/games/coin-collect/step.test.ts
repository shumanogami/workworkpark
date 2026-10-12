import { describe, expect, it } from 'vitest'
import { FIXED_DT, GROUND_Y, PLAYER_SIZE, STAGE_WIDTH, TIME_LIMIT } from './constants'
import { createCoinState, type CoinInputs, type CoinState, leaders, step } from './step'

const NONE = { left: false, right: false, jump: false }

function run(state: CoinState, seconds: number, inputs: (s: CoinState) => CoinInputs = () => ({})): CoinState {
  let s = state
  for (let i = 0; i < Math.round(seconds / FIXED_DT); i++) s = step(s, inputs(s), FIXED_DT)
  return s
}

describe('コイン集めの1コマ', () => {
  it('全員がスタート地点の地面に、重ならずに並ぶ（8人）', () => {
    const s = createCoinState(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 1)
    const xs = s.runners.map((r) => r.x).sort((a, b) => a - b)
    for (const r of s.runners) {
      expect(r.y + r.height).toBe(GROUND_Y)
      expect(r.x + r.width).toBeLessThanOrEqual(STAGE_WIDTH)
    }
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(PLAYER_SIZE)
  })

  it('スタートの並び順は種で決まり、種を変えると入れ替わる', () => {
    const order = (seed: number) => createCoinState(['a', 'b', 'c', 'd'], seed).runners.map((r) => r.x)
    expect(order(5)).toEqual(order(5))
    expect(new Set(Array.from({ length: 20 }, (_, i) => order(i).join())).size).toBeGreaterThan(5)
  })

  it('何もしなくても落ちない・脱落しない。点は全員0のまま始まる', () => {
    const s = run(createCoinState(['a', 'b'], 1), 3)
    expect(s.scores).toEqual({ a: 0, b: 0 })
    for (const r of s.runners) expect(r.y + r.height).toBeCloseTo(GROUND_Y, 0)
  })

  it('右へ歩くと、地面のコインを取って点が増える。取ったコインは消える', () => {
    const start = createCoinState(['a'], 1)
    const before = start.coins.length
    const s = run(start, 5, () => ({ a: { ...NONE, right: true } }))
    expect(s.scores.a).toBeGreaterThan(0)
    expect(s.coins.length).toBeLessThan(before + 20)
  })

  it('遅れた人は、左端の壁に押されて運ばれる（画面の外へ出ない）', () => {
    const s = run(createCoinState(['a'], 1), 12)
    const r = s.runners[0]
    const left = s.scroll.offset
    expect(r.x).toBeGreaterThanOrEqual(left - 0.01)
    expect(r.x + r.width).toBeLessThanOrEqual(left + STAGE_WIDTH + 0.01)
  })

  it('制限時間で終わり、一番多い人が勝つ。それまでは終わらない', () => {
    const mid = run(createCoinState(['a', 'b'], 1), TIME_LIMIT - 1, () => ({ a: { ...NONE, right: true } }))
    expect(mid.finished).toBe(false)
    const end = run(mid, 1.1, () => ({ a: { ...NONE, right: true } }))
    expect(end.finished).toBe(true)
    expect(end.winners.length).toBeGreaterThan(0)
    expect(end.winners).toEqual(leaders(end.scores))
  })

  it('終わったあとは状態が変わらない', () => {
    const end = run(createCoinState(['a'], 1), TIME_LIMIT + 0.5)
    expect(step(end, {}, FIXED_DT)).toBe(end)
  })

  it('同数なら全員が勝者（引き分け）', () => {
    expect(leaders({ a: 3, b: 3, c: 1 })).toEqual(['a', 'b'])
    expect(leaders({ a: 0, b: 0 })).toEqual(['a', 'b'])
    expect(leaders({ a: 4, b: 3 })).toEqual(['a'])
  })

  it('同じ種・同じ操作なら同じ結果になる', () => {
    const input = () => ({ a: { ...NONE, right: true, jump: true } })
    const a = run(createCoinState(['a', 'b'], 9), 6, input)
    const b = run(createCoinState(['a', 'b'], 9), 6, input)
    expect(a.scores).toEqual(b.scores)
    expect(a.runners).toEqual(b.runners)
  })
})
