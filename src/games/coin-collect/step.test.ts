import { describe, expect, it } from 'vitest'
import { SCROLL } from './constants'
import { POISON_POINTS, COIN_POINTS, FIXED_DT, GROUND_Y, PLAYER_SIZE, RIGHT_LIMIT, STAGE_WIDTH, TIME_LIMIT } from './constants'
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

  it('ずっと右を押しても、画面の右端より右には行けない', () => {
    const s = run(createCoinState(['a'], 1), 6, () => ({ a: { ...NONE, right: true } }))
    expect(s.runners[0].x + PLAYER_SIZE).toBeLessThanOrEqual(s.scroll.offset + RIGHT_LIMIT + 0.01)
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

  it('コインは10点。毒キノコに触れると10点引かれ、0 未満にはならない', () => {
    const s0 = createCoinState(['a'], 1)
    const me = s0.runners[0]
    const at = (id: string, points: number, kind: string) => ({ id, x: me.x + 10, y: me.y + 10, width: 10, height: 10, points, kind })
    const coin = step({ ...s0, coins: [at('c', COIN_POINTS, 'coin')] }, {}, FIXED_DT)
    expect(coin.scores.a).toBe(10)
    const poison = step({ ...coin, coins: [at('p', POISON_POINTS, 'poison')] }, {}, FIXED_DT)
    expect(poison.scores.a).toBe(0)
    expect(poison.pops.some((p) => p.poison)).toBe(true)
    const floor = step({ ...poison, coins: [at('p2', POISON_POINTS, 'poison')] }, {}, FIXED_DT)
    expect(floor.scores.a).toBe(0)
  })

  it('スクロールはずっと同じ速さ（60 px/秒）で、加速しない', () => {
    let s = createCoinState(['a'], 1)
    expect(SCROLL.initialSpeed).toBe(60)
    const speeds = new Set<number>()
    let t = 0
    while (!s.finished) {
      s = step(s, {}, FIXED_DT)
      speeds.add(s.scroll.speed)
      t += FIXED_DT
    }
    expect([...speeds]).toEqual([60])
    expect(s.scroll.offset).toBeCloseTo(60 * t, 3)
  })

  it('まわりの3人が止まっていても、ジャンプで頭に乗って越えれば、右へ進める（横からは弾かれて進めない）', () => {
    for (let seed = 0; seed < 40; seed++) {
      const ids = ['p1', 'p2', 'p3', 'p4']
      const start = createCoinState(ids, seed * 977).runners[0].x
      // 右を押しながら、1秒に1回ジャンプ（着地するたびに押し直す）
      const jumper = (s: CoinState): CoinInputs => ({ p1: { ...NONE, right: true, jump: s.runners[0].standingOn !== null && !s.runners[0].jumpHeld } })
      const s = run(createCoinState(ids, seed * 977), 6, jumper)
      // 壁に押される分（スクロールした距離）より、自分の力で60px以上先へ進んでいる
      expect(s.runners[0].x).toBeGreaterThan(start + s.scroll.offset + 60)
    }
  })

  it('左の壁に押されている人も、右を押せば壁から離れて進める（壁に押されっぱなしにならない）', () => {
    for (const seed of [11, 12345, 999999, 31337]) {
      const ids = ['p1', 'p2']
      // 9秒、何も押さずに壁に押される → 右を押し続ける
      const idle = run(createCoinState(ids, seed), 9)
      expect(Math.min(...idle.runners.map((r) => r.x - idle.scroll.offset))).toBeLessThan(1) // 先頭が壁に張り付いている
      const go = run(idle, 2, () => ({ p1: { ...NONE, right: true }, p2: { ...NONE, right: true } }))
      for (const r of go.runners) expect(r.x - go.scroll.offset).toBeGreaterThan(100)
    }
  })

  it('画面に映っている範囲は、右端まで動ける', () => {
    const s = run(createCoinState(['a'], 1), 8, () => ({ a: { ...NONE, right: true } }))
    expect(s.runners[0].x + PLAYER_SIZE).toBeGreaterThan(s.scroll.offset + STAGE_WIDTH - 5)
  })

  it('頭の上に乗っている人は、下の人が横に歩くと一緒に運ばれる', () => {
    const s0 = createCoinState(['a', 'b'], 1)
    const a = { ...s0.runners.find((r) => r.playerId === 'a')!, x: 300 }
    const b = s0.runners.find((r) => r.playerId === 'b')!
    const stacked = { ...s0, runners: [a, { ...b, x: a.x, y: a.y - PLAYER_SIZE, standingOn: 'a' }] }
    const s1 = run(stacked, 0.5, () => ({ a: { ...NONE, right: true } }))
    const na = s1.runners.find((r) => r.playerId === 'a')!
    const nb = s1.runners.find((r) => r.playerId === 'b')!
    expect(na.x).toBeGreaterThan(a.x + 30) // 下の人は歩いている
    expect(nb.x).toBeCloseTo(na.x, 0) // 上の人は何も押していないのに、同じだけ動いた
    expect(nb.standingOn).toBe('a') // ずっと頭の上に立っている
  })
})
