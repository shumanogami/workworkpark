import { describe, expect, it } from 'vitest'
import { OBJECT_SIZE } from '../../engine/objects'
import {
  COIN_POINTS,
  FIXED_DT,
  GROUND_Y,
  PLAYER_SIZE,
  POISON_POINTS,
  POISON_RATIO,
  ROUND_SECONDS,
  STAGE_WIDTH,
  WALL_WIDTH,
} from './constants'
import { createFallingState, type FallingInputs, type FallingState, fallSpeed, nextRandom, spawnInterval, step } from './step'

function run(state: FallingState, seconds: number, inputs: FallingInputs = {}): FallingState {
  let s = state
  for (let i = 0; i < Math.round(seconds / FIXED_DT); i++) s = step(s, inputs, FIXED_DT)
  return s
}

// 物を1つだけ、指定の人の真上（頭に当たる位置）に置いた状態
function withItemOn(playerId: string, kind: 'coin' | 'poison', ids = ['a', 'b']): FallingState {
  const s = createFallingState(ids, 1)
  const r = s.runners.find((x) => x.playerId === playerId)!
  return { ...s, spawnTimer: 99, items: [{ id: 'i0', kind, x: r.x + 8, y: r.y - 10, vy: 100 }], nextId: 1 }
}

describe('落下物避けの1コマ', () => {
  it('全員が地面に、壁の内側で重ならずに並ぶ（8人）', () => {
    const s = createFallingState(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 1)
    const xs = s.runners.map((r) => r.x)
    for (const r of s.runners) {
      expect(r.y + r.height).toBe(GROUND_Y)
      expect(r.x).toBeGreaterThanOrEqual(WALL_WIDTH)
      expect(r.x + r.width).toBeLessThanOrEqual(STAGE_WIDTH - WALL_WIDTH)
    }
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(PLAYER_SIZE)
  })

  it('コインを取ると加点され、コインは消える', () => {
    const s = run(withItemOn('a', 'coin'), 0.2)
    expect(s.scores.a).toBe(COIN_POINTS)
    expect(s.scores.b).toBe(0)
    expect(s.items.find((i) => i.id === 'i0')).toBeUndefined()
  })

  it('毒キノコは減点（-30）。0 未満にはならない', () => {
    const first = run(withItemOn('a', 'poison'), 0.2)
    expect(first.scores.a).toBe(0) // 0 点のときに当たっても 0 のまま
    const rich = withItemOn('a', 'poison')
    const hit = run({ ...rich, scores: { a: 50, b: 0 } }, 0.2)
    expect(hit.scores.a).toBe(50 + POISON_POINTS)
  })

  it('取られたコマだけ pickups に入る（効果音用）', () => {
    let s = withItemOn('a', 'coin')
    let seen = 0
    for (let i = 0; i < 20; i++) {
      s = step(s, {}, FIXED_DT)
      seen += s.pickups.length
    }
    expect(seen).toBe(1)
  })

  it('地面に着いた物は消える', () => {
    const s = createFallingState(['a'], 1)
    // 誰もいない端に置く
    const lone: FallingState = { ...s, spawnTimer: 99, items: [{ id: 'i0', kind: 'coin', x: STAGE_WIDTH - 100, y: GROUND_Y - 40, vy: 300 }], nextId: 1 }
    const after = run(lone, 0.5)
    expect(after.items).toHaveLength(0)
    expect(after.scores.a).toBe(0)
  })

  it('同じ物に2人が触れたら、中心に近い人が取る', () => {
    const s = createFallingState(['a', 'b'], 1)
    const a = s.runners[0]
    // a の真上のコインに、b も少し触れる位置にする
    const near: FallingState = {
      ...s,
      spawnTimer: 99,
      runners: [a, { ...s.runners[1], x: a.x + 30 }],
      items: [{ id: 'i0', kind: 'coin', x: a.x + 8, y: a.y - 10, vy: 0 }],
      nextId: 1,
    }
    const after = step(near, {}, FIXED_DT)
    expect(after.scores.a + after.scores.b).toBe(COIN_POINTS)
  })

  it('頭の上に乗った人は、下の人が横に動いた分だけ一緒に運ばれる（3段でも）', () => {
    const s = createFallingState(['a', 'b', 'c'], 1)
    const [a, b, c] = s.runners
    // a の頭に b、b の頭に c が乗っている（少しずらして）
    const stacked: FallingState = {
      ...s,
      spawnTimer: 99,
      runners: [
        { ...a, x: 300 },
        { ...b, x: 304, y: a.y - 40, standingOn: 'a' },
        { ...c, x: 308, y: a.y - 80, standingOn: 'b' },
      ],
    }
    const after = run(stacked, 0.5, { a: { left: false, right: true, jump: false } })
    const [na, nb, nc] = after.runners
    expect(na.x).toBeGreaterThan(350) // a は右へ歩いた
    expect(nb.x - na.x).toBeCloseTo(4, 0) // 乗っている人は置いていかれない
    expect(nc.x - na.x).toBeCloseTo(8, 0)
    expect(nb.standingOn).toBe('a')
    expect(nc.standingOn).toBe('b')
  })

  it('だんだん数が増え、速くなる', () => {
    expect(spawnInterval(ROUND_SECONDS, 4)).toBeLessThan(spawnInterval(0, 4))
    expect(fallSpeed(ROUND_SECONDS)).toBeGreaterThan(fallSpeed(0))
    // 人数が多いほど密に降る
    expect(spawnInterval(0, 8)).toBeLessThan(spawnInterval(0, 4))
  })

  it('時間になると終わり、一番点が高い人が勝つ', () => {
    const s = createFallingState(['a', 'b'], 1)
    const near = run({ ...s, scores: { a: 40, b: 10 } }, ROUND_SECONDS + 0.1)
    expect(near.finished).toBe(true)
    expect(near.items).toHaveLength(0)
    // 終わるまでに点が動くので、最高点の人が勝者に入っていることを確かめる
    const best = Math.max(near.scores.a, near.scores.b)
    expect(near.winners.every((id) => near.scores[id] === best)).toBe(true)
    expect(near.winners.length).toBeGreaterThan(0)
  })

  it('同点なら全員が勝者（引き分け）', () => {
    const s = createFallingState(['a', 'b'], 1)
    // 何も降らないまま時間切れ
    const done = run({ ...s, spawnTimer: 999 }, ROUND_SECONDS + 0.1)
    expect(done.winners.sort()).toEqual(['a', 'b'])
  })

  it('終わった後は動かない', () => {
    const done = run(createFallingState(['a'], 1), ROUND_SECONDS + 0.1)
    expect(step(done, {}, FIXED_DT)).toBe(done)
  })

  it('同じ種なら同じ降り方になる', () => {
    const a = run(createFallingState(['a', 'b'], 7), 3)
    const b = run(createFallingState(['a', 'b'], 7), 3)
    expect(a.items).toEqual(b.items)
  })

  it('毒キノコの割合は約2割、物は壁の内側に降る', () => {
    let s = createFallingState(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 3)
    let poison = 0
    let total = 0
    const seen = new Set<string>()
    for (let i = 0; i < 40 * 60; i++) {
      s = { ...step(s, {}, FIXED_DT), finished: false, elapsed: 0 } // 時間を止めて長く降らせる
      for (const it of s.items) {
        if (seen.has(it.id)) continue
        seen.add(it.id)
        total++
        if (it.kind === 'poison') poison++
        expect(it.x).toBeGreaterThanOrEqual(WALL_WIDTH)
        expect(it.x + OBJECT_SIZE[it.kind].width).toBeLessThanOrEqual(STAGE_WIDTH - WALL_WIDTH)
      }
    }
    expect(total).toBeGreaterThan(100)
    expect(poison / total).toBeGreaterThan(POISON_RATIO - 0.08)
    expect(poison / total).toBeLessThan(POISON_RATIO + 0.08)
  })

  it('乱数は 0 以上 1 未満', () => {
    let seed = 5
    for (let i = 0; i < 1000; i++) {
      const [v, next] = nextRandom(seed)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
      seed = next
    }
  })
})
